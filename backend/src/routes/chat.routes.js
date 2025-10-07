const express = require('express');
const router = express.Router();
const { getChatMessages, markMessagesAsRead } = require('../controllers/chat.controller');
const authMiddleware = require('../middleware/authMiddleware');

// Get chat messages for a ride (temporarily without auth for testing)
router.get('/messages/:rideId', getChatMessages);

// Mark messages as read (temporarily without auth for testing)
router.put('/messages/:rideId/read', markMessagesAsRead);

module.exports = router;
