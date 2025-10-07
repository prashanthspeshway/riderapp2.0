const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  rideId: {
    type: String, // Changed from ObjectId to String to handle numeric IDs
    required: true
  },
  sender: {
    type: String,
    required: true,
    enum: ["user", "rider"]
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
chatSchema.index({ rideId: 1, timestamp: 1 });

module.exports = mongoose.model("Chat", chatSchema);
