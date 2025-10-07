const mongoose = require('mongoose');
const User = require('./src/models/User');
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

// Migrate riders from users collection to riders collection
const migrateRiders = async () => {
  try {
    await connectDB();
    
    console.log('🔍 Finding riders in users collection...');
    const userRiders = await User.find({ role: 'rider' });
    console.log(`📊 Found ${userRiders.length} riders in users collection:`);
    
    userRiders.forEach((rider, index) => {
      console.log(`${index + 1}. ${rider.fullName} - ${rider.email} - Status: ${rider.approvalStatus}`);
    });
    
    console.log('\n🔄 Starting migration...');
    
    for (const userRider of userRiders) {
      try {
        // Check if rider already exists in riders collection
        const existingRider = await Rider.findOne({ 
          $or: [
            { email: userRider.email },
            { mobile: userRider.mobile }
          ]
        });
        
        if (existingRider) {
          console.log(`⚠️ Rider ${userRider.fullName} already exists in riders collection, skipping...`);
          continue;
        }
        
        // Extract first and last name from fullName
        const nameParts = userRider.fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Convert documents format from old to new
        const documents = {};
        if (userRider.documents) {
          Object.keys(userRider.documents).forEach(key => {
            if (userRider.documents[key] && userRider.documents[key].url) {
              // Map old document keys to new format
              const newKey = key === 'panCard' ? 'panDocument' : 
                           key === 'aadharFront' ? 'aadharFront' :
                           key === 'aadharBack' ? 'aadharBack' :
                           key === 'license' ? 'license' :
                           key === 'rc' ? 'rc' : key;
              documents[newKey] = userRider.documents[key].url;
            }
          });
        }
        
        // Create new rider in riders collection
        const newRider = new Rider({
          firstName: firstName,
          lastName: lastName,
          email: userRider.email,
          mobile: userRider.mobile,
          panNumber: userRider.panNumber || 'NOT_PROVIDED',
          aadharNumber: userRider.aadharNumber || 'NOT_PROVIDED',
          licenseNumber: userRider.licenseNumber || 'NOT_PROVIDED',
          vehicleNumber: userRider.vehicleNumber || 'NOT_PROVIDED',
          status: userRider.approvalStatus || 'pending',
          documents: documents,
          adminNotes: `Migrated from users collection - ${userRider.approvalStatus}`,
          approvedBy: userRider.approvalStatus === 'approved' ? 'migration' : null,
          approvedAt: userRider.approvalStatus === 'approved' ? new Date() : null,
          createdAt: userRider.createdAt,
          updatedAt: new Date()
        });
        
        await newRider.save();
        console.log(`✅ Migrated ${userRider.fullName} (${userRider.email}) to riders collection`);
        
      } catch (error) {
        console.error(`❌ Error migrating ${userRider.fullName}:`, error.message);
      }
    }
    
    console.log('\n📊 Migration completed! Checking results...');
    
    // Show final counts
    const finalUserRiders = await User.find({ role: 'rider' });
    const finalRiders = await Rider.find({});
    
    console.log(`📈 Final counts:`);
    console.log(`- Riders in users collection: ${finalUserRiders.length}`);
    console.log(`- Riders in riders collection: ${finalRiders.length}`);
    
    console.log('\n📋 Riders in riders collection:');
    finalRiders.forEach((rider, index) => {
      console.log(`${index + 1}. ${rider.firstName} ${rider.lastName} - ${rider.email} - Status: ${rider.status}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

// Run the migration
migrateRiders();
