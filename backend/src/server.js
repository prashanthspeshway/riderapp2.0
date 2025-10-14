const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const cloudinary = require("cloudinary").v2;
const config = require("./config/config");
const http = require("http");
const { Server } = require("socket.io");

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

const app = express();
const server = http.createServer(app);

// ✅ Socket.IO setup
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.set("io", io); // make io available inside controllers

// === Socket.IO Events ===
io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  // ✅ Join personal room after login
  socket.on("join", (userId) => {
    console.log(`📌 User joined room: ${userId}`);
    socket.join(userId);
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });



  // Rider accepts ride
  socket.on("riderAccepted", (ride) => {
    console.log("🚖 Rider accepted ride:", ride._id);
    io.to(ride.riderId.toString()).emit("rideAccepted", ride); // notify booking rider
  });

  // Rider rejects
  socket.on("riderRejected", (ride) => {
    console.log("❌ Ride rejected:", ride._id);
    io.to(ride.riderId.toString()).emit("rideRejected", ride);
  });

  // User joins their room
  socket.on("joinUserRoom", (userId) => {
    socket.join(userId.toString());
    console.log(`👤 User ${userId} joined their room`);
    console.log(`👤 Socket ${socket.id} is now in room: ${userId}`);
  });

  // Rider joins their room
  socket.on("joinRiderRoom", (riderId) => {
    socket.join(riderId.toString());
    console.log(`🚗 Rider ${riderId} joined their room`);
  });

  // Join chat room
  socket.on("joinChatRoom", (roomId) => {
    socket.join(roomId);
    console.log(`💬 Socket ${socket.id} joined chat room: ${roomId}`);
    
    // Get all sockets in this room
    const room = io.sockets.adapter.rooms.get(roomId);
    if (room) {
      console.log(`💬 Room ${roomId} now has ${room.size} sockets`);
    }
  });

  // Send message in chat
  socket.on("sendMessage", async ({ roomId, message }) => {
    try {
      console.log(`💬 Message in room ${roomId}:`, message);
      console.log(`💬 Message data:`, JSON.stringify(message, null, 2));
      
      // Validate required fields
      if (!message.rideId || !message.sender || !message.text || !message.senderId) {
        console.error('💬 Missing required fields:', message);
        return;
      }
      
      // Use senderId from message (should be valid ObjectId)
      const senderId = message.senderId;
      
      // Validate senderId is a valid ObjectId format
      if (!senderId || typeof senderId !== 'string' || senderId.length !== 24) {
        console.error('💬 Invalid senderId format:', senderId);
        return;
      }
      
      const chatMessage = await Chat.create({
        rideId: message.rideId.toString(),
        sender: message.sender,
        senderId: senderId,
        message: message.text,
        timestamp: new Date(message.timestamp)
      });
      
      if (!chatMessage) {
        console.error('💬 Failed to save message to database');
        return;
      }
      
      console.log(`💬 Message saved to database:`, chatMessage._id);
      console.log(`💬 Saved message details:`, {
        rideId: chatMessage.rideId,
        sender: chatMessage.sender,
        senderId: chatMessage.senderId,
        message: chatMessage.message,
        timestamp: chatMessage.timestamp
      });
      console.log(`💬 Broadcasting to room ${roomId}`);
      
      // Get all sockets in the room before broadcasting
      const room = io.sockets.adapter.rooms.get(roomId);
      if (room) {
        console.log(`💬 Broadcasting to ${room.size} sockets in room ${roomId}`);
      } else {
        console.log(`💬 Room ${roomId} not found!`);
      }
      
      // Broadcast to all users in the room
      io.to(roomId).emit("message", {
        ...message,
        id: chatMessage._id,
        timestamp: chatMessage.timestamp
      });
      
      console.log(`💬 Message broadcasted successfully`);
      
    } catch (error) {
      console.error('💬 Error saving message:', error);
      console.error('💬 Error details:', error.message);
      console.error('💬 Stack trace:', error.stack);
      // Still broadcast even if save fails
      io.to(roomId).emit("message", message);
    }
  });

  // Rider sends GPS updates
  socket.on("riderLocation", ({ rideId, coords }) => {
    console.log(`📍 Rider location update for ride ${rideId}:`, coords);
    io.emit("riderLocationUpdate", { rideId, coords });
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

// === Middleware ===
app.use(helmet());
// Allow multiple local dev origins to avoid CORS errors when CRA runs on 3001
const allowedOrigins = [
  config.frontendUrl,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://183.83.218.240:3000',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.log("❌ Blocked by CORS:", origin);
    return callback(new Error('Not allowed by CORS: ' + origin));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ➡️ ${req.method} ${req.originalUrl} | Body:`,
    req.body
  );
  next();
});

// Rate limiting middleware (safely skipped for local/dev requests)
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // generous limit to reduce accidental 429s
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
  // Always skip limiter for local/dev to avoid 429s when testing
  skip: (req) => {
    const origin = req.headers.origin || '';
    const host = req.hostname || '';
    const isLocalHost = host === 'localhost' || host === '127.0.0.1' || /localhost|127\.0\.0\.1/.test(origin);
    const isDev = process.env.NODE_ENV !== 'production';
    const forceDisable = process.env.DISABLE_RATE_LIMIT === 'true';
    return isDev || forceDisable || isLocalHost;
  }
});
app.use('/api/', limiter);

// === MongoDB connection ===
mongoose
  .connect(config.mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ MongoDB Connected");

    const User = require("./models/User");
    const Ride = require("./models/Ride");
    const Vehicle = require("./models/Vehicle");
    const VehicleType = require("./models/VehicleType");
    const Payment = require("./models/Payment");
    const Otp = require("./models/Otp");
    const Parcel = require("./models/Parcel");
    const Chat = require("./models/Chat");
    console.log("✅ Chat model loaded with schema:", Chat.schema.paths.rideId.instance);
    console.log("✅ Chat model rideId type:", Chat.schema.paths.rideId.instance);
    console.log("✅ Chat model rideId options:", Chat.schema.paths.rideId.options);
    
    // Make Chat model available globally
    global.Chat = Chat;

    try {
      const models = [
        { model: User, name: "User" },
        { model: Ride, name: "Ride" },
        { model: Vehicle, name: "Vehicle" },
        { model: VehicleType, name: "VehicleType" },
        { model: Payment, name: "Payment" },
        { model: Otp, name: "Otp" },
        { model: Parcel, name: "Parcel" },
      ];
      for (const { model, name } of models) {
        if (model && model.createCollection) {
          await model.createCollection();
          console.log(`✅ ${name} collection ensured`);
        }
      }
      console.log("✅ All collections checked/created");

      // Seed default vehicle types if none exist
      try {
        const count = await VehicleType.countDocuments();
        if (count === 0) {
          await VehicleType.insertMany([
            { name: 'Bike', code: 'bike', seats: 1, ac: false },
            { name: 'Scooty', code: 'scooty', seats: 1, ac: false },
            { name: 'Auto (3 seats)', code: 'auto_3', seats: 3, ac: false },
            { name: 'Car (4 seats)', code: 'car_4', seats: 4, ac: false },
            { name: 'Car with AC', code: 'car_ac', seats: 4, ac: true },
            { name: 'Car (6 seats)', code: 'car_6', seats: 6, ac: false },
          ]);
          console.log('🚗 Seeded default VehicleType entries');
        } else {
          console.log(`🚗 VehicleType entries present: ${count}`);
        }
      } catch (seedErr) {
        console.error('⚠️ VehicleType seed error:', seedErr.message);
      }
    } catch (err) {
      console.error("⚠️ Error ensuring collections:", err.message);
    }
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// === Routes ===
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/vehicle-types", require("./routes/vehicleType.routes"));
app.use("/api/otp", require("./routes/otpRoutes"));
app.use("/api/rides", require("./routes/rides.routes"));
app.use("/api/rider", require("./routes/rider.routes"));
app.use("/api/riders", require("./routes/rider.routes")); // Admin routes for rider management
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/parcels", require("./routes/parcelRoutes"));
app.use("/api/sos", require("./routes/sosRoutes"));
app.use("/api/chat", require("./routes/chat.routes"));

// Uploads folder
app.use("/uploads", express.static("uploads"));

// Example protected route
const authMiddleware = require("./middleware/authMiddleware");
app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: `Hello ${req.user.fullName || "User"}!`,
    role: req.user.role,
  });
});

// === Serve React Frontend (if build exists) ===
const frontendPath = path.join(__dirname, "../frontend/build");
const fs = require('fs');

// Only serve static files if frontend build exists
if (fs.existsSync(frontendPath)) {
  console.log("📁 Serving frontend build from:", frontendPath);
  app.use(express.static(frontendPath));
  
  app.get("*", (req, res) => {
    if (req.url.startsWith("/api")) {
      return res
        .status(404)
        .json({ success: false, message: "API route not found" });
    }
    res.sendFile(path.join(frontendPath, "index.html"));
  });
} else {
  console.log("⚠️ Frontend build not found, serving API only");
  
  // Serve API routes only
  app.get("*", (req, res) => {
    if (req.url.startsWith("/api")) {
      return res
        .status(404)
        .json({ success: false, message: "API route not found" });
    }
    res.json({ 
      message: "Backend API is running. Frontend build not found.",
      api: "http://localhost:5000/api",
      status: "running"
    });
  });
}

// === Start server ===
server.listen(config.port, () =>
  console.log(`🚀 Server running on port ${config.port}`)
);

module.exports = app;
