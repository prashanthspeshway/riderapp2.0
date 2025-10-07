const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const User = require("../models/User");
const Ride = require("../models/Ride");
const Rider = require("../models/Rider");
const SOS = require("../models/SOS"); // 🚨 SOS model

// 🔹 Static admin credentials
const ADMIN_USER = {
  username: "admin",
  password: "admin123",
};

// 🔹 Admin login
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username !== ADMIN_USER.username || password !== ADMIN_USER.password) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: "admin-001", username: ADMIN_USER.username, role: "admin" },
    process.env.JWT_SECRET || "rider_app_secret_key_2024",
    { expiresIn: "12h" }
  );

  return res.json({ success: true, token, role: "admin" });
});

// 🔹 Overview (protected)
router.get("/overview", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [usersCount, oldRidersCount, newRidersCount, pendingRidersCount, totalNewRidersCount, ridesCount] =
      await Promise.all([
        User.countDocuments({ role: "user" }),
        User.countDocuments({ role: "rider", approvalStatus: "approved" }),
        Rider.countDocuments({ status: "approved" }),
        Rider.countDocuments({ status: "pending" }),
        Rider.countDocuments(), // Total riders from new collection
        Ride.countDocuments(),
      ]);

    const totalRiders = oldRidersCount + totalNewRidersCount;

    res.json({
      success: true,
      data: {
        users: usersCount,
        riders: totalRiders,
        captains: totalRiders,
        approvedRiders: newRidersCount,
        pendingCaptains: pendingRidersCount,
        rides: ridesCount,
      },
    });
  } catch (err) {
    console.error("Overview error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🔹 Get all users
router.get("/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).select("-otp -otpExpires").sort({ createdAt: -1 });
    console.log("📊 Fetched users:", users.length);
    res.json({ success: true, users });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🔹 Get all riders from users collection (old system)
router.get("/user-riders", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userRiders = await User.find({ role: "rider" }).select("-otp -otpExpires").sort({ createdAt: -1 });
    console.log("📊 Fetched user riders:", userRiders.length);
    res.json({ success: true, riders: userRiders });
  } catch (err) {
    console.error("Get user riders error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🔹 Test route for debugging
router.get("/test-query", authenticateToken, requireAdmin, async (req, res) => {
  res.json({ 
    success: true, 
    query: req.query,
    status: req.query.status,
    statusType: typeof req.query.status
  });
});

// 🔹 Migrate riders from users collection to riders collection
router.post("/migrate-riders", authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🔄 Starting rider migration...');
    
    // Get all riders from users collection
    const userRiders = await User.find({ role: 'rider' });
    console.log(`📊 Found ${userRiders.length} riders in users collection`);
    
    const migratedRiders = [];
    const errors = [];
    
    for (const userRider of userRiders) {
      try {
        // Check if rider already exists in riders collection
        const existingRider = await Rider.findOne({ 
          $or: [
            { email: userRider.email },
            { mobile: userRider.mobile }
          ]
        });
        
        if (existingRider) {
          console.log(`⚠️ Rider ${userRider.fullName} already exists in riders collection, skipping...`);
          continue;
        }
        
        // Extract first and last name from fullName
        const nameParts = userRider.fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Convert documents format from old to new
        const documents = {};
        if (userRider.documents) {
          Object.keys(userRider.documents).forEach(key => {
            if (userRider.documents[key] && userRider.documents[key].url) {
              // Map old document keys to new format
              const newKey = key === 'panCard' ? 'panDocument' : 
                           key === 'aadharFront' ? 'aadharFront' :
                           key === 'aadharBack' ? 'aadharBack' :
                           key === 'license' ? 'license' :
                           key === 'rc' ? 'rc' : key;
              documents[newKey] = userRider.documents[key].url;
            }
          });
        }
        
        // Create new rider in riders collection
        const newRider = new Rider({
          firstName: firstName,
          lastName: lastName,
          email: userRider.email,
          mobile: userRider.mobile,
          panNumber: userRider.panNumber || 'NOT_PROVIDED',
          aadharNumber: userRider.aadharNumber || 'NOT_PROVIDED',
          licenseNumber: userRider.licenseNumber || 'NOT_PROVIDED',
          vehicleNumber: userRider.vehicleNumber || 'NOT_PROVIDED',
          status: userRider.approvalStatus || 'pending',
          documents: documents,
          adminNotes: `Migrated from users collection - ${userRider.approvalStatus}`,
          approvedBy: userRider.approvalStatus === 'approved' ? 'migration' : null,
          approvedAt: userRider.approvalStatus === 'approved' ? new Date() : null,
          createdAt: userRider.createdAt,
          updatedAt: new Date()
        });
        
        await newRider.save();
        migratedRiders.push({
          name: userRider.fullName,
          email: userRider.email,
          status: userRider.approvalStatus
        });
        console.log(`✅ Migrated ${userRider.fullName} (${userRider.email}) to riders collection`);
        
      } catch (error) {
        console.error(`❌ Error migrating ${userRider.fullName}:`, error.message);
        errors.push({
          name: userRider.fullName,
          error: error.message
        });
      }
    }
    
    console.log(`📊 Migration completed: ${migratedRiders.length} riders migrated, ${errors.length} errors`);
    
    res.json({
      success: true,
      message: `Migration completed: ${migratedRiders.length} riders migrated`,
      migratedRiders,
      errors,
      total: userRiders.length
    });
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message
    });
  }
});

// 🔹 Get all riders with optional status filter
router.get("/riders", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    
    console.log('🔍 Admin riders request - Full query object:', req.query);
    console.log('🔍 Admin riders request - status filter:', status);
    console.log('🔍 Admin riders request - status type:', typeof status);
    
    // Filter by status if provided
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
      console.log('✅ Applied status filter:', query);
    } else {
      console.log('⚠️ No valid status filter applied, showing all riders');
      console.log('⚠️ Status value:', status, 'Type:', typeof status);
    }
    
    const riders = await Rider.find(query).sort({ createdAt: -1 });
    console.log(`📊 Fetched riders (status: ${status || 'all'}):`, riders.length);
    console.log('📋 Riders statuses:', riders.map(r => `${r.firstName} ${r.lastName}: ${r.status}`));
    res.json({ success: true, riders });
  } catch (err) {
    console.error("Get riders error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🔹 Update rider status
router.put("/riders/:id/status", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, adminNotes, rejectionReason } = req.body;
    
    // Prepare update data without approvedBy (since admin-001 is not a valid ObjectId)
    const updateData = { 
      status, 
      adminNotes: adminNotes || '', 
      rejectionReason: rejectionReason || '',
      updatedAt: new Date()
    };
    
    // Only add approvedBy and approvedAt if status is approved
    if (status === 'approved') {
      updateData.approvedAt = new Date();
      updateData.approvedBy = 'admin-001'; // Set as string since we changed the model
    }
    
    const rider = await Rider.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!rider) {
      return res.status(404).json({ success: false, message: "Rider not found" });
    }
    
    console.log("✅ Updated rider status:", rider._id, "to", status);
    res.json({ success: true, message: `Rider ${status} successfully`, rider });
  } catch (err) {
    console.error("Update rider status error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🔹 Approved captains
router.get("/captains", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const captains = await User.find({ role: "rider", approvalStatus: "approved" }).select("-otp -otpExpires");
    res.json({ success: true, data: captains });
  } catch (err) {
    console.error("Get captains error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🔹 Pending captains
router.get("/pending-captains", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const pending = await User.find({ role: "rider", approvalStatus: "pending" }).select("-otp -otpExpires");
    res.json({ success: true, data: pending });
  } catch (err) {
    console.error("Get pending captains error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🔹 Approve captain
router.post("/captain/:id/approve", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const captain = await User.findById(req.params.id);
    if (!captain) return res.status(404).json({ success: false, message: "Captain not found" });
    captain.approvalStatus = "approved";
    await captain.save();
    res.json({ success: true, message: "Captain approved", data: captain });
  } catch (err) {
    console.error("Approve captain error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🔹 Reject captain
router.post("/captain/:id/reject", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const captain = await User.findById(req.params.id);
    if (!captain) return res.status(404).json({ success: false, message: "Captain not found" });
    captain.approvalStatus = "rejected";
    await captain.save();
    res.json({ success: true, message: "Captain rejected", data: captain });
  } catch (err) {
    console.error("Reject captain error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🔹 Get all rides
router.get("/rides", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const rides = await Ride.find()
      .populate("riderId", "fullName mobile")
      .populate("captainId", "fullName mobile")
      .sort({ createdAt: -1 });
    console.log("📊 Fetched rides:", rides.length);
    res.json({ success: true, rides });
  } catch (err) {
    console.error("Get rides error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ===================== 🚨 SOS ROUTES =====================

// 🔹 Get all SOS alerts
router.get("/sos-alerts", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const alerts = await SOS.find()
      .populate("userId", "fullName email mobile")
      .sort({ createdAt: -1 });
    console.log("📊 Fetched SOS alerts:", alerts.length);
    res.json({ success: true, alerts });
  } catch (err) {
    console.error("Get SOS alerts error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🔹 Resolve SOS alert
router.put("/sos/:id/resolve", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const sos = await SOS.findByIdAndUpdate(req.params.id, { status: "resolved" }, { new: true });
    if (!sos) return res.status(404).json({ success: false, message: "SOS not found" });
    res.json({ success: true, message: "SOS resolved", data: sos });
  } catch (err) {
    console.error("Resolve SOS error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
