const User = require("../models/User");
const Rider = require("../models/Rider");
const jwt = require("jsonwebtoken");
const { connectDB, cloudinary } = require('../config/db');
const bcrypt = require("bcrypt"); // added for secure password hashing

require("dotenv").config();

const documentFields = [
  { key: "profilePicture", name: "Profile Picture" },
  { key: "aadharFront", name: "Aadhar Front" },
  { key: "aadharBack",  name: "Aadhar Back" },
  { key: "license",     name: "License" },
  { key: "panCard",     name: "PAN Card" },
  { key: "rc",          name: "RC" },
];

const uploadBufferToCloudinary = (buffer, folder = "riders") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });

// ==================== User ====================


    exports.registerUser = async (req, res) => {
  try {
    const { fullName, email, mobile } = req.body;

    if (!fullName || !email || !mobile) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const existing = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existing)
      return res.status(400).json({ success: false, message: "Email or mobile already registered" });

    // For users, generate password automatically
    const rawPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const user = new User({
      fullName,
      email,
      mobile,
      role: "user",
      password: hashedPassword,
      approvalStatus: "approved", // user does not need admin approval
    });

    await user.save(); // ✅ this is crucial

    res.status(201).json({ success: true, message: "User registered", data: { user, password: rawPassword } });
  } catch (err) {
    console.error("User register error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.loginUser = async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const user = await User.findOne({ mobile, role: "user" });

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: "user" }, process.env.JWT_SECRET || "rider_app_secret_key_2024", { expiresIn: "12h" });
    res.json({ success: true, token, user });
  } catch (err) {
    console.error("User login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================== Rider ====================
exports.registerRider = async (req, res) => {
  try {
    const { fullName, email, mobile, panNumber, aadharNumber, licenseNumber, vehicleNumber } = req.body;
    const files = req.files || {};

    if (!fullName || !email || !mobile || !panNumber || !aadharNumber || !licenseNumber || !vehicleNumber) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Check for existing users or riders with same email or mobile
    const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
    const existingRider = await Rider.findOne({ $or: [{ email }, { mobile }] });
    
    if (existingUser || existingRider) {
      return res.status(400).json({ success: false, message: "Email or mobile already registered" });
    }

    // Upload profile picture to Cloudinary
    // Store only the URL string in Rider.profilePicture to match Rider model
    let profilePicture = null;
    if (files.profilePicture && files.profilePicture[0]) {
      try {
        const result = await uploadBufferToCloudinary(files.profilePicture[0].buffer, "riders/profile-pictures");
        profilePicture = result.secure_url;
        console.log('Uploaded profile picture:', profilePicture);
      } catch (err) {
        console.error('Profile picture upload failed:', err);
      }
    }

    // Upload other documents to Cloudinary
    const documents = [];

    for (const field of documentFields) {
      if (field.key !== 'profilePicture' && files[field.key] && files[field.key][0]) {
        try {
          const result = await uploadBufferToCloudinary(files[field.key][0].buffer);
          console.log(`Uploaded ${field.key}:`, result.secure_url);
          documents.push({ name: field.name, url: result.secure_url });
        } catch (err) {
          console.error(`Cloudinary upload failed for ${field.key}:`, err);
        }
      }
    }


    const rider = new Rider({
      firstName: fullName.split(' ')[0] || '',
      lastName: fullName.split(' ').slice(1).join(' ') || '',
      email,
      mobile,
      panNumber,
      aadharNumber,
      licenseNumber,
      vehicleNumber,
      status: "pending",
      // Save profile picture URL string (or null)
      profilePicture: profilePicture || null,
      documents,
    });

    await rider.save();
    res.status(201).json({ success: true, message: "Rider registered successfully! Please wait for admin approval.", data: rider });
  } catch (err) {
    console.error("Rider register error:", err);
    
    // Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      const value = err.keyValue[field];
      
      if (field === 'mobile') {
        return res.status(400).json({ 
          success: false, 
          message: `Mobile number ${value} is already registered. Please use a different mobile number.` 
        });
      } else if (field === 'email') {
        return res.status(400).json({ 
          success: false, 
          message: `Email ${value} is already registered. Please use a different email address.` 
        });
      } else if (field === 'panNumber') {
        return res.status(400).json({ 
          success: false, 
          message: `PAN number ${value} is already registered. Please use a different PAN number.` 
        });
      } else if (field === 'aadharNumber') {
        return res.status(400).json({ 
          success: false, 
          message: `Aadhar number ${value} is already registered. Please use a different Aadhar number.` 
        });
      } else if (field === 'licenseNumber') {
        return res.status(400).json({ 
          success: false, 
          message: `License number ${value} is already registered. Please use a different license number.` 
        });
      } else if (field === 'vehicleNumber') {
        return res.status(400).json({ 
          success: false, 
          message: `Vehicle number ${value} is already registered. Please use a different vehicle number.` 
        });
      }
    }
    
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.loginRider = async (req, res) => {
  try {
    const { mobile, password } = req.body;
    
    // Check both User collection (old riders) and Rider collection (new riders)
    let rider = await User.findOne({ mobile, role: "rider" });
    let isOldRider = true;
    
    if (!rider) {
      rider = await Rider.findOne({ mobile });
      isOldRider = false;
    }

    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });
    
    // Check approval status (different field names for old vs new riders)
    const isApproved = isOldRider ? 
      rider.approvalStatus === "approved" : 
      rider.status === "approved";
      
    if (!isApproved) return res.status(403).json({ success: false, message: "Account not approved yet" });

    // For new riders, password is not set yet (they need admin approval first)
    if (!isOldRider && !rider.password) {
      return res.status(403).json({ success: false, message: "Account not approved yet. Please wait for admin approval." });
    }

    const validPassword = await bcrypt.compare(password, rider.password);
    if (!validPassword) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: rider._id, role: "rider" }, process.env.JWT_SECRET || "rider_app_secret_key_2024", { expiresIn: "12h" });
    res.json({ success: true, token });
  } catch (err) {
    console.error("Rider login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================== Admin ====================
exports.loginAdmin = async (req, res) => { /* ... unchanged ... */ };

// ==================== Admin approves rider ====================
exports.approveRider = async (req, res) => {
  try {
    const { riderId } = req.params;
    
    // Check both User collection (old riders) and Rider collection (new riders)
    let rider = await User.findById(riderId);
    let isOldRider = true;
    
    if (!rider) {
      rider = await Rider.findById(riderId);
      isOldRider = false;
    }
    
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    // Generate random password & hash
    const rawPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Update based on collection type
    if (isOldRider) {
      rider.password = hashedPassword;
      rider.approvalStatus = "approved";
    } else {
      rider.password = hashedPassword;
      rider.status = "approved";
      rider.approvedAt = new Date();
      rider.approvedBy = "admin-001";
    }
    
    await rider.save();

    // send rawPassword via email/SMS in real scenario
    res.json({ success: true, message: "Rider approved", password: rawPassword });
  } catch (err) {
    console.error("Approve rider error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
