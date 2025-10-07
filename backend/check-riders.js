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

// Check existing riders
const checkRiders = async () => {
  try {
    await connectDB();
    
    const allRiders = await Rider.find({});
    console.log(`📊 Total riders in database: ${allRiders.length}`);
    
    if (allRiders.length > 0) {
      console.log('\n📋 All riders:');
      allRiders.forEach((rider, index) => {
        console.log(`${index + 1}. ${rider.firstName} ${rider.lastName} - ${rider.email} - Status: ${rider.status}`);
      });
      
      const pendingRiders = allRiders.filter(rider => rider.status === 'pending');
      const approvedRiders = allRiders.filter(rider => rider.status === 'approved');
      const rejectedRiders = allRiders.filter(rider => rider.status === 'rejected');
      
      console.log(`\n📊 Status breakdown:`);
      console.log(`- Pending: ${pendingRiders.length}`);
      console.log(`- Approved: ${approvedRiders.length}`);
      console.log(`- Rejected: ${rejectedRiders.length}`);
    } else {
      console.log('❌ No riders found in database');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking riders:', error);
    process.exit(1);
  }
};

// Run the script
checkRiders();
