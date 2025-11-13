const Otp = require("../models/Otp");
const User = require("../models/User");
const Rider = require("../models/Rider");
const jwt = require("jsonwebtoken");

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

function generateMobileVariants(rawMobile) {
  const trimmed = String(rawMobile || '').trim();
  const digitsOnly = trimmed.replace(/\D/g, '');

  const variants = new Set([
    trimmed,
    digitsOnly,
    digitsOnly.startsWith('0') ? digitsOnly.replace(/^0+/, '') : digitsOnly,
  ]);

  if (digitsOnly && digitsOnly.length === 10) {
    variants.add(`+${digitsOnly}`);
    variants.add(`+91${digitsOnly}`);
    variants.add(`91${digitsOnly}`);
    variants.add(`0${digitsOnly}`);
  }

  if (trimmed.startsWith('+91') && digitsOnly.length === 12) {
    variants.add(digitsOnly.slice(-10));
  }

  return Array.from(variants).filter(Boolean);
}

// 🔹 Send OTP
exports.send = async (req, res) => {
  try {
    // Comprehensive logging for debugging ngrok issues
    console.log('📥 OTP Send Request Received:');
    console.log('  - Method:', req.method);
    console.log('  - URL:', req.originalUrl);
    console.log('  - Headers:', JSON.stringify(req.headers, null, 2));
    console.log('  - Raw Body:', req.body);
    console.log('  - Body Type:', typeof req.body);
    console.log('  - Body Keys:', Object.keys(req.body || {}));
    
    const { mobile, role = "user" } = req.body || {};
    
    console.log('  - Extracted mobile:', mobile);
    console.log('  - Extracted role:', role);
    
    if (!mobile) {
      console.error('❌ Mobile is missing from request body');
      return res
        .status(400)
        .json({ success: false, message: "Mobile is required" });
    }

    // Normalize mobile number: trim whitespace and convert to string
    const normalizedMobile = String(mobile).trim();
    const variants = generateMobileVariants(normalizedMobile);
    console.log(`📱 OTP request for mobile: "${normalizedMobile}", role: "${role}"`);
    console.log('  - Mobile variants considered:', variants);

    let user = null;
    let isOldRider = true;
    
    if (role === "rider") {
      // First, try legacy riders stored in User collection with role 'rider'
      // Try both exact match and string comparison
      user = await User.findOne({ mobile: { $in: variants }, role: "rider" });
      isOldRider = true;
      
      // If not found, fallback to new Rider collection
      if (!user) {
        user = await Rider.findOne({ mobile: { $in: variants } });
        isOldRider = false;
      }
      
      // If still not found, log detailed info
      if (!user) {
        try {
          const allUsers = await User.find({ role: "rider" }).select('mobile').lean();
          const allRiders = await Rider.find({}).select('mobile').lean();
          console.log(`🔍 Searched for rider with mobile: "${normalizedMobile}"`);
          console.log(`📋 Found ${allUsers.length} users with role rider, ${allRiders.length} riders in Rider collection`);
          console.log(`📋 Sample rider mobiles (User):`, allUsers.slice(0, 5).map(u => ({ mobile: String(u.mobile), type: typeof u.mobile })));
          console.log(`📋 Sample rider mobiles (Rider):`, allRiders.slice(0, 5).map(r => ({ mobile: String(r.mobile), type: typeof r.mobile })));
          
          // Try direct queries
          const directUserQuery = await User.findOne({ mobile: normalizedMobile, role: "rider" }).lean();
          const directRiderQuery = await Rider.findOne({ mobile: normalizedMobile }).lean();
          console.log(`🔍 Direct User query:`, directUserQuery ? 'FOUND' : 'NOT FOUND');
          console.log(`🔍 Direct Rider query:`, directRiderQuery ? 'FOUND' : 'NOT FOUND');
        } catch (dbError) {
          console.error('❌ Database query error:', dbError.message);
        }
        
        return res.status(404).json({
          success: false,
          message: "Rider not found. Please register first.",
        });
      }
    } else {
      // For non-rider roles (e.g., user), match by mobile only to avoid role mismatch
      // Try both exact match and string comparison
      user = await User.findOne({ mobile: { $in: variants } });
      
      if (!user) {
        // Log available users for debugging
        try {
          const allUsers = await User.find({}).select('mobile role').limit(10).lean();
          const totalUsers = await User.countDocuments({});
          console.log(`🔍 Searched for user with mobile: "${normalizedMobile}"`);
          console.log(`📋 Total users in DB: ${totalUsers}`);
          console.log(`📋 Sample users in DB:`, allUsers.map(u => ({ mobile: String(u.mobile), mobileType: typeof u.mobile, role: u.role })));
          
          // Try a direct query to see if mobile exists in any form
          const directQuery = await User.findOne({ mobile: normalizedMobile }).lean();
          console.log(`🔍 Direct query result:`, directQuery ? 'FOUND' : 'NOT FOUND');
          
          // Try querying all users with similar mobile (for debugging)
          const similarMobiles = await User.find({ 
            mobile: { $regex: normalizedMobile.slice(-4) } 
          }).select('mobile').limit(5).lean();
          console.log(`🔍 Users with similar mobile (last 4 digits):`, similarMobiles.map(u => String(u.mobile)));
        } catch (dbError) {
          console.error('❌ Database query error:', dbError.message);
        }
        
        // Optionally auto-create a bare user record for OTP login in dev
        const autoCreate = (process.env.OTP_AUTO_CREATE_USER === 'true');
        if (autoCreate) {
          try {
            const placeholderName = `User ${normalizedMobile.slice(-4)}`;
            const newUser = await User.create({
              fullName: placeholderName,
              email: '',
              mobile: normalizedMobile,
              role: 'user'
            });
            console.log(`🆕 Auto-created user for OTP: ${newUser._id} (${normalizedMobile})`);
            user = newUser;
          } catch (createErr) {
            console.error('❌ Failed to auto-create user:', createErr.message);
            return res.status(404).json({
              success: false,
              message: "User not found. Please sign up first.",
            });
          }
        } else {
          return res.status(404).json({
            success: false,
            message: "User not found. Please sign up first.",
          });
        }
      }
    }

    // Check approval status (different field names for old vs new riders)
    if (role === "rider") {
      const isApproved = (user.approvalStatus === "approved") || (user.status === "approved");
      if (!isApproved) {
        return res.status(403).json({
          success: false,
          message: "Rider account not approved yet",
        });
      }
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    // Use normalized mobile for OTP record
    const otpRecord = await Otp.findOneAndUpdate(
      { mobile: normalizedMobile, role },
      { otp, userId: user._id, otpExpires, role, mobile: normalizedMobile },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`📲 OTP for ${mobile}: ${otp}`);
    res.json({ 
      success: true, 
      message: "OTP sent successfully", 
      otpRecord
    });
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

    // Normalize mobile number
    const normalizedMobile = String(mobile).trim();
    console.log(`🔐 OTP verify for mobile: "${normalizedMobile}", role: "${role}"`);

    const variants = generateMobileVariants(normalizedMobile);
    console.log('  - Mobile variants considered:', variants);

    const record = await Otp.findOne({ 
      mobile: { $in: variants },
      role
    });
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
      // First, try legacy riders stored in User collection with role 'rider'
      user = await User.findOne({ mobile: { $in: variants }, role: "rider" });
      isOldRider = true;
      
      // If not found, fallback to new Rider collection
      if (!user) {
        user = await Rider.findOne({ mobile: { $in: variants } });
        isOldRider = false;
      }
      
      // If still not found, return error
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Rider not found. Please register first.",
        });
      }
    } else {
      // For non-rider roles (e.g., user), match by mobile only to avoid role mismatch
      user = await User.findOne({ mobile: { $in: variants } });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found. Please sign up first.",
        });
      }
    }

    // Update login tracking (only if user has save method - Mongoose models)
    try {
      if (typeof user.save === 'function') {
        user.loginCount = (user.loginCount || 0) + 1;
        user.lastLogin = new Date();
        await user.save();
      } else {
        // For lean() queries or if save doesn't exist, update directly
        const updateData = {
          loginCount: (user.loginCount || 0) + 1,
          lastLogin: new Date()
        };
        if (isOldRider) {
          await User.findByIdAndUpdate(user._id, updateData);
        } else {
          await Rider.findByIdAndUpdate(user._id, updateData);
        }
      }
    } catch (saveError) {
      console.warn("⚠️ Could not update login tracking:", saveError.message);
      // Don't fail the login if tracking update fails
    }

    // Determine user role and approval status based on collection
    const userRole = isOldRider ? (user.role || "user") : "rider";
    const approvalStatus = (user.approvalStatus !== undefined) ? user.approvalStatus : user.status;

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
