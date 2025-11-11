const User = require("../models/User");
const Ride = require("../models/Ride");

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Map ride type to compatible vehicle types
 * @param {string} rideType - Type of ride requested (bike, auto, car, premium)
 * @returns {Array} Array of compatible vehicle type codes
 */
function getCompatibleVehicleTypes(rideType) {
  const mapping = {
    'bike': ['bike'],
    'auto': ['auto', 'auto_3'],
    'car': ['car', 'car_4'],
    'premium': ['premium', 'premium_ac'],
    'parcel': ['bike', 'auto', 'car'] // Parcels use permitted vehicles
  };
  
  return mapping[rideType] || ['car']; // Default to car
}

/**
 * Filter riders by vehicle type compatibility
 * @param {Array} riders - Array of rider objects
 * @param {string} requestedVehicleType - Vehicle type from ride request
 * @returns {Array} Filtered riders
 */
function filterByVehicleType(riders, requestedVehicleType) {
  const compatibleTypes = getCompatibleVehicleTypes(requestedVehicleType);
  
  return riders.filter(rider => {
    const riderVehicleType = rider.vehicleType || rider.vehicle?.type || '';
    return compatibleTypes.some(type => 
      riderVehicleType.toLowerCase().includes(type.toLowerCase())
    );
  });
}

/**
 * Filter riders within a certain distance radius
 * @param {Array} riders - Array of rider objects
 * @param {Object} pickupCoords - Pickup coordinates {lat, lng}
 * @param {number} maxDistance - Maximum distance in km (default: 15)
 * @returns {Array} Filtered riders with distance added
 */
function filterByDistance(riders, pickupCoords, maxDistance = 15) {
  if (!pickupCoords || !pickupCoords.lat || !pickupCoords.lng) {
    console.warn("⚠️ No pickup coordinates provided");
    return [];
  }

  return riders
    .map(rider => {
      // Get rider location from currentLocation or vehicle location
      const riderLoc = rider.currentLocation || rider.location || 
                      rider.vehicle?.currentLocation || null;
      
      if (!riderLoc || !riderLoc.lat || !riderLoc.lng) {
        return { ...rider, distance: Infinity }; // No location = exclude
      }

      const distance = calculateDistance(
        pickupCoords.lat,
        pickupCoords.lng,
        riderLoc.lat,
        riderLoc.lng
      );

      return { ...rider, distance };
    })
    .filter(rider => rider.distance <= maxDistance && rider.distance !== Infinity);
}

/**
 * Calculate ETA based on distance (rough estimate)
 * @param {number} distance - Distance in km
 * @returns {number} Estimated time in minutes
 */
function calculateETA(distance) {
  // Rough estimate: 3 minutes per km (avg speed ~20 km/h in city)
  return Math.ceil(distance * 3);
}

/**
 * Score a rider based on multiple factors
 * @param {Object} rider - Rider object
 * @param {Object} pickupCoords - Pickup coordinates
 * @param {Object} rideDetails - Ride details
 * @returns {number} Match score (0-100)
 */
function scoreRider(rider, pickupCoords, rideDetails) {
  let score = 0;
  
  // 1. Proximity (40% weight) - closer is better
  const maxDistanceScore = 40;
  if (rider.distance <= 2) score += maxDistanceScore; // Very close
  else if (rider.distance <= 5) score += maxDistanceScore * 0.8; // Close
  else if (rider.distance <= 10) score += maxDistanceScore * 0.6; // Medium
  else if (rider.distance <= 15) score += maxDistanceScore * 0.4; // Far but acceptable
  else score += maxDistanceScore * 0.2; // Very far
  
  // 2. Rating (30% weight) - higher is better
  const maxRatingScore = 30;
  const riderRating = rider.rating || 0;
  score += (riderRating / 5) * maxRatingScore;
  
  // 3. Availability (20% weight) - available is better
  const maxAvailabilityScore = 20;
  if (rider.isAvailable && rider.isOnline) {
    score += maxAvailabilityScore;
  } else if (rider.isOnline) {
    score += maxAvailabilityScore * 0.5; // Online but not available
  }
  
  // 4. Total rides completed (10% weight) - experience matters
  const maxExperienceScore = 10;
  const totalRides = rider.totalRides || 0;
  if (totalRides > 100) score += maxExperienceScore;
  else if (totalRides > 50) score += maxExperienceScore * 0.8;
  else if (totalRides > 20) score += maxExperienceScore * 0.6;
  else if (totalRides > 5) score += maxExperienceScore * 0.4;
  
  // 5. Vehicle type match bonus (5% bonus)
  const compatibleTypes = getCompatibleVehicleTypes(rideDetails.rideType || 'car');
  const riderVehicleType = (rider.vehicleType || rider.vehicle?.type || '').toLowerCase();
  if (compatibleTypes.some(type => riderVehicleType.includes(type))) {
    score += 5;
  }
  
  return Math.min(100, score); // Cap at 100
}

/**
 * Find best matching riders for a ride request
 * @param {Object} rideRequest - Ride request object with pickupCoords, rideType, etc.
 * @param {Object} options - Options {maxResults, maxDistance}
 * @returns {Array} Array of best matching riders with scores
 */
async function findBestRiders(rideRequest, options = {}) {
  const {
    maxResults = 10,
    maxDistance = 15,
    expandOnNoMatch = true
  } = options;

  try {
    const pickupCoords = rideRequest.pickupCoords || rideRequest.pickup;
    const rideType = rideRequest.rideType || 'car';
    
    console.log(`🔍 Finding riders for ${rideType} ride at:`, pickupCoords);
    
    // 1. Get all online riders
    // Try to get from User collection first
    let allOnlineRiders = await User.find({
      role: 'rider',
      isOnline: true
    }).lean();

    console.log(`👥 Found ${allOnlineRiders.length} online riders in User collection`);
    
    if (allOnlineRiders.length === 0) {
      console.log("⚠️ No online riders in User collection, trying Rider collection...");
      
      // Try fallback to Rider collection
      try {
        const Rider = require("../models/Rider");
        allOnlineRiders = await Rider.find({
          isOnline: true,
          status: 'approved'
        }).lean();
        
        console.log(`👥 Found ${allOnlineRiders.length} riders in Rider collection`);
        
        if (allOnlineRiders.length === 0) {
          console.log("⚠️ No riders available in any collection");
          return [];
        }
      } catch (err) {
        console.log("⚠️ Error querying Rider collection:", err.message);
        return [];
      }
    }

    // 2. Filter by vehicle type
    const compatibleRiders = filterByVehicleType(allOnlineRiders, rideType);
    
    if (compatibleRiders.length === 0) {
      console.log(`⚠️ No riders with compatible vehicle type (${rideType})`);
      
      if (expandOnNoMatch) {
        console.log("🔄 Expanding search to all vehicle types as fallback");
        // Fallback: use all online riders
        return allOnlineRiders.map(rider => ({
          ...(rider.toObject ? rider.toObject() : rider),
          distance: 0,
          eta: 5,
          score: 50,
          matchReason: 'fallback'
        })).slice(0, maxResults);
      }
      
      return [];
    }

    console.log(`🚗 ${compatibleRiders.length} riders with compatible vehicles`);

    // 3. Filter by distance
    const nearbyRiders = filterByDistance(compatibleRiders, pickupCoords, maxDistance);
    
    if (nearbyRiders.length === 0) {
      console.log(`⚠️ No riders within ${maxDistance}km`);
      
      if (expandOnNoMatch) {
        console.log("🔄 Expanding search radius to 30km");
        const expanded = filterByDistance(compatibleRiders, pickupCoords, 30);
        return expanded;
      }
      
      return [];
    }

    console.log(`📍 ${nearbyRiders.length} riders within ${maxDistance}km`);

    // 4. Score and sort riders
    const scoredRiders = nearbyRiders
      .map(rider => ({
        ...rider,
        eta: calculateETA(rider.distance),
        score: scoreRider(rider, pickupCoords, rideRequest),
      }))
      .sort((a, b) => b.score - a.score); // Sort by score descending

    // 5. Return top matches
    const topMatches = scoredRiders.slice(0, maxResults);
    
    console.log(`✅ Returning top ${topMatches.length} matches`);
    topMatches.forEach((match, index) => {
      console.log(`   ${index + 1}. ${match.fullName} - Distance: ${match.distance.toFixed(2)}km, Score: ${match.score.toFixed(2)}, ETA: ${match.eta}min`);
    });
    
    return topMatches;

  } catch (error) {
    console.error("❌ Error in findBestRiders:", error);
    return [];
  }
}

/**
 * Get nearby riders with enhanced details for a ride
 * @param {Object} rideRequest - Ride request object
 * @param {Object} options - Matching options
 * @returns {Array} Enhanced rider details
 */
async function getNearbyRidersWithDetails(rideRequest, options = {}) {
  const bestRiders = await findBestRiders(rideRequest, options);
  
  return bestRiders.map(rider => ({
    _id: rider._id,
    fullName: rider.fullName,
    mobile: rider.mobile,
    rating: rider.rating || 0,
    totalRides: rider.totalRides || 0,
    isAvailable: rider.isAvailable,
    vehicleType: rider.vehicleType,
    vehicle: rider.vehicle,
    currentLocation: rider.currentLocation,
    distance: rider.distance,
    eta: rider.eta,
    score: rider.score,
    profilePicture: rider.profilePicture
  }));
}

module.exports = {
  calculateDistance,
  getCompatibleVehicleTypes,
  filterByVehicleType,
  filterByDistance,
  calculateETA,
  scoreRider,
  findBestRiders,
  getNearbyRidersWithDetails
};

