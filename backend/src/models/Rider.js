const mongoose = require('mongoose');

const riderSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  mobile: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^\d{10}$/, 'Invalid mobile number']
  },
  // Additional personal and bank details
  address: {
    type: String,
    default: '',
    trim: true
  },
  gender: {
    type: String,
    default: '',
    trim: true
  },
  ifsc: {
    type: String,
    default: '',
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{4}0[A-Z0-9]{6}$/i, 'Invalid IFSC code']
  },
  accountNumber: {
    type: String,
    default: '',
    trim: true,
    match: [/^\d{9,18}$/, 'Invalid account number']
  },
  password: {
    type: String,
    required: false, // Password will be set when admin approves
    minlength: [6, "Password must be at least 6 characters"]
  },
  panNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN number']
  },
  aadharNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^\d{12}$/, 'Invalid Aadhar number']
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  vehicleNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: /^\d{12,18}$/
  },
  // Selected vehicle type (code from VehicleType collection)
  vehicleType: {
    type: String,
    default: '',
    trim: true,
    lowercase: true
  },
  // Emergency contact number
  emergencyContact: {
    type: String,
    default: '',
    trim: true,
    match: /^\d{10}$/
  },
  // Rider profile picture (Cloudinary URL)
  profilePicture: {
    type: String,
    default: null
  },
  // Vehicle details (optional)
  vehicleMake: {
    type: String,
    default: ''
  },
  vehicleModel: {
    type: String,
    default: ''
  },
  // Document URLs stored in Cloudinary
  documents: {
    panDocument: {
      type: String,
      default: null
    },
    aadharFront: {
      type: String,
      default: null
    },
    aadharBack: {
      type: String,
      default: null
    },
    license: {
      type: String,
      default: null
    },
    rc: {
      type: String,
      default: null
    },
    bikeFront: {
      type: String,
      default: null
    },
    bikeBack: {
      type: String,
      default: null
    }
  },
  // Registration status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  // Admin notes
  adminNotes: {
    type: String,
    default: ''
  },
  // Approval details
  approvedBy: {
    type: String,
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  // Login tracking
  loginCount: {
    type: Number,
    default: 0
  },
  lastLogin: {
    type: Date,
    default: null
  },
  // Online status
  isOnline: {
    type: Boolean,
    default: false
  },
  isAvailable: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better query performance
riderSchema.index({ email: 1 });
riderSchema.index({ mobile: 1 });
riderSchema.index({ status: 1 });
riderSchema.index({ createdAt: -1 });

// Virtual for full name
riderSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for document completion status
riderSchema.virtual('documentsComplete').get(function() {
  const docs = this.documents;
  return docs.panDocument && docs.aadharFront && docs.aadharBack && 
         docs.license && docs.rc && docs.bikeFront && docs.bikeBack;
});

// Method to get document count
riderSchema.methods.getDocumentCount = function() {
  const docs = this.documents;
  let count = 0;
  Object.values(docs).forEach(doc => {
    if (doc) count++;
  });
  return count;
};

// Method to check if all required documents are uploaded
riderSchema.methods.hasAllDocuments = function() {
  const requiredDocs = ['panDocument', 'aadharFront', 'aadharBack', 'license', 'rc', 'bikeFront', 'bikeBack'];
  return requiredDocs.every(doc => this.documents[doc]);
};

module.exports = mongoose.model('Rider', riderSchema);
