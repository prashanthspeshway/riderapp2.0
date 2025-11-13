const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Rider = require("../models/Rider");
require("dotenv").config();

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Allow the /online endpoint to be accessed without auth (for map display)
    if (req.path === '/online' || req.originalUrl.includes('/online')) {
      console.log('✅ Bypassing auth for /online endpoint');
      return next();
    }
    
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
    
    const decoded = jwt.verify(token, jwtSecret);

    // Handle admin users (they don't exist in User collection)
    if (decoded.role === 'admin' && decoded.id === 'admin-001') {
      req.user = {
        id: decoded.id,
        _id: decoded.id,
        fullName: 'Admin',
        mobile: '0000000000',
        email: 'admin@rideshare.com',
        role: 'admin',
        approvalStatus: 'approved',
        isAvailable: false,
        isOnline: true,
      };
      return next();
    }
    // If token role is 'rider', authenticate against new Riders collection OR User collection
    if (decoded.role === 'rider') {
      // Try Rider collection first (new riders)
      let rider = await Rider.findById(decoded.id).lean();
      let isOldRider = false;
      
      if (!rider) {
        // If not found in Rider collection, try User collection (old riders)
        rider = await User.findOne({ _id: decoded.id, role: "rider" }).lean();
        isOldRider = true;
      }
      
      if (!rider) {
        return res
          .status(401)
          .json({ success: false, message: "User not found" });
      }

      req.user = {
        id: rider._id,
        _id: rider._id,
        fullName: isOldRider ? rider.fullName : `${rider.firstName} ${rider.lastName}`,
        mobile: rider.mobile,
        email: rider.email,
        role: 'rider',
        approvalStatus: isOldRider ? rider.approvalStatus : rider.status,
        isAvailable: rider.isAvailable || false,
        isOnline: rider.isOnline || false,
      };
      return next();
    }

    // Otherwise authenticate classic users collection
    const user = await User.findById(decoded.id).lean();
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    req.user = {
      id: user._id,
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

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin
};
