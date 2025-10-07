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

// Create a test pending rider
const createTestRider = async () => {
  try {
    await connectDB();
    
    // Check if test rider already exists
    const existingRider = await Rider.findOne({ email: 'test.rider@example.com' });
    if (existingRider) {
      console.log('✅ Test rider already exists:', existingRider.firstName, existingRider.lastName);
      console.log('Status:', existingRider.status);
      return;
    }
    
    // Create new test rider
    const testRider = new Rider({
      firstName: 'Test',
      lastName: 'Rider',
      email: 'test.rider@example.com',
      mobile: '9876543210',
      panNumber: 'ABCDE1234F',
      aadharNumber: '123456789012',
      licenseNumber: 'DL123456789',
      vehicleNumber: 'KA01AB1234',
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
    
    await testRider.save();
    console.log('✅ Test rider created successfully:', testRider._id);
    console.log('Name:', testRider.firstName, testRider.lastName);
    console.log('Status:', testRider.status);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test rider:', error);
    process.exit(1);
  }
};

// Run the script
createTestRider();
