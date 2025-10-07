const express = require("express");
const router = express.Router();
const rideController = require("../controllers/rides.controller");
const authMiddleware = require("../middleware/authMiddleware");

// 🚖 Create a ride
router.post("/create", authMiddleware, rideController.createRide);

// 📜 Get ride history for logged-in rider
router.get("/history", authMiddleware, rideController.getRideHistory);

// 📜 Get user ride history (for both users and riders)
router.get("/my", authMiddleware, rideController.getUserRideHistory);

// 🚖 Get active ride (MUST be before /:id route)
router.get("/active", authMiddleware, rideController.getActiveRide);

// 🚖 Get all pending rides (to be accepted)
router.get("/pending", authMiddleware, rideController.getPendingRides);

// 📍 Update location
router.post("/location", authMiddleware, rideController.updateLocation);

// 🔐 Verify OTP for ride activation
router.post("/verify-otp", authMiddleware, rideController.verifyOTP);

// 🔄 Resend OTP
router.post("/resend-otp", authMiddleware, rideController.resendOTP);

// 🚖 Accept a ride
router.post("/:id/accept", authMiddleware, rideController.acceptRide);

// 🚖 Reject a ride
router.post("/:id/reject", authMiddleware, rideController.rejectRide);

// 🚗 Start a ride
router.post("/:id/start", authMiddleware, rideController.startRide);

// 🏁 Complete a ride
router.post("/:id/complete", authMiddleware, rideController.completeRide);

// ❌ Cancel a ride
router.post("/:id/cancel", authMiddleware, rideController.cancelRide);

// 🔍 Get a single ride by ID (MUST be last)
router.get("/:id", authMiddleware, rideController.getRideById);

module.exports = router;
