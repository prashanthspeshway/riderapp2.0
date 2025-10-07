const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    rideId: {
      type: Number,
      ref: "Ride",
      required: true
    },
    
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    
    captainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // Payment details
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    
    currency: {
      type: String,
      default: "INR"
    },

    // Payment method
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "wallet", "upi", "netbanking"],
      required: true
    },

    // Payment gateway details
    gateway: {
      type: String,
      enum: ["razorpay", "stripe", "payu", "cash"],
      default: "cash"
    },

    gatewayTransactionId: {
      type: String
    },

    gatewayOrderId: {
      type: String
    },

    // Payment status
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "cancelled", "refunded"],
      default: "pending"
    },

    // Timestamps
    initiatedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    failedAt: { type: Date },

    // Failure details
    failureReason: { type: String },
    failureCode: { type: String },

    // Refund details
    refundAmount: { type: Number, default: 0 },
    refundReason: { type: String },
    refundedAt: { type: Date },

    // Commission
    platformCommission: { type: Number, default: 0 },
    captainEarnings: { type: Number, default: 0 },

    // Additional charges
    taxes: { type: Number, default: 0 },
    convenienceFee: { type: Number, default: 0 },
    surgeCharges: { type: Number, default: 0 },

    // Payment metadata
    metadata: {
      type: Map,
      of: String
    }
  },
  { timestamps: true }
);

// Indexes for better query performance
paymentSchema.index({ rideId: 1 });
paymentSchema.index({ riderId: 1 });
paymentSchema.index({ captainId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);