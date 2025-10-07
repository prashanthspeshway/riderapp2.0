const Ride = require('../models/Ride');
// Chat model is imported in server.js

// Get chat messages for a ride
exports.getChatMessages = async (req, res) => {
  try {
    const { rideId } = req.params;
    console.log(`💬 Fetching messages for ride: ${rideId}`);
    
    // Verify ride exists
    const ride = await Ride.findById(rideId);
    if (!ride) {
      console.log(`💬 Ride not found: ${rideId}`);
      return res.status(404).json({
        success: false,
        message: "Ride not found"
      });
    }
    
    // Get messages (temporarily without auth check)
    const messages = await global.Chat.find({ rideId: rideId.toString() })
      .populate('senderId', 'fullName')
      .sort({ timestamp: 1 });
    
    console.log(`💬 Found ${messages.length} messages for ride ${rideId}`);
    console.log(`💬 Messages details:`, messages.map(msg => ({
      id: msg._id,
      text: msg.message,
      sender: msg.sender,
      timestamp: msg.timestamp
    })));
    
    res.json({
      success: true,
      messages: messages.map(msg => ({
        id: msg._id,
        text: msg.message,
        sender: msg.sender,
        senderName: msg.senderId?.fullName || 'Unknown',
        timestamp: msg.timestamp,
        isRead: msg.isRead
      }))
    });
    
  } catch (error) {
    console.error('💬 Error fetching chat messages:', error);
    console.error('💬 Error details:', error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chat messages",
      error: error.message
    });
  }
};

// Mark messages as read
exports.markMessagesAsRead = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user._id;
    
    await global.Chat.updateMany(
      { 
        rideId: rideId.toString(), 
        sender: { $ne: req.user.role }, // Don't mark own messages as read
        isRead: false 
      },
      { isRead: true }
    );
    
    res.json({
      success: true,
      message: "Messages marked as read"
    });
    
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: "Failed to mark messages as read",
      error: error.message
    });
  }
};
