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
      ifsc,
      accountNumber,
      panNumber,
      aadharNumber,
      licenseNumber,
      vehicleNumber,
      vehicleType
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !mobile || !panNumber || !aadharNumber || !licenseNumber || !vehicleNumber) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if rider already exists
    const existingRider = await Rider.findOne({
      $or: [
        { email: email.toLowerCase() },
        { mobile },
        { panNumber: panNumber.toUpperCase() },
        { aadharNumber },
        { licenseNumber: licenseNumber.toUpperCase() },
        { vehicleNumber: vehicleNumber.toUpperCase() }
      ]
    });

    if (existingRider) {
      let conflictField = '';
      if (existingRider.email === email.toLowerCase()) conflictField = 'Email';
      else if (existingRider.mobile === mobile) conflictField = 'Mobile';
      else if (existingRider.panNumber === panNumber.toUpperCase()) conflictField = 'PAN Number';
      else if (existingRider.aadharNumber === aadharNumber) conflictField = 'Aadhar Number';
      else if (existingRider.licenseNumber === licenseNumber.toUpperCase()) conflictField = 'License Number';
      else if (existingRider.vehicleNumber === vehicleNumber.toUpperCase()) conflictField = 'Vehicle Number';

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
      ifsc: ifsc ? ifsc.toUpperCase().trim() : '',
      accountNumber: accountNumber ? accountNumber.trim() : '',
      panNumber: panNumber.toUpperCase().trim(),
      aadharNumber: aadharNumber.trim(),
      licenseNumber: licenseNumber.toUpperCase().trim(),
      vehicleNumber: vehicleNumber.toUpperCase().trim(),
      vehicleType: vehicleType ? String(vehicleType).toLowerCase().trim() : '',
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

module.exports = {
  registerRider,
  getAllRiders,
  getRiderById,
  updateRiderStatus,
  deleteRider,
  uploadMultiple,
  getRiderStatus,
  updateRiderOnlineStatus
};
