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

// Fix rider data
const fixRiderData = async () => {
  try {
    await connectDB();
    
    console.log('🔍 Current riders in database:');
    const allRiders = await Rider.find({});
    allRiders.forEach((rider, index) => {
      console.log(`${index + 1}. ${rider.firstName} ${rider.lastName} - ${rider.email} - Status: ${rider.status}`);
    });
    
    // Remove Alice Johnson dummy data
    const aliceRider = await Rider.findOne({ email: 'alice.johnson@example.com' });
    if (aliceRider) {
      await Rider.findByIdAndDelete(aliceRider._id);
      console.log('✅ Removed Alice Johnson dummy data');
    } else {
      console.log('ℹ️ Alice Johnson not found');
    }
    
    // Set rider 123 to pending since it wasn't actually approved
    const rider123 = await Rider.findOne({ email: 'rider123@gmail.com' });
    if (rider123) {
      await Rider.findByIdAndUpdate(rider123._id, {
        status: 'pending',
        adminNotes: '',
        approvedBy: null,
        approvedAt: null
      });
      console.log('✅ Set rider 123 status to pending');
    } else {
      console.log('ℹ️ rider 123 not found');
    }
    
    console.log('\n📊 Updated riders:');
    const updatedRiders = await Rider.find({});
    updatedRiders.forEach((rider, index) => {
      console.log(`${index + 1}. ${rider.firstName} ${rider.lastName} - ${rider.email} - Status: ${rider.status}`);
    });
    
    const pendingCount = updatedRiders.filter(r => r.status === 'pending').length;
    const approvedCount = updatedRiders.filter(r => r.status === 'approved').length;
    
    console.log(`\n📈 Summary:`);
    console.log(`- Pending riders: ${pendingCount}`);
    console.log(`- Approved riders: ${approvedCount}`);
    console.log(`- Total riders: ${updatedRiders.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing rider data:', error);
    process.exit(1);
  }
};

// Run the script
fixRiderData();
