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
    trim: true
  },
  panNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  aadharNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
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
    uppercase: true
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
