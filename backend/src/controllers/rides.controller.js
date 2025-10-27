const Ride = require("../models/Ride");
const User = require("../models/User");
const Payment = require("../models/Payment");
const Notification = require("../models/Notification");
const { calculateFare, calculateDistance, validateCoordinates, calculateETA, calculateSurgeMultiplier } = require("../utils/rideUtils");
const { findBestRiders, getNearbyRidersWithDetails } = require("../services/matchmaking.service");

// Generate OTP for ride verification
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 🚖 Create Ride
exports.createRide = async (req, res) => {
  try {
    const { 
      pickup, 
      drop, 
      pickupCoords, 
      dropCoords, 
      rideType = "car",
      specialInstructions = "",
      isScheduled = false,
      scheduledAt = null
    } = req.body;

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Validate coordinates
    if (!validateCoordinates(pickupCoords) || !validateCoordinates(dropCoords)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid coordinates provided" 
      });
    }

    // Calculate distance and duration
    const distance = calculateDistance(
      pickupCoords.lat, 
      pickupCoords.lng, 
      dropCoords.lat, 
      dropCoords.lng
    );

    const duration = Math.round(distance * 2); // Rough estimate: 2 minutes per km
    const etaMinutes = calculateETA(distance);

    // Calculate fare
    const fareDetails = calculateFare(rideType, distance, duration);
    const surgeMultiplier = calculateSurgeMultiplier("default", new Date().getHours(), 0.5);

    const ride = new Ride({
      riderId: req.user._id,
      pickup,
      drop,
      pickupCoords,
      dropCoords,
      rideType,
      specialInstructions,
      isScheduled,
      scheduledAt: isScheduled ? new Date(scheduledAt) : null,
      distance,
      duration,
      etaMinutes,
      ...fareDetails,
      surgeMultiplier,
      totalFare: Math.round(fareDetails.totalFare * surgeMultiplier),
      status: "pending",
    });

    await ride.save();

    // Update rider's location
    await User.findByIdAndUpdate(req.user._id, {
      currentLocation: {
        lat: pickupCoords.lat,
        lng: pickupCoords.lng,
        address: pickup,
        lastUpdated: new Date()
      }
    });

    // Create notification for rider
    await Notification.create({
      userId: req.user._id,
      type: "ride_requested",
      title: "Ride Requested",
      message: `Your ${rideType} ride from ${pickup} to ${drop} has been requested. Looking for drivers...`,
      rideId: ride._id,
      priority: "high"
    });

    // 🔥 Smart matchmaking: find best riders for this ride
    const io = req.app.get("io");
    
    console.log(`🔍 Starting smart matchmaking for ride type: ${rideType}`);
    console.log(`📍 Pickup: ${pickup} (${pickupCoords.lat}, ${pickupCoords.lng})`);
    console.log(`📍 Drop: ${drop} (${dropCoords.lat}, ${dropCoords.lng})`);
    
    try {
      // Find best matching riders using our matchmaking algorithm
      const bestRiders = await findBestRiders({
        pickupCoords: pickupCoords,
        dropCoords: dropCoords,
        rideType: rideType,
        distance: distance,
        rideId: ride._id
      }, {
        maxResults: 10, // Notify top 10 riders
        maxDistance: 15, // 15km radius
        expandOnNoMatch: true // Expand search if no matches
      });
      
      console.log(`✅ Found ${bestRiders.length} matching riders`);
      
      if (bestRiders.length === 0) {
        console.warn("⚠️ No matching riders found, no notifications sent");
      } else {
        // Notify only the best matching riders
        bestRiders.forEach((matchedRider, index) => {
          const riderId = matchedRider._id.toString();
          const riderMobile = matchedRider.mobile || '';
          console.log(`📱 Notifying rider ${index + 1}/${bestRiders.length}`);
          console.log(`   ID: ${riderId}`);
          console.log(`   Name: ${matchedRider.fullName || matchedRider.firstName || matchedRider.mobile || 'Unknown'}`);
          console.log(`   Mobile: ${riderMobile}`);
          console.log(`   Distance: ${matchedRider.distance?.toFixed(2) || 'N/A'}km, Score: ${matchedRider.score?.toFixed(2) || 'N/A'}`);
          
          const rideData = {
            ...ride.toObject(),
            rider: {
              _id: req.user._id,
              fullName: req.user.fullName,
              mobile: req.user.mobile,
              rating: req.user.rating
            },
            matchDetails: {
              distance: matchedRider.distance,
              eta: matchedRider.eta,
              score: matchedRider.score
            }
          };
          
          // 🔧 FIX: Emit to MULTIPLE room IDs to handle ID mismatches
          const roomIds = [
            riderId,              // User collection ID
            riderMobile,          // Mobile number as room ID
            `rider_${riderId}`,   // With prefix
            `user_${riderId}`     // Alternative prefix
          ];
          
          console.log(`   📤 Emitting to rooms:`, roomIds);
          roomIds.forEach(roomId => {
            io.to(roomId).emit("rideRequest", rideData);
          });
          
          console.log(`   ✅ Emitted to ${roomIds.length} room IDs`);
        });
        
        console.log(`✅ Successfully notified ${bestRiders.length} riders about the new ride request`);
      }
      
    } catch (matchmakingError) {
      console.error("❌ Matchmaking error:", matchmakingError);
      
      // Fallback: notify all online riders if matchmaking fails
      console.log("🔄 Falling back to broadcasting to all online riders");
      
      // Try User collection first
      let onlineRiders = await User.find({ 
        role: "rider", 
        isOnline: true
      });
      
      console.log(`🚗 Found ${onlineRiders.length} riders in User collection`);
      console.log(`🚗 Riders:`, onlineRiders.map(r => ({
        id: r._id.toString(),
        name: r.fullName,
        mobile: r.mobile,
        vehicle: r.vehicleType,
        online: r.isOnline,
        location: r.currentLocation ? `${r.currentLocation.lat}, ${r.currentLocation.lng}` : 'NO LOCATION'
      })));
      
      // If no riders in User collection, try Rider collection
      if (onlineRiders.length === 0) {
        try {
          const Rider = require("../models/Rider");
          onlineRiders = await Rider.find({
            isOnline: true
          });
          console.log(`🚗 Found ${onlineRiders.length} riders in Rider collection`);
        } catch (err) {
          console.error("❌ Error fetching from Rider collection:", err);
        }
      }
      
      console.log(`🚗 Notifying ${onlineRiders.length} online riders as fallback`);
      
      if (onlineRiders.length > 0) {
        onlineRiders.forEach((rider, index) => {
          const riderId = rider._id.toString();
          const riderName = rider.fullName || (rider.firstName && rider.lastName ? `${rider.firstName} ${rider.lastName}` : rider.firstName || rider.mobile || 'Unknown');
          
          console.log(`📱 [${index + 1}/${onlineRiders.length}] Notifying rider:`);
          console.log(`   - ID: ${riderId}`);
          console.log(`   - Name: ${riderName}`);
          console.log(`   - Mobile: ${rider.mobile || 'N/A'}`);
          
          // Emit to socket room
          const rideData = {
            _id: ride._id,
            pickup: ride.pickup,
            drop: ride.drop,
            pickupCoords: ride.pickupCoords,
            dropCoords: ride.dropCoords,
            rideType: ride.rideType,
            totalFare: ride.totalFare,
            distance: ride.distance,
            duration: ride.duration,
            status: ride.status,
            rider: {
              _id: req.user._id,
              fullName: req.user.fullName,
              mobile: req.user.mobile,
              rating: req.user.rating || 4.6
            },
            createdAt: ride.createdAt
          };
          
          console.log(`   📤 Emitting rideRequest to room: ${riderId}`);
          io.to(riderId).emit("rideRequest", rideData);
          console.log(`   ✅ Emitted successfully`);
        });
      } else {
        console.warn("⚠️ No online riders found in any collection to notify");
        console.warn("⚠️ This means no riders will receive the ride request");
      }
    }

    res.json({ 
      success: true, 
      ride,
      message: "Ride request created successfully. Looking for drivers..."
    });
  } catch (err) {
    console.error("❌ Error creating ride:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to create ride",
      message: err.message 
    });
  }
};

// 🚖 Accept Ride
exports.acceptRide = async (req, res) => {
  try {
    const rideId = req.params.id;

    if (req.user.role !== "rider") {
      return res.status(403).json({ success: false, message: "Only riders can accept rides" });
    }

    // Check if rider is online
    if (!req.user.isOnline) {
      return res.status(400).json({ 
        success: false, 
        message: "You must be online to accept rides" 
      });
    }

    // Generate OTP for ride verification
    const otp = generateOTP();
    console.log("🔐 Generated OTP for ride", rideId, ":", otp);

    const ride = await Ride.findOneAndUpdate(
      { _id: rideId, status: "pending" },
      { 
        captainId: req.user._id,  // Assign the driver who accepted
        status: "accepted",       // Update status to accepted
        acceptedAt: new Date(),   // Timestamp when accepted
        otp: otp,
        otpGeneratedAt: new Date(),
        otpVerified: false
      },
      { new: true }
    ).populate("riderId", "fullName mobile rating");

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or already taken",
      });
    }

    // Update captain's status
    await User.findByIdAndUpdate(req.user._id, {
      isAvailable: false,
      currentLocation: {
        lat: ride.pickupCoords.lat,
        lng: ride.pickupCoords.lng,
        address: ride.pickup,
        lastUpdated: new Date()
      }
    });

    // Create notifications
    await Promise.all([
      // Notification for rider
      Notification.create({
        userId: ride.riderId._id,
        type: "ride_accepted",
        title: "Ride Accepted!",
        message: `Your ride has been accepted. Driver is on the way to pickup location.`,
        rideId: ride._id,
        priority: "high"
      }),
      // Notification for captain
      Notification.create({
        userId: req.user._id,
        type: "ride_accepted",
        title: "Ride Accepted",
        message: `You have accepted a ride from ${ride.pickup} to ${ride.drop}`,
        rideId: ride._id,
        priority: "high"
      })
    ]);

    const io = req.app.get("io");

    // Notify the user (rider who created the ride)
    const notificationData = {
      ...ride.toObject(),
      captainId: {
        _id: req.user._id,
        fullName: req.user.fullName,
        mobile: req.user.mobile,
        rating: req.user.rating,
        vehicle: req.user.vehicle || {},
        currentLocation: req.user.currentLocation
      },
      otp: ride.otp, // Include OTP in the notification
    };
    
    console.log("🚀 Emitting rideAccepted to user:", ride.riderId._id.toString());
    console.log("🚀 OTP in notification data:", notificationData.otp);
    console.log("🚀 Notification data:", JSON.stringify(notificationData, null, 2));
    
    io.to(ride.riderId._id.toString()).emit("rideAccepted", notificationData);

    res.json({ 
      success: true, 
      ride,
      message: "Ride accepted successfully"
    });
  } catch (err) {
    console.error("❌ Accept ride error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to accept ride", 
      message: err.message 
    });
  }
};

// 🚖 Reject Ride
exports.rejectRide = async (req, res) => {
  try {
    const rideId = req.params.id;

    const ride = await Ride.findOne({ _id: rideId, status: "pending" });
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or already handled",
      });
    }

    ride.status = "cancelled";
    await ride.save();

    const io = req.app.get("io");
    io.to(ride.riderId.toString()).emit("rideRejected", ride);

    res.json({ success: true, ride });
  } catch (err) {
    console.error("❌ Reject ride error:", err);
    res.status(500).json({ error: "Failed to reject ride" });
  }
};

// 🚖 Get all pending rides (for riders to accept)
exports.getPendingRides = async (req, res) => {
  try {
    console.log("🔍 getPendingRides called by user:", req.user?._id, "role:", req.user?.role);
    
    // Only return rides that are pending and don't have a captain assigned
    const rides = await Ride.find({ 
      status: "pending",
      captainId: { $exists: false }
    })
    .populate("riderId", "fullName mobile rating")
    .sort({ createdAt: -1 });
    
    console.log(`🚗 Found ${rides.length} pending rides for rider ${req.user._id}`);
    console.log("🚗 Rides:", rides.map(r => ({ id: r._id, status: r.status, riderId: r.riderId?.fullName })));
    
    res.json({ success: true, rides });
  } catch (err) {
    console.error("❌ Pending rides fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch rides" });
  }
};

// 📜 Get ride history
exports.getRideHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;
    
    let query = { riderId: req.user._id };
    if (status) {
      query.status = status;
    }

    const rides = await Ride.find(query)
      .populate("captainId", "fullName mobile rating")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Ride.countDocuments(query);

    res.json({ 
      success: true, 
      rides,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (err) {
    console.error("❌ Ride history error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch history",
      message: err.message 
    });
  }
};

// 📜 Get user ride history (for both users and riders)
exports.getUserRideHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {};
    
    // Determine query based on user role
    if (req.user.role === 'rider') {
      // For riders, get rides where they are the captain
      query = { captainId: req.user._id };
    } else {
      // For users, get rides where they are the rider
      query = { riderId: req.user._id };
    }
    
    if (status) {
      query.status = status;
    }

    const rides = await Ride.find(query)
      .populate("riderId", "fullName mobile rating")
      .populate("captainId", "fullName mobile rating")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Ride.countDocuments(query);

    res.json({ 
      success: true, 
      rides,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (err) {
    console.error("❌ User ride history error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch ride history",
      message: err.message 
    });
  }
};

// 🔍 Get ride by ID
exports.getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate("riderId", "fullName mobile rating")
      .populate("captainId", "fullName mobile rating vehicle");
    
    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }
    
    res.json({ success: true, ride });
  } catch (err) {
    console.error("❌ Ride fetch by ID error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch ride",
      message: err.message 
    });
  }
};

// 🚗 Arrive at Pickup
exports.arriveAtPickup = async (req, res) => {
  try {
    const rideId = req.params.id;
    
    if (req.user.role !== "rider") {
      return res.status(403).json({ success: false, message: "Only riders can mark arrival" });
    }

    const ride = await Ride.findOneAndUpdate(
      { _id: rideId, captainId: req.user._id, status: "accepted" },
      { 
        status: "arrived",
        arrivedAt: new Date()
      },
      { new: true }
    ).populate("riderId", "fullName mobile");

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or cannot be marked as arrived"
      });
    }

    // Create notification
    await Notification.create({
      userId: ride.riderId._id,
      type: "rider_arrived",
      title: "Your rider has arrived! 🎉",
      message: "Your driver has arrived at the pickup location. Please come outside.",
      rideId: ride._id,
      priority: "high"
    });

    const io = req.app.get("io");
    io.to(ride.riderId._id.toString()).emit("riderArrived", {
      _id: ride._id,
      pickup: ride.pickup,
      riderId: ride.riderId
    });

    console.log("✅ Rider arrived at pickup for ride:", rideId);
    console.log("📱 Notified user:", ride.riderId._id.toString());

    res.json({ 
      success: true, 
      ride,
      message: "User has been notified of your arrival"
    });
  } catch (err) {
    console.error("❌ Arrive at pickup error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to mark arrival",
      message: err.message 
    });
  }
};

// 🚗 Start Ride
exports.startRide = async (req, res) => {
  try {
    const rideId = req.params.id;
    
    if (req.user.role !== "rider") {
      return res.status(403).json({ success: false, message: "Only riders can start rides" });
    }

    const ride = await Ride.findOneAndUpdate(
      { _id: rideId, captainId: req.user._id, status: "accepted" },
      { 
        status: "started",
        startedAt: new Date()
      },
      { new: true }
    ).populate("riderId", "fullName mobile");

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or cannot be started"
      });
    }

    // Create notification
    await Notification.create({
      userId: ride.riderId._id,
      type: "ride_started",
      title: "Ride Started",
      message: "Your ride has started. Enjoy your journey!",
      rideId: ride._id,
      priority: "high"
    });

    const io = req.app.get("io");
    io.to(ride.riderId._id.toString()).emit("rideStarted", ride);

    res.json({ 
      success: true, 
      ride,
      message: "Ride started successfully"
    });
  } catch (err) {
    console.error("❌ Start ride error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to start ride",
      message: err.message 
    });
  }
};

// 🏁 Complete Ride
exports.completeRide = async (req, res) => {
  try {
    const rideId = req.params.id;
    const { captainRating, captainFeedback } = req.body;
    
    if (req.user.role !== "rider") {
      return res.status(403).json({ success: false, message: "Only riders can complete rides" });
    }

    const ride = await Ride.findOneAndUpdate(
      { _id: rideId, captainId: req.user._id, status: "started" },
      { 
        status: "completed",
        completedAt: new Date(),
        captainRating,
        captainFeedback
      },
      { new: true }
    ).populate("riderId", "fullName mobile rating");

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or cannot be completed"
      });
    }

    // Update captain's stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 
        totalRides: 1,
        totalEarnings: ride.totalFare * 0.8 // 80% to captain, 20% platform fee
      },
      isAvailable: true
    });

    // Update rider's rating
    if (captainRating) {
      const captain = await User.findById(req.user._id);
      const newRating = ((captain.rating * captain.totalRides) + captainRating) / (captain.totalRides + 1);
      await User.findByIdAndUpdate(req.user._id, { rating: newRating });
    }

    // Create payment record
    await Payment.create({
      rideId: ride._id,
      riderId: ride.riderId._id,
      captainId: ride.captainId,
      amount: ride.totalFare,
      paymentMethod: ride.paymentMethod,
      status: "completed",
      platformCommission: ride.totalFare * 0.2,
      captainEarnings: ride.totalFare * 0.8
    });

    // Create notifications
    await Promise.all([
      Notification.create({
        userId: ride.riderId._id,
        type: "ride_completed",
        title: "Ride Completed",
        message: `Your ride has been completed. Total fare: ₹${ride.totalFare}`,
        rideId: ride._id,
        priority: "high"
      }),
      Notification.create({
        userId: req.user._id,
        type: "ride_completed",
        title: "Ride Completed",
        message: `Ride completed successfully. Earnings: ₹${ride.totalFare * 0.8}`,
        rideId: ride._id,
        priority: "high"
      })
    ]);

    const io = req.app.get("io");
    io.to(ride.riderId._id.toString()).emit("rideCompleted", ride);

    res.json({ 
      success: true, 
      ride,
      message: "Ride completed successfully"
    });
  } catch (err) {
    console.error("❌ Complete ride error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to complete ride",
      message: err.message 
    });
  }
};

// ❌ Cancel Ride
exports.cancelRide = async (req, res) => {
  try {
    const rideId = req.params.id;
    const { reason } = req.body;
    
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found"
      });
    }

    // Check if user can cancel this ride
    const canCancel = req.user.role === "admin" || 
                     ride.riderId.toString() === req.user._id.toString() ||
                     (ride.captainId && ride.captainId.toString() === req.user._id.toString());

    if (!canCancel) {
      return res.status(403).json({
        success: false,
        message: "You cannot cancel this ride"
      });
    }

    const cancelledBy = req.user.role === "admin" ? "system" : 
                       ride.riderId.toString() === req.user._id.toString() ? "rider" : "captain";

    await Ride.findByIdAndUpdate(rideId, {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledBy,
      cancellationReason: reason
    });

    // Make captain available again if they cancelled
    if (cancelledBy === "captain" && ride.captainId) {
      await User.findByIdAndUpdate(ride.captainId, { isAvailable: true });
    }

    // Create notifications
    const notifications = [];
    if (ride.riderId.toString() !== req.user._id.toString()) {
      notifications.push(Notification.create({
        userId: ride.riderId,
        type: "ride_cancelled",
        title: "Ride Cancelled",
        message: `Your ride has been cancelled. Reason: ${reason || "No reason provided"}`,
        rideId: ride._id,
        priority: "high"
      }));
    }
    if (ride.captainId && ride.captainId.toString() !== req.user._id.toString()) {
      notifications.push(Notification.create({
        userId: ride.captainId,
        type: "ride_cancelled",
        title: "Ride Cancelled",
        message: `Ride has been cancelled. Reason: ${reason || "No reason provided"}`,
        rideId: ride._id,
        priority: "high"
      }));
    }

    await Promise.all(notifications);

    const io = req.app.get("io");
    if (ride.riderId) {
      io.to(ride.riderId.toString()).emit("rideCancelled", { rideId, reason });
    }
    if (ride.captainId) {
      io.to(ride.captainId.toString()).emit("rideCancelled", { rideId, reason });
    }

    res.json({ 
      success: true,
      message: "Ride cancelled successfully"
    });
  } catch (err) {
    console.error("❌ Cancel ride error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to cancel ride",
      message: err.message 
    });
  }
};

// 📍 Update Location
exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng, address } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required"
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      currentLocation: {
        lat,
        lng,
        address: address || "",
        lastUpdated: new Date()
      }
    });

    // If user is a captain with an active ride, update ride location
    if (req.user.role === "rider") {
      const activeRide = await Ride.findOne({
        captainId: req.user._id,
        status: { $in: ["accepted", "started"] }
      });

      if (activeRide) {
        await Ride.findByIdAndUpdate(activeRide._id, {
          currentLocation: { lat, lng, address: address || "" }
        });

        const io = req.app.get("io");
        io.to(activeRide.riderId.toString()).emit("riderLocationUpdate", {
          rideId: activeRide._id,
          coords: { lat, lng }
        });
      }
    }

    res.json({ 
      success: true,
      message: "Location updated successfully"
    });
  } catch (err) {
    console.error("❌ Update location error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to update location",
      message: err.message 
    });
  }
};

// 🔐 Verify OTP for ride activation
exports.verifyOTP = async (req, res) => {
  try {
    const { rideId, otp } = req.body;

    if (!rideId || !otp) {
      return res.status(400).json({
        success: false,
        message: "Ride ID and OTP are required"
      });
    }

    const ride = await Ride.findById(rideId).populate("riderId", "fullName mobile");

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found"
      });
    }

    // Check if OTP is correct (allow test OTP for development)
    if (ride.otp !== otp && otp !== "123456") {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    // Check if OTP is expired (5 minutes) - skip for test OTP
    if (otp !== "123456") {
      const otpAge = new Date() - new Date(ride.otpGeneratedAt);
      if (otpAge > 5 * 60 * 1000) { // 5 minutes in milliseconds
        return res.status(400).json({
          success: false,
          message: "OTP has expired"
        });
      }
    }

    // Check if already verified
    if (ride.otpVerified) {
      return res.status(400).json({
        success: false,
        message: "OTP already verified"
      });
    }

    // Verify OTP and activate ride
    await Ride.findByIdAndUpdate(rideId, {
      otpVerified: true,
      otpVerifiedAt: new Date(),
      status: "started",
      startedAt: new Date()
    });

    // Create notification for rider
    await Notification.create({
      userId: ride.captainId,
      type: "otp_verified",
      title: "OTP Verified",
      message: `Ride #${ride._id} has been activated by passenger`,
      data: { rideId: ride._id }
    });

    // Create notification for user
    await Notification.create({
      userId: ride.riderId._id,
      type: "ride_started",
      title: "Ride Started",
      message: `Your ride #${ride._id} has been activated`,
      data: { rideId: ride._id }
    });

    // Emit socket events
    const io = req.app.get("io");
    io.to(ride.riderId._id.toString()).emit("rideStarted", {
      rideId: ride._id,
      message: "Ride has been activated"
    });
    
    // Emit OTP verified event to rider
    console.log("🎉 Emitting otpVerified to rider:", ride.captainId.toString());
    io.to(ride.captainId.toString()).emit("otpVerified", {
      rideId: ride._id,
      message: "OTP verified successfully"
    });
    console.log("🎉 otpVerified event emitted successfully");

    res.json({
      success: true,
      message: "OTP verified successfully. Ride activated!",
      ride: {
        _id: ride._id,
        status: "started",
        otpVerified: true
      }
    });

  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// 🔄 Resend OTP
exports.resendOTP = async (req, res) => {
  try {
    const { rideId } = req.body;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: "Ride ID is required"
      });
    }

    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found"
      });
    }

    // Generate new OTP
    const newOTP = generateOTP();
    
    await Ride.findByIdAndUpdate(rideId, {
      otp: newOTP,
      otpGeneratedAt: new Date(),
      otpVerified: false
    });

    // Create notification for rider
    await Notification.create({
      userId: ride.captainId,
      type: "otp_resent",
      title: "New OTP Generated",
      message: `New OTP for ride #${ride._id}: ${newOTP}`,
      data: { rideId: ride._id, otp: newOTP }
    });

    res.json({
      success: true,
      message: "New OTP generated successfully",
      otp: newOTP // In production, this should be sent via SMS/email
    });

  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Get active ride for user
exports.getActiveRide = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    
    let query = {};
    
    if (userRole === 'user') {
      // For users, get active ride where they are the rider
      query = { 
        riderId: userId,
        status: { $in: ['accepted', 'started'] }
      };
    } else if (userRole === 'rider') {
      // For riders, get active ride where they are the captain
      query = { 
        captainId: userId,
        status: { $in: ['accepted', 'started'] }
      };
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid user role"
      });
    }
    
    const ride = await Ride.findOne(query)
      .populate('riderId', 'fullName mobile rating')
      .populate('captainId', 'fullName mobile vehicle')
      .sort({ createdAt: -1 });
    
    if (ride) {
      res.json({
        success: true,
        ride: ride
      });
    } else {
      res.json({
        success: false,
        message: "No active ride found"
      });
    }
  } catch (error) {
    console.error("Error fetching active ride:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active ride"
    });
  }
};
