const jwt = require("jsonwebtoken");
const User = require("../models/User");
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

    const user = await User.findById(decoded.id).lean();
    if (!user) {
      console.log("❌ User not found for ID:", decoded.id);
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    console.log("✅ User authenticated:", user.fullName, "Role:", user.role);

    req.user = {
      _id: user._id,
      fullName: user.fullName,
      mobile: user.mobile,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
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
