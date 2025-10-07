// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

// Calculate fare based on ride type, distance, and time
const calculateFare = (rideType, distance, duration, surgeMultiplier = 1.0) => {
  const baseFares = {
    bike: 20,
    auto: 30,
    car: 40,
    premium: 60
  };

  const perKmRates = {
    bike: 8,
    auto: 12,
    car: 15,
    premium: 25
  };

  const perMinuteRates = {
    bike: 1,
    auto: 1.5,
    car: 2,
    premium: 3
  };

  const baseFare = baseFares[rideType] || baseFares.car;
  const perKmRate = perKmRates[rideType] || perKmRates.car;
  const perMinuteRate = perMinuteRates[rideType] || perMinuteRates.car;

  const distanceFare = distance * perKmRate;
  const timeFare = duration * perMinuteRate;
  const totalFare = (baseFare + distanceFare + timeFare) * surgeMultiplier;

  return {
    baseFare,
    distanceFare,
    timeFare,
    totalFare: Math.round(totalFare),
    surgeMultiplier
  };
};

// Calculate ETA based on distance and traffic conditions
const calculateETA = (distance, trafficMultiplier = 1.0) => {
  const baseSpeed = 30; // km/h average speed
  const adjustedSpeed = baseSpeed / trafficMultiplier;
  return Math.round((distance / adjustedSpeed) * 60); // ETA in minutes
};

// Generate ride ID with prefix
const generateRideId = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `RIDE${timestamp}${random}`;
};

// Validate ride coordinates
const validateCoordinates = (coords) => {
  if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
    return false;
  }
  
  // Check if coordinates are within reasonable bounds (India)
  const { lat, lng } = coords;
  return lat >= 6.0 && lat <= 37.0 && lng >= 68.0 && lng <= 97.0;
};

// Calculate surge pricing based on demand
const calculateSurgeMultiplier = (area, timeOfDay, demandLevel) => {
  let multiplier = 1.0;
  
  // Peak hours (7-9 AM, 6-8 PM)
  const hour = new Date().getHours();
  const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 18 && hour <= 20);
  
  if (isPeakHour) multiplier += 0.2;
  if (demandLevel > 0.8) multiplier += 0.3;
  if (demandLevel > 0.9) multiplier += 0.2;
  
  return Math.min(multiplier, 3.0); // Cap at 3x
};

module.exports = {
  calculateDistance,
  calculateFare,
  calculateETA,
  generateRideId,
  validateCoordinates,
  calculateSurgeMultiplier
};




