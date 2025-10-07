const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    type: {
      type: String,
      enum: [
        "ride_requested",
        "ride_accepted", 
        "ride_rejected",
        "ride_arrived",
        "ride_started",
        "ride_completed",
        "ride_cancelled",
        "payment_received",
        "payment_failed",
        "rating_received",
        "sos_alert",
        "promotion",
        "system",
        "otp_verified",
        "otp_resent"
      ],
      required: true
    },

    title: {
      type: String,
      required: true,
      maxlength: 100
    },

    message: {
      type: String,
      required: true,
      maxlength: 500
    },

    // Related entities
    rideId: {
      type: Number,
      ref: "Ride"
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment"
    },

    // Notification status
    isRead: {
      type: Boolean,
      default: false
    },

    readAt: {
      type: Date
    },

    // Delivery status
    deliveryStatus: {
      type: String,
      enum: ["pending", "sent", "delivered", "failed"],
      default: "pending"
    },

    // Push notification details
    pushNotification: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      deviceToken: { type: String },
      platform: { type: String, enum: ["android", "ios", "web"] }
    },

    // Email notification details
    emailNotification: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      email: { type: String }
    },

    // SMS notification details
    smsNotification: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      mobile: { type: String }
    },

    // Priority level
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium"
    },

    // Additional data
    data: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    },

    // Expiry
    expiresAt: {
      type: Date,
      default: function() {
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      }
    }
  },
  { timestamps: true }
);

// Indexes for better query performance
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for formatted time
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
});

module.exports = mongoose.model("Notification", notificationSchema);



