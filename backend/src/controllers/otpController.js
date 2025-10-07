const Otp = require("../models/Otp");
const User = require("../models/User");
const Rider = require("../models/Rider");
const jwt = require("jsonwebtoken");

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// 🔹 Send OTP
exports.send = async (req, res) => {
  try {
    const { mobile, role = "user" } = req.body;
    if (!mobile) {
      return res
        .status(400)
        .json({ success: false, message: "Mobile is required" });
    }

    let user = null;
    let isOldRider = true;
    
    if (role === "rider") {
      // Check Rider collection ONLY
      user = await Rider.findOne({ mobile });
      isOldRider = false;
      
      // If no rider found, return error
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Rider not found. Please register first.",
        });
      }
    } else {
      // For non-rider roles, check User collection
      user = await User.findOne({ mobile, role });
      
      // If user doesn't exist, create a new one
      if (!user) {
        user = new User({
          mobile,
          email: `${mobile}@temp.com`, // Temporary email to avoid null constraint
          role,
          fullName: `User ${mobile.slice(-4)}`, // Temporary name
          approvalStatus: "approved"
        });
        await user.save();
        console.log(`✅ New user created: ${mobile} with role: ${role}`);
      }
    }

    // Check approval status (different field names for old vs new riders)
    if (role === "rider") {
      const isApproved = isOldRider ? 
        user.approvalStatus === "approved" : 
        user.status === "approved";
        
      if (!isApproved) {
        return res.status(403).json({
          success: false,
          message: "Rider account not approved yet",
        });
      }
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    const otpRecord = await Otp.findOneAndUpdate(
      { mobile },
      { otp, userId: user._id, otpExpires },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`📲 OTP for ${mobile}: ${otp}`);
    res.json({ success: true, message: "OTP sent successfully", otpRecord });
  } catch (err) {
    console.error("❌ OTP Send Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error sending OTP" });
  }
};

// 🔹 Verify OTP
exports.verify = async (req, res) => {
  try {
    const { mobile, otp, role = "user" } = req.body;
    if (!mobile || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Mobile and OTP required" });
    }

    const record = await Otp.findOne({ mobile });
    if (!record) {
      return res.status(400).json({
        success: false,
        message: "OTP not found. Please request again.",
      });
    }

    if (record.otp !== otp) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP" });
    }

    if (record.otpExpires && record.otpExpires < new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    let user = null;
    let isOldRider = true;
    
    if (role === "rider") {
      // Check Rider collection ONLY
      user = await Rider.findOne({ mobile });
      isOldRider = false;
      
      // If no rider found, return error
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Rider not found. Please register first.",
        });
      }
    } else {
      // For non-rider roles, check User collection
      user = await User.findOne({ mobile, role });
      
      // If user doesn't exist, create a new one
      if (!user) {
        user = new User({
          mobile,
          email: `${mobile}@temp.com`, // Temporary email to avoid null constraint
          role,
          fullName: `User ${mobile.slice(-4)}`, // Temporary name
          approvalStatus: "approved"
        });
        await user.save();
        console.log(`✅ New user created during verification: ${mobile} with role: ${role}`);
      }
    }

    // Update login tracking
    user.loginCount = (user.loginCount || 0) + 1;
    user.lastLogin = new Date();
    await user.save();

    // Determine user role and approval status based on collection
    const userRole = isOldRider ? user.role : "rider";
    const approvalStatus = isOldRider ? user.approvalStatus : user.status;

    const token = jwt.sign(
      { id: user._id, role: userRole },
      process.env.JWT_SECRET || "rider_app_secret_key_2024",
      { expiresIn: "7d" }
    );

    console.log(
      `✅ OTP verified for ${mobile}, role: ${userRole}, loginCount: ${user.loginCount}`
    );

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        fullName: isOldRider ? user.fullName : `${user.firstName} ${user.lastName}`,
        mobile: user.mobile,
        email: user.email,
        role: userRole,
        approvalStatus: approvalStatus,
        // Include profile picture for navbar avatar
        profilePicture: user.profilePicture || user.profileImage || null,
      },
    });
  } catch (err) {
    console.error("❌ OTP Verify Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error verifying OTP" });
  }
};
