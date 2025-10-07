const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Rider = require("../models/Rider");
require("dotenv").config();

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No authorization header");
      return res
        .status(401)
        .json({ success: false, message: "Authorization token missing" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      console.log("❌ No token in header");
      return res
        .status(401)
        .json({ success: false, message: "Invalid token format" });
    }

    // Use a consistent secret key
    const jwtSecret = process.env.JWT_SECRET || "rider_app_secret_key_2024";
    console.log("🔐 Using JWT secret:", jwtSecret ? "Set" : "Not set");
    
    const decoded = jwt.verify(token, jwtSecret);
    console.log("🔐 Decoded token:", { id: decoded.id, role: decoded.role });
    console.log("🔐 Looking for rider with ID:", decoded.id);

    // Check Rider collection FIRST for riders, then User collection for others
    let user = null;
    let isOldUser = false;
    
    if (decoded.role === "rider") {
      console.log("🔍 Searching for rider in riders collection with ID:", decoded.id);
      console.log("🔍 ID type:", typeof decoded.id);
      
      // Convert string ID to ObjectId if needed
      const mongoose = require('mongoose');
      const riderId = mongoose.Types.ObjectId.isValid(decoded.id) ? decoded.id : new mongoose.Types.ObjectId(decoded.id);
      console.log("🔍 Converted ID:", riderId);
      
      user = await Rider.findById(riderId).lean();
      console.log("🔍 Rider found:", user ? "YES" : "NO");
      if (user) {
        console.log("🔍 Rider details:", { id: user._id, mobile: user.mobile, firstName: user.firstName });
      }
    } else {
      user = await User.findById(decoded.id).lean();
      isOldUser = true;
    }
    
    if (!user) {
      console.log("❌ User not found for ID:", decoded.id);
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    console.log("✅ User authenticated:", isOldUser ? user.fullName : `${user.firstName} ${user.lastName}`, "Role:", isOldUser ? user.role : "rider");

    req.user = {
      _id: user._id,
      fullName: isOldUser ? user.fullName : `${user.firstName} ${user.lastName}`,
      mobile: user.mobile,
      email: user.email,
      role: isOldUser ? user.role : "rider",
      approvalStatus: isOldUser ? user.approvalStatus : user.status,
      isAvailable: user.isAvailable || false,
      isOnline: user.isOnline || false,
    };

    next();
  } catch (err) {
    console.error("❌ Auth error:", err.message);
    console.error("❌ Auth error type:", err.name);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: "Token expired" });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: "Invalid token format" });
    } else {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
  }
};

module.exports = authMiddleware;
