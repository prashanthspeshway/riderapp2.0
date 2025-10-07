const mongoose = require('mongoose');
const Rider = require('./src/models/Rider');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/rideshare', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Create a pending rider
const createPendingRider = async () => {
  try {
    await connectDB();
    
    // Create new pending rider
    const pendingRider = new Rider({
      firstName: 'Pending',
      lastName: 'TestRider',
      email: 'pending.test@example.com',
      mobile: '9876543211',
      panNumber: 'PENDING1234F',
      aadharNumber: '123456789013',
      licenseNumber: 'DL123456790',
      vehicleNumber: 'KA01AB5678',
      status: 'pending',
      documents: {
        panDocument: 'https://example.com/pan.pdf',
        aadharFront: 'https://example.com/aadhar-front.jpg',
        aadharBack: 'https://example.com/aadhar-back.jpg',
        license: 'https://example.com/license.pdf',
        rc: 'https://example.com/rc.pdf',
        bikeFront: 'https://example.com/bike-front.jpg',
        bikeBack: 'https://example.com/bike-back.jpg'
      }
    });
    
    await pendingRider.save();
    console.log('✅ Pending rider created successfully:', pendingRider._id);
    console.log('Name:', pendingRider.firstName, pendingRider.lastName);
    console.log('Status:', pendingRider.status);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating pending rider:', error);
    process.exit(1);
  }
};

// Run the script
createPendingRider();
