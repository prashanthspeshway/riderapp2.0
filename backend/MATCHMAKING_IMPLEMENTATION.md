# 🚖 Matchmaking Algorithm Implementation

## Overview
This document describes the Uber-like matchmaking algorithm implemented for the Rider App, which intelligently matches ride requests with the best available drivers/riders.

## 📋 What Was Implemented

### 1. Matchmaking Service (`backend/src/services/matchmaking.service.js`)
**Created a comprehensive matchmaking service with:**

#### Core Functions:
- **`calculateDistance(lat1, lng1, lat2, lng2)`**: Haversine formula to calculate distance between two points in km
- **`getCompatibleVehicleTypes(rideType)`**: Maps ride requests to compatible vehicle types
  - Bike → bike, scooty
  - Auto → auto, auto_3
  - Car → car, car_4, car_6, car_ac
  - Premium → premium, premium_ac
  - Parcel → all vehicle types
- **`filterByVehicleType(riders, requestedVehicleType)`**: Filters riders by compatible vehicles
- **`filterByDistance(riders, pickupCoords, maxDistance)`**: Filters riders within specified radius (default 15km)
- **`calculateETA(distance)`**: Rough ETA estimation (3 min per km)
- **`scoreRider(rider, pickupCoords, rideDetails)`**: Scores riders based on:
  - Proximity (40% weight)
  - Rating (30% weight)
  - Availability (20% weight)
  - Experience/Total rides (10% weight)
  - Vehicle match bonus (5% bonus)

#### Main Function:
- **`findBestRiders(rideRequest, options)`**: 
  - Finds online riders
  - Filters by vehicle type compatibility
  - Filters by distance (within 15km radius, expandable to 30km)
  - Scores and ranks riders
  - Returns top 10 matches
  - Includes fallback logic if no matches found

### 2. Updated Rides Controller (`backend/src/controllers/rides.controller.js`)
**Modified ride request creation to use smart matchmaking:**

- **Before**: Broadcast to ALL online riders
- **After**: 
  - Find best matching riders using `findBestRiders()`
  - Only notify top 10 riders (by score)
  - Include match details (distance, ETA, score) in notification
  - Fallback to broadcast all if matchmaking fails
  - Comprehensive logging for debugging

### 3. Rider Location Tracking
**Added real-time location tracking capabilities:**

#### Updated Models:
- **Rider Model** (`backend/src/models/Rider.js`): Added `currentLocation` field
- **User Model** (`backend/src/models/User.js`): Already had `currentLocation` field

#### New Functions:
- **`updateRiderLocation`** in `rider.controller.js`: 
  - Updates location for both Rider and User collections
  - Stores lat, lng, address, and timestamp
  - Real-time tracking support

#### New Route:
- **PUT `/api/rider/location`**: Update rider's GPS location
  - Requires authentication
  - Body: `{ lat, lng, address? }`
  - Response: `{ success, message, location }`

## 🎯 How It Works

### When a User Requests a Ride:

1. **Request Created**:
   - User selects vehicle type (bike, auto, car, premium)
   - Pickup and drop coordinates captured

2. **Smart Matching**:
   ```
   findBestRiders({
     pickupCoords: { lat, lng },
     rideType: "car",
     ...
   })
   ```

3. **Filtering Process**:
   - ✅ Get all online & approved riders
   - ✅ Filter by compatible vehicle types
   - ✅ Filter by distance (within 15km initially)
   - ✅ Score each rider
   - ✅ Sort by score (highest first)

4. **Notification**:
   - Top 10 riders receive ride request
   - Include match score & distance in notification
   - First responder gets the ride

5. **Fallback**:
   - If no matches in 15km → expand to 30km
   - If still no matches → broadcast to all online riders

### Scoring Example:
```
Rider A: 2km away, 4.8 rating, available → Score: 85
Rider B: 5km away, 4.5 rating, available → Score: 72  
Rider C: 10km away, 5.0 rating, busy → Score: 62
→ Rider A gets notified first
```

## 📊 Vehicle Type Compatibility

| Ride Request | Compatible Vehicles |
|-------------|---------------------|
| Bike | bike, scooty |
| Auto | auto, auto_3 |
| Car | car, car_4, car_6, car_ac |
| Premium | premium, premium_ac |
| Parcel | ALL vehicles |

## 🔧 Configuration Options

### In `findBestRiders()`:
```javascript
{
  maxResults: 10,        // Top N riders to notify
  maxDistance: 15,       // Initial search radius (km)
  expandOnNoMatch: true // Expand radius if no matches
}
```

### Scoring Weights:
- Proximity: 40%
- Rating: 30%
- Availability: 20%
- Experience: 10%
- Vehicle Match: 5% (bonus)

## 🚀 Usage Examples

### Update Rider Location:
```javascript
// Rider Dashboard should send periodic location updates
PUT /api/rider/location
{
  "lat": 17.385044,
  "lng": 78.486671,
  "address": "Hitech City, Hyderabad"
}
```

### Request a Ride (already working):
```javascript
// User creates ride
POST /api/rides/create
{
  "pickup": "Hitech City",
  "drop": "Airport",
  "pickupCoords": { "lat": 17.385, "lng": 78.486 },
  "dropCoords": { "lat": 17.240, "lng": 78.429 },
  "rideType": "car"
}

// Smart matchmaking automatically finds best riders
// Top 10 riders get notified
```

## 🎉 Benefits

1. **Faster Matching**: Nearby riders get priority
2. **Better Ride Quality**: Higher rated riders prioritized
3. **Efficient**: Only top 10 riders notified (not hundreds)
4. **Smart Routing**: Vehicles matched correctly
5. **Scalable**: Can handle many concurrent requests
6. **Fallback Safe**: Always tries to find a match

## 📝 Testing

To test the matchmaking:

1. **Create test riders** with different vehicle types
2. **Set their locations** using `/api/rider/location`
3. **Go online** (`isOnline: true, isAvailable: true`)
4. **Create ride request** as a user
5. **Check logs** to see which riders were matched
6. **Verify** only nearby riders got notified

## 🔮 Future Enhancements

1. **Real-time location updates** in rider dashboard
2. **Traffic-aware ETA** calculation
3. **Surge pricing** integration
4. **Historical demand** prediction
5. **Machine learning** for better matching
6. **Multi-stop ride** support
7. **Rider capacity** matching (4 seats, 6 seats)

## ⚠️ Important Notes

- **Location Updates**: Riders must send location updates for matchmaking to work
- **Fallback**: If matchmaking fails, falls back to broadcast all (backward compatible)
- **Distance**: Uses Haversine formula (accurate for short distances)
- **Performance**: Efficiently filters and scores riders

## 📚 Files Modified

1. ✅ `backend/src/services/matchmaking.service.js` - NEW
2. ✅ `backend/src/controllers/rides.controller.js` - UPDATED
3. ✅ `backend/src/controllers/rider.controller.js` - UPDATED
4. ✅ `backend/src/models/Rider.js` - UPDATED
5. ✅ `backend/src/routes/rider.routes.js` - UPDATED

---

**Status**: ✅ **Implemented and Ready for Testing**

