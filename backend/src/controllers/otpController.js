const Otp = require("../models/Otp");
const User = require("../models/User");
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

    let user = await User.findOne({ mobile });
    
    // If user doesn't exist, create a new one
    if (!user) {
      user = new User({
        mobile,
        role,
        fullName: `User ${mobile.slice(-4)}`, // Temporary name
        approvalStatus: role === "rider" ? "pending" : "approved"
      });
      await user.save();
      console.log(`✅ New user created: ${mobile} with role: ${role}`);
    }

    if (user.role === "rider" && user.approvalStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Rider account not approved yet",
      });
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

    let user = await User.findOne({ mobile });
    
    // If user doesn't exist, create a new one
    if (!user) {
      user = new User({
        mobile,
        role,
        fullName: `User ${mobile.slice(-4)}`, // Temporary name
        approvalStatus: role === "rider" ? "pending" : "approved"
      });
      await user.save();
      console.log(`✅ New user created during verification: ${mobile} with role: ${role}`);
    }

    user.loginCount = (user.loginCount || 0) + 1;
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "7d" }
    );

    console.log(
      `✅ OTP verified for ${mobile}, role: ${user.role}, loginCount: ${user.loginCount}`
    );

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (err) {
    console.error("❌ OTP Verify Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error verifying OTP" });
  }
};
