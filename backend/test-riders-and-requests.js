const mongoose = require('mongoose');
const config = require('./src/config/config');

const User = require('./src/models/User');
const Rider = require('./src/models/Rider');

async function checkAndCreateTestRiders() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("✅ Connected to MongoDB");

    // Check if riders exist in User collection
    const userRiders = await User.find({ role: 'rider' });
    console.log(`\n👥 Found ${userRiders.length} riders in User collection`);
    
    // Check if riders exist in Rider collection
    const riderCollection = await Rider.find({});
    console.log(`👥 Found ${riderCollection.length} riders in Rider collection`);

    // Check online riders
    const onlineUserRiders = await User.find({ role: 'rider', isOnline: true });
    console.log(`\n🟢 Found ${onlineUserRiders.length} online riders in User collection`);
    
    const onlineRiderCollection = await Rider.find({ isOnline: true });
    console.log(`🟢 Found ${onlineRiderCollection.length} online riders in Rider collection`);

    // If no riders exist, create test rider
    if (userRiders.length === 0 && riderCollection.length === 0) {
      console.log("\n⚠️ No riders found. Creating test rider...");
      
      // Create test user rider
      const testRider = new User({
        fullName: 'Test Rider',
        mobile: '9876543210',
        email: 'testrider@test.com',
        role: 'rider',
        isOnline: true,
        isAvailable: true,
        approvalStatus: 'approved',
        vehicleType: 'car',
        rating: 4.8,
        totalRides: 50,
        currentLocation: {
          lat: 17.385044,
          lng: 78.486671,
          address: 'Hitech City, Hyderabad',
          lastUpdated: new Date()
        }
      });

      await testRider.save();
      console.log(`✅ Created test rider with ID: ${testRider._id}`);
      console.log(`   Name: ${testRider.fullName}`);
      console.log(`   Mobile: ${testRider.mobile}`);
      console.log(`   Vehicle Type: ${testRider.vehicleType}`);
      console.log(`   Is Online: ${testRider.isOnline}`);
      console.log(`   Location: ${testRider.currentLocation.lat}, ${testRider.currentLocation.lng}`);
    }

    // If riders exist but none are online, set one to online
    if (onlineUserRiders.length === 0 && userRiders.length > 0) {
      console.log("\n⚠️ No online riders. Setting first rider to online...");
      const rider = userRiders[0];
      
      // Ensure rider has a location
      if (!rider.currentLocation) {
        rider.currentLocation = {
          lat: 17.385044,
          lng: 78.486671,
          address: 'Hitech City, Hyderabad',
          lastUpdated: new Date()
        };
      }
      
      await User.findByIdAndUpdate(rider._id, {
        isOnline: true,
        isAvailable: true,
        approvalStatus: 'approved',
        currentLocation: rider.currentLocation
      });
      
      console.log(`✅ Set rider ${rider.fullName || rider.mobile} to online`);
    }

    // Check Rider collection
    if (onlineRiderCollection.length === 0 && riderCollection.length > 0) {
      console.log("\n⚠️ Setting rider from Rider collection to online...");
      const rider = riderCollection[0];
      
      if (!rider.currentLocation) {
        rider.currentLocation = {
          lat: 17.385044,
          lng: 78.486671,
          address: 'Hitech City, Hyderabad',
          lastUpdated: new Date()
        };
      }
      
      await Rider.findByIdAndUpdate(rider._id, {
        isOnline: true,
        isAvailable: true,
        status: 'approved',
        currentLocation: rider.currentLocation
      });
      
      console.log(`✅ Set rider ${rider.firstName || rider.mobile} to online`);
    }

    // Final check
    const finalUserRiders = await User.find({ role: 'rider', isOnline: true });
    const finalRiderCollection = await Rider.find({ isOnline: true });
    
    console.log(`\n✅ FINAL STATUS:`);
    console.log(`   Online User Riders: ${finalUserRiders.length}`);
    console.log(`   Online Rider Collection: ${finalRiderCollection.length}`);
    
    finalUserRiders.forEach(rider => {
      console.log(`\n   📍 User Rider:`);
      console.log(`      ID: ${rider._id}`);
      console.log(`      Name: ${rider.fullName || 'N/A'}`);
      console.log(`      Mobile: ${rider.mobile}`);
      console.log(`      Vehicle Type: ${rider.vehicleType || 'N/A'}`);
      console.log(`      Location: ${rider.currentLocation?.lat || 'N/A'}, ${rider.currentLocation?.lng || 'N/A'}`);
    });
    
    finalRiderCollection.forEach(rider => {
      console.log(`\n   📍 Rider Collection:`);
      console.log(`      ID: ${rider._id}`);
      console.log(`      Name: ${rider.firstName} ${rider.lastName}`);
      console.log(`      Mobile: ${rider.mobile}`);
      console.log(`      Vehicle Type: ${rider.vehicleType || 'N/A'}`);
      console.log(`      Location: ${rider.currentLocation?.lat || 'N/A'}, ${rider.currentLocation?.lng || 'N/A'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkAndCreateTestRiders();

