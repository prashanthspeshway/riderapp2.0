const mongoose = require('mongoose');
const Rider = require('./src/models/Rider');
const User = require('./src/models/User');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/rider_app', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Clean up test data
const cleanupTestData = async () => {
  try {
    await connectDB();
    
    // Remove test riders (Alice Johnson, rider123, etc.)
    const testRiders = await Rider.find({
      $or: [
        { firstName: { $regex: /alice/i } },
        { lastName: { $regex: /johnson/i } },
        { email: { $regex: /alice\.johnson/i } },
        { email: { $regex: /rider123/i } },
        { mobile: '9876543212' },
        { mobile: '9009009000' }
      ]
    });
    
    console.log(`Found ${testRiders.length} test riders to remove:`);
    testRiders.forEach(rider => {
      console.log(`- ${rider.firstName} ${rider.lastName} (${rider.email})`);
    });
    
    if (testRiders.length > 0) {
      const result = await Rider.deleteMany({
        _id: { $in: testRiders.map(r => r._id) }
      });
      console.log(`✅ Removed ${result.deletedCount} test riders`);
    } else {
      console.log('✅ No test riders found');
    }
    
    // Remove test users
    const testUsers = await User.find({
      $or: [
        { fullName: { $regex: /alice/i } },
        { fullName: { $regex: /johnson/i } },
        { email: { $regex: /alice\.johnson/i } },
        { email: { $regex: /rider123/i } },
        { mobile: '9876543212' },
        { mobile: '9009009000' }
      ]
    });
    
    console.log(`Found ${testUsers.length} test users to remove:`);
    testUsers.forEach(user => {
      console.log(`- ${user.fullName} (${user.email || user.mobile})`);
    });
    
    if (testUsers.length > 0) {
      const result = await User.deleteMany({
        _id: { $in: testUsers.map(u => u._id) }
      });
      console.log(`✅ Removed ${result.deletedCount} test users`);
    } else {
      console.log('✅ No test users found');
    }
    
    console.log('✅ Cleanup completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    process.exit(1);
  }
};

// Run cleanup
cleanupTestData();
