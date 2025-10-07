# 🚗 RideShare - Modern Uber Clone

A comprehensive ride-sharing application built with React, Node.js, and MongoDB. This project provides a complete solution for ride booking, driver management, and real-time tracking.

## ✨ Features

### 🚖 Core Features
- **User Registration & Authentication** - Secure login system with JWT tokens
- **Real-time Ride Booking** - Live ride requests and acceptance
- **Driver Management** - Driver registration, approval, and status tracking
- **Live Tracking** - Real-time location updates during rides
- **Multiple Ride Types** - Bike, Auto, Car, and Premium options
- **Dynamic Pricing** - Distance-based fare calculation with surge pricing
- **Payment Integration** - Ready for Razorpay/Stripe integration
- **Rating System** - Driver and rider rating capabilities
- **Admin Dashboard** - Complete admin panel for managing the platform

### 🎨 Modern UI/UX
- **Responsive Design** - Mobile-first approach with Material-UI
- **Real-time Notifications** - Toast notifications for better user experience
- **Interactive Maps** - Google Maps integration for location services
- **Modern Components** - Professional, Uber-like interface
- **Loading States** - Smooth loading animations and error boundaries

### 🔧 Technical Features
- **Socket.IO** - Real-time communication for live updates
- **MongoDB** - Scalable database with proper indexing
- **JWT Authentication** - Secure token-based authentication
- **File Upload** - Cloudinary integration for document uploads
- **Rate Limiting** - API protection against abuse
- **Error Handling** - Comprehensive error management
- **Security** - Helmet.js for security headers

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud)
- Google Maps API Key
- Cloudinary Account (for file uploads)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Rider_App
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment Setup**
   Create a `.env` file in the backend directory:
   ```env
   # Database
   MONGO_URI=mongodb://localhost:27017/rideshare
   
   # JWT Secret
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   
   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
   CLOUDINARY_API_KEY=your-cloudinary-api-key
   CLOUDINARY_API_SECRET=your-cloudinary-api-secret
   
   # Google Maps API Key
   GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   ```

5. **Start the Application**
   
   **Backend (Terminal 1):**
   ```bash
   cd backend
   npm run dev
   ```
   
   **Frontend (Terminal 2):**
   ```bash
   cd frontend
   npm start
   ```

6. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 📱 User Roles

### 👤 Rider (User)
- Register and login
- Book rides with different vehicle types
- Track driver location in real-time
- Rate drivers after rides
- View ride history
- Emergency SOS feature

### 🚗 Driver
- Register as a driver with documents
- Go online/offline
- Accept/reject ride requests
- Update location in real-time
- Start/complete rides
- View earnings and ratings

### 👨‍💼 Admin
- Approve/reject driver applications
- View all users and drivers
- Monitor ride statistics
- Handle SOS alerts
- Manage platform settings

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/signup-user` - User registration
- `POST /api/auth/login-user` - User login
- `POST /api/rider/signup` - Driver registration
- `POST /api/rider/login` - Driver login

### Rides
- `POST /api/rides/create` - Create ride request
- `GET /api/rides/pending` - Get pending rides
- `POST /api/rides/:id/accept` - Accept ride
- `POST /api/rides/:id/reject` - Reject ride
- `POST /api/rides/:id/start` - Start ride
- `POST /api/rides/:id/complete` - Complete ride
- `POST /api/rides/:id/cancel` - Cancel ride
- `GET /api/rides/history` - Get ride history

### Admin
- `GET /api/admin/overview` - Platform overview
- `GET /api/admin/riders` - All drivers
- `GET /api/admin/users` - All users
- `POST /api/admin/captain/:id/approve` - Approve driver

## 🗄️ Database Schema

### User Model
```javascript
{
  fullName: String,
  email: String,
  mobile: String,
  password: String,
  role: ['rider', 'user', 'admin'],
  approvalStatus: ['pending', 'approved', 'rejected'],
  currentLocation: { lat, lng, address },
  isOnline: Boolean,
  isAvailable: Boolean,
  rating: Number,
  totalRides: Number,
  totalEarnings: Number
}
```

### Ride Model
```javascript
{
  riderId: ObjectId,
  captainId: ObjectId,
  pickup: String,
  drop: String,
  pickupCoords: { lat, lng },
  dropCoords: { lat, lng },
  rideType: ['bike', 'auto', 'car', 'premium'],
  status: ['pending', 'accepted', 'started', 'completed', 'cancelled'],
  totalFare: Number,
  distance: Number,
  duration: Number
}
```

## 🔧 Configuration

### Google Maps Setup
1. Get API key from Google Cloud Console
2. Enable Maps JavaScript API
3. Enable Places API
4. Add to environment variables

### Cloudinary Setup
1. Create Cloudinary account
2. Get cloud name, API key, and secret
3. Add to environment variables

### MongoDB Setup
- Local: Install MongoDB locally
- Cloud: Use MongoDB Atlas
- Update MONGO_URI in environment variables

## 🚀 Deployment

### Backend Deployment (Heroku)
1. Create Heroku app
2. Set environment variables
3. Deploy with Git
4. Add MongoDB Atlas connection

### Frontend Deployment (Netlify/Vercel)
1. Build the project: `npm run build`
2. Deploy build folder
3. Set environment variables
4. Update API URLs

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📈 Performance Optimization

- Database indexing for faster queries
- Image optimization with Cloudinary
- Lazy loading for components
- Caching for frequently accessed data
- Rate limiting for API protection

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting
- CORS configuration
- Helmet.js security headers

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code comments

## 🎯 Future Enhancements

- [ ] Push notifications
- [ ] Advanced analytics
- [ ] Ride scheduling
- [ ] Multi-language support
- [ ] Advanced payment methods
- [ ] Driver earnings dashboard
- [ ] Customer support chat
- [ ] Advanced reporting

---

**Built with ❤️ using React, Node.js, and MongoDB**




