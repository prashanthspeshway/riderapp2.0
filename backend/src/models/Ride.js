const mongoose = require("mongoose");

// Counter schema for auto-increment
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.model("Counter", counterSchema);

// Ride schema
const rideSchema = new mongoose.Schema(
  {
    _id: { type: Number }, // auto-incremented ride ID

    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    captainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    pickup: { type: String, required: true },
    drop: { type: String, required: true },

    pickupCoords: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    dropCoords: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },

    // Ride details
    rideType: {
      type: String,
      enum: ["bike", "auto", "car", "premium"],
      default: "car"
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "arrived", "started", "completed", "cancelled"],
      default: "pending",
    },

    // Pricing
    baseFare: { type: Number, default: 0 },
    distanceFare: { type: Number, default: 0 },
    timeFare: { type: Number, default: 0 },
    totalFare: { type: Number, default: 0 },
    surgeMultiplier: { type: Number, default: 1.0 },

    // Distance and time
    distance: { type: Number, default: 0 }, // in km
    duration: { type: Number, default: 0 }, // in minutes
    etaMinutes: { type: Number, default: null },

    // Tracking
    currentLocation: {
      lat: { type: Number },
      lng: { type: Number },
      address: { type: String }
    },

    // Timestamps
    acceptedAt: { type: Date },
    arrivedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },

    // Cancellation
    cancelledBy: {
      type: String,
      enum: ["rider", "captain", "system"]
    },
    cancellationReason: { type: String },

    // Payment
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending"
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "wallet", "upi"],
      default: "cash"
    },

    // Ratings and feedback
    riderRating: { type: Number, min: 1, max: 5 },
    captainRating: { type: Number, min: 1, max: 5 },
    riderFeedback: { type: String },
    captainFeedback: { type: String },

    // Special requests
    specialInstructions: { type: String },
    isScheduled: { type: Boolean, default: false },
    scheduledAt: { type: Date },

    // Safety features
    sosTriggered: { type: Boolean, default: false },
    sosTriggeredAt: { type: Date },

    // OTP verification
    otp: { type: String },
    otpGeneratedAt: { type: Date },
    otpVerified: { type: Boolean, default: false },
    otpVerifiedAt: { type: Date },
  },
  { timestamps: true }
);

// Auto-increment rideId
rideSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        "rideId",
        { $inc: { seq: 1 } },
        { upsert: true, new: true }
      );
      this._id = counter.seq;
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model("Ride", rideSchema);
