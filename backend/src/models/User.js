const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    fullName: { 
      type: String, 
      required: [true, "Full name is required"], 
      trim: true,
      minlength: [2, "Full name must be at least 2 characters"],
      maxlength: [50, "Full name cannot exceed 50 characters"]
    },
    email: { 
      type: String, 
      unique: true, 
      sparse: true,
      validate: [validator.isEmail, "Please provide a valid email"]
    },
    mobile: { 
      type: String, 
      required: [true, "Mobile number is required"], 
      unique: true,
      validate: {
        validator: function(v) {
          return /^[6-9]\d{9}$/.test(v);
        },
        message: "Please provide a valid Indian mobile number"
      }
    },
    password: {
      type: String,
      required: false, // Make password optional for OTP-based auth
      minlength: [6, "Password must be at least 6 characters"]
    },

    // ✅ Only Rider, User, Admin
    role: {
      type: String,
      enum: ["rider", "user", "admin"],
      default: "user",
    },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved", // Riders may need admin approval later
    },

    // Profile information
    profilePicture: { 
      url: String, 
      mimetype: String, 
      public_id: String 
    },
    
    // Location tracking
    currentLocation: {
      lat: { type: Number },
      lng: { type: Number },
      address: { type: String },
      lastUpdated: { type: Date }
    },

    // Rider specific fields
    isOnline: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: false },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalRides: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },

    // Rider documents if needed
    documents: {
      aadharFront: { url: String, mimetype: String, public_id: String },
      aadharBack: { url: String, mimetype: String, public_id: String },
      license: { url: String, mimetype: String, public_id: String },
      panCard: { url: String, mimetype: String, public_id: String },
      rc: { url: String, mimetype: String, public_id: String },
    },

    // Emergency contact
    emergencyContact: {
      name: { type: String },
      mobile: { type: String }
    },

    // Account status
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    loginCount: { type: Number, default: 0 },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ mobile: 1 });

module.exports = mongoose.model("User", userSchema);
