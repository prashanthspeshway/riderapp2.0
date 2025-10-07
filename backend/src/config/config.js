require('dotenv').config();

const config = {
  // Database
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/rideshare',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Server
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'your-cloudinary-cloud-name',
    apiKey: process.env.CLOUDINARY_API_KEY || 'your-cloudinary-api-key',
    apiSecret: process.env.CLOUDINARY_API_SECRET || 'your-cloudinary-api-secret'
  },
  
  // Twilio
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || 'your-twilio-account-sid',
    authToken: process.env.TWILIO_AUTH_TOKEN || 'your-twilio-auth-token',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'your-twilio-phone-number'
  },
  
  // Google Maps
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || 'your-google-maps-api-key',
  
  // Payment Gateway
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'your-razorpay-key-id',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'your-razorpay-key-secret'
  }
};

module.exports = config;




