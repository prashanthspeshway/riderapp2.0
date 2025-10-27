const mongoose = require('mongoose');
const config = require('./src/config/config');
const Rider = require('./src/models/Rider');
const User = require('./src/models/User');

async function createUserFromRiders() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("✅ Connected to MongoDB");

    // Get all approved riders from Rider collection
    const riders = await Rider.find({ status: 'approved' });
    console.log(`\n👥 Found ${riders.length} approved riders`);

    for (const rider of riders) {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ mobile: rider.mobile }, { email: rider.email || 'rider' + rider.mobile + '@temp.com' }]
      });

      if (!existingUser) {
        // Create User entry from Rider
        const user = new User({
          fullName: `${rider.firstName} ${rider.lastName}`.trim(),
          mobile: rider.mobile,
          email: rider.email || `rider${rider.mobile}@temp.com`,
          role: 'rider',
          isOnline: rider.isOnline || false,
          isAvailable: rider.isAvailable || false,
          approvalStatus: rider.status || 'approved',
          rating: 4.8,
          totalRides: 50,
          vehicleType: rider.vehicleType || 'car',
          currentLocation: rider.currentLocation || {
            lat: 17.385044,
            lng: 78.486671,
            address: 'Hitech City, Hyderabad',
            lastUpdated: new Date()
          },
          isActive: true
        });

        await user.save();
        console.log(`✅ Created user for rider: ${rider.firstName} ${rider.lastName} (ID: ${user._id})`);
      } else {
        console.log(`⚠️ User already exists for rider: ${rider.firstName} ${rider.lastName}`);
      }
    }

    // Final check
    const userRiders = await User.find({ role: 'rider', isOnline: true });
    console.log(`\n✅ FINAL: ${userRiders.length} online user riders found`);
    
    userRiders.forEach(rider => {
      console.log(`   - ${rider.fullName} (${rider.mobile}) - ${rider.vehicleType || 'No vehicle type'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createUserFromRiders();

