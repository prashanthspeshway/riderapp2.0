const Rider = require('../models/Rider');
const User = require('../models/User');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and PDF files are allowed'), false);
    }
  }
});

// Upload multiple files middleware - more flexible configuration
const uploadMultiple = upload.any();

// Helper function to upload file to Cloudinary
const uploadToCloudinary = async (file, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `riders/${folder}`,
        resource_type: 'auto'
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('✅ Cloudinary upload successful:', result.secure_url);
          resolve(result.secure_url);
        }
      }
    );
    
    uploadStream.end(file.buffer);
  });
};

// Register new rider
const registerRider = async (req, res) => {
  try {
    console.log('🚗 New rider registration request');
    console.log('📝 Form data:', req.body);
    console.log('📁 Files received:', req.files ? req.files.length : 0);
    if (req.files) {
      req.files.forEach((file, index) => {
        console.log(`📁 File ${index + 1}:`, {
          fieldname: file.fieldname,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        });
      });
    }

    const {
      firstName,
      lastName,
      email,
      mobile,
      address,
      gender,
      emergencyContact,
      ifsc,
      accountNumber,
      panNumber,
      aadharNumber,
      licenseNumber,
      vehicleNumber,
      rcNumber,
      vehicleType,
      vehicleMake,
      vehicleModel
    } = req.body;

    const normalizedRc = (rcNumber || vehicleNumber || '').trim();

    // Validate required fields
    if (!firstName || !lastName || !email || !mobile || !panNumber || !aadharNumber || !licenseNumber || !normalizedRc) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Format validations
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    const aadharRegex = /^\d{12}$/;
    const mobileRegex = /^\d{10}$/;
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/i;
    const accountRegex = /^\d{9,18}$/;
    const rcRegex = /^\d{12,18}$/;

    if (!panRegex.test(String(panNumber).toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Invalid PAN number format' });
    }
    if (!aadharRegex.test(String(aadharNumber))) {
      return res.status(400).json({ success: false, message: 'Invalid Aadhar number format' });
    }
    if (!mobileRegex.test(String(mobile))) {
      return res.status(400).json({ success: false, message: 'Invalid mobile number format' });
    }
    if (emergencyContact && !/^\d{10}$/.test(String(emergencyContact))) {
      return res.status(400).json({ success: false, message: 'Invalid emergency contact format' });
    }
    if (ifsc && !ifscRegex.test(String(ifsc))) {
      return res.status(400).json({ success: false, message: 'Invalid IFSC code format' });
    }
    if (accountNumber && !accountRegex.test(String(accountNumber))) {
      return res.status(400).json({ success: false, message: 'Invalid account number format' });
    }
    if (!rcRegex.test(String(normalizedRc))) {
      return res.status(400).json({ success: false, message: 'RC number must be 12–18 digits' });
    }

    // Check if rider already exists
    const existingRider = await Rider.findOne({
      $or: [
        { email: email.toLowerCase() },
        { mobile },
        { panNumber: panNumber.toUpperCase() },
        { aadharNumber },
        { licenseNumber: licenseNumber.toUpperCase() },
        { vehicleNumber: normalizedRc }
      ]
    });

    if (existingRider) {
      let conflictField = '';
      if (existingRider.email === email.toLowerCase()) conflictField = 'Email';
      else if (existingRider.mobile === mobile) conflictField = 'Mobile';
      else if (existingRider.panNumber === panNumber.toUpperCase()) conflictField = 'PAN Number';
      else if (existingRider.aadharNumber === aadharNumber) conflictField = 'Aadhar Number';
      else if (existingRider.licenseNumber === licenseNumber.toUpperCase()) conflictField = 'License Number';
      else if (existingRider.vehicleNumber === normalizedRc) conflictField = 'RC Number';

      return res.status(400).json({
        success: false,
        message: `${conflictField} already exists`
      });
    }

    // Upload documents to Cloudinary
    const documents = {};
    const uploadPromises = [];
    let profilePictureUrl = null;

    if (req.files && req.files.length > 0) {
      const folder = `${email.toLowerCase().replace('@', '_at_')}_${Date.now()}`;
      
      for (const file of req.files) {
        const fieldName = file.fieldname;
        uploadPromises.push(
          uploadToCloudinary(file, folder)
            .then(url => {
              // Store URL either in documents or top-level profilePicture
              if (fieldName === 'profilePicture') {
                profilePictureUrl = url;
              } else {
                documents[fieldName] = url;
              }
              console.log(`✅ Uploaded ${fieldName}: ${url}`);
            })
            .catch(error => {
              console.error(`❌ Error uploading ${fieldName}:`, error);
              throw new Error(`Failed to upload ${fieldName}`);
            })
        );
      }
    }

    // Wait for all uploads to complete
    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
    }

    // Create rider record
    const rider = new Rider({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      mobile: mobile.trim(),
      address: address ? address.trim() : '',
      gender: gender ? gender.trim() : '',
      emergencyContact: emergencyContact ? String(emergencyContact).trim() : '',
      ifsc: ifsc ? ifsc.toUpperCase().trim() : '',
      accountNumber: accountNumber ? accountNumber.trim() : '',
      panNumber: panNumber.toUpperCase().trim(),
      aadharNumber: aadharNumber.trim(),
      licenseNumber: licenseNumber.toUpperCase().trim(),
      vehicleNumber: normalizedRc,
      vehicleType: vehicleType ? String(vehicleType).toLowerCase().trim() : '',
      vehicleMake: vehicleMake ? vehicleMake.trim() : '',
      vehicleModel: vehicleModel ? vehicleModel.trim() : '',
      documents,
      profilePicture: profilePictureUrl,
      status: 'pending'
    });

    await rider.save();

    console.log('✅ Rider registered successfully:', rider._id);

    res.status(201).json({
      success: true,
      message: 'Rider registration submitted successfully. Please wait for admin approval.',
      rider: {
        id: rider._id,
        name: rider.fullName,
        email: rider.email,
        mobile: rider.mobile,
        status: rider.status,
        documentsUploaded: rider.getDocumentCount(),
        documentsComplete: rider.hasAllDocuments(),
        submittedAt: rider.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Rider registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get all riders (for admin)
const getAllRiders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const query = {};

    // Filter by status
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { panNumber: { $regex: search, $options: 'i' } },
        { licenseNumber: { $regex: search, $options: 'i' } },
        { vehicleNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const riders = await Rider.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Rider.countDocuments(query);

    res.json({
      success: true,
      riders,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('❌ Get riders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch riders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get single rider
const getRiderById = async (req, res) => {
  try {
    const { id } = req.params;
    const rider = await Rider.findById(id);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'Rider not found'
      });
    }

    res.json({
      success: true,
      rider
    });

  } catch (error) {
    console.error('❌ Get rider error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rider',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update rider status (admin only)
const updateRiderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, rejectionReason } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const updateData = {
      status,
      adminNotes: adminNotes || '',
      approvedBy: req.user.id
    };

    if (status === 'approved') {
      updateData.approvedAt = new Date();
    } else if (status === 'rejected') {
      updateData.rejectedAt = new Date();
      updateData.rejectionReason = rejectionReason || '';
    }

    const rider = await Rider.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'Rider not found'
      });
    }

    console.log(`✅ Rider ${id} status updated to ${status}`);

    res.json({
      success: true,
      message: `Rider ${status} successfully`,
      rider: {
        id: rider._id,
        name: rider.fullName,
        status: rider.status,
        adminNotes: rider.adminNotes,
        approvedAt: rider.approvedAt,
        rejectedAt: rider.rejectedAt,
        rejectionReason: rider.rejectionReason
      }
    });

  } catch (error) {
    console.error('❌ Update rider status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update rider status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete rider (admin only)
const deleteRider = async (req, res) => {
  try {
    const { id } = req.params;
    const rider = await Rider.findByIdAndDelete(id);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'Rider not found'
      });
    }

    // TODO: Delete documents from Cloudinary
    console.log(`✅ Rider ${id} deleted`);

    res.json({
      success: true,
      message: 'Rider deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete rider error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete rider',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get rider's own status and profile
const getRiderStatus = async (req, res) => {
  try {
    const riderId = req.user._id; // From JWT token (normalized)
    console.log('🔍 Getting rider status for ID:', riderId);

    // Check Rider collection only
    const rider = await Rider.findById(riderId);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found"
      });
    }

    // Return rider data from riders collection
    const riderData = {
      _id: rider._id,
      firstName: rider.firstName,
      lastName: rider.lastName,
      email: rider.email,
      mobile: rider.mobile,
      status: rider.status,
      isOnline: rider.isOnline || false,
      isAvailable: rider.isAvailable || false,
      profilePicture: rider.profilePicture,
      createdAt: rider.createdAt,
      updatedAt: rider.updatedAt
    };

    console.log('✅ Rider status retrieved:', riderData.firstName, riderData.status);
    res.json({
      success: true,
      rider: riderData
    });

  } catch (error) {
    console.error('❌ Get rider status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get rider status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update rider's online status
const updateRiderOnlineStatus = async (req, res) => {
  try {
    const riderId = req.user._id; // From JWT token (normalized)
    const { isOnline, isAvailable } = req.body;
    
    console.log('🔍 Updating rider online status for ID:', riderId, 'isOnline:', isOnline);

    // Check Rider collection only
    const rider = await Rider.findById(riderId);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found"
      });
    }

    // Update the appropriate fields
    if (isOnline !== undefined) {
      rider.isOnline = isOnline;
    }
    if (isAvailable !== undefined) {
      rider.isAvailable = isAvailable;
    }
    
    rider.updatedAt = new Date();
    await rider.save();

    console.log('✅ Rider online status updated:', rider.firstName || rider.fullName, 'isOnline:', rider.isOnline);
    res.json({
      success: true,
      message: "Rider status updated successfully",
      rider: {
        _id: rider._id,
        isOnline: rider.isOnline,
        isAvailable: rider.isAvailable
      }
    });

  } catch (error) {
    console.error('❌ Update rider online status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update rider online status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get riders by vehicle type (for admin)
const getRidersByVehicleType = async (req, res) => {
  try {
    const { vehicleType } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    
    const query = { vehicleType: vehicleType.toLowerCase() };
    
    // Filter by status if provided
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }

    const riders = await Rider.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Rider.countDocuments(query);

    res.json({
      success: true,
      vehicleType,
      riders,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('❌ Get riders by vehicle type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch riders by vehicle type',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get vehicle type statistics (for admin dashboard)
const getVehicleTypeStats = async (req, res) => {
  try {
    const stats = await Rider.aggregate([
      {
        $group: {
          _id: '$vehicleType',
          total: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get all vehicle types from VehicleType collection for complete data
    const VehicleType = require('../models/VehicleType');
    const allVehicleTypes = await VehicleType.find({ active: true }).select('code name seats ac');
    
    // Merge stats with vehicle type details
    const vehicleStats = allVehicleTypes.map(vt => {
      const stat = stats.find(s => s._id === vt.code) || {
        _id: vt.code,
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0
      };
      
      return {
        vehicleType: vt.code,
        name: vt.name,
        seats: vt.seats,
        ac: vt.ac,
        ...stat
      };
    });

    res.json({
      success: true,
      vehicleStats
    });

  } catch (error) {
    console.error('❌ Get vehicle type stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vehicle type statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update rider's location (for real-time tracking)
const updateRiderLocation = async (req, res) => {
  try {
    const riderId = req.user._id; // From JWT token (normalized)
    const { lat, lng, address } = req.body;
    
    console.log('📍 Updating rider location for ID:', riderId, 'Lat:', lat, 'Lng:', lng);

    // Check Rider collection
    const rider = await Rider.findById(riderId);

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found"
      });
    }

    // Also update in User collection for riders that are users
    const user = await User.findById(riderId);
    if (user) {
      user.currentLocation = {
        lat,
        lng,
        address: address || '',
        lastUpdated: new Date()
      };
      await user.save();
      console.log('✅ Updated location in User collection');
    }

    // Update location in Rider collection
    rider.currentLocation = {
      lat,
      lng,
      address: address || '',
      lastUpdated: new Date()
    };
    await rider.save();

    console.log('✅ Rider location updated successfully');
    res.json({
      success: true,
      message: "Location updated successfully",
      location: {
        lat,
        lng,
        address: address || ''
      }
    });

  } catch (error) {
    console.error('❌ Update rider location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update rider location',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  registerRider,
  getAllRiders,
  getRiderById,
  updateRiderStatus,
  deleteRider,
  uploadMultiple,
  getRiderStatus,
  updateRiderOnlineStatus,
  getRidersByVehicleType,
  getVehicleTypeStats,
  updateRiderLocation
};
