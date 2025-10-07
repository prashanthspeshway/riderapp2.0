const express = require('express');
const router = express.Router();
const {
  registerRider,
  getAllRiders,
  getRiderById,
  updateRiderStatus,
  deleteRider,
  uploadMultiple,
  getRiderStatus,
  updateRiderOnlineStatus
} = require('../controllers/rider.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Public routes
router.post('/register', uploadMultiple, registerRider);

// Protected routes (require authentication)
router.get('/status', authenticateToken, getRiderStatus); // Rider's own status
router.put('/status', authenticateToken, updateRiderOnlineStatus); // Update rider's online status
router.get('/', authenticateToken, requireAdmin, getAllRiders);
router.get('/:id', authenticateToken, requireAdmin, getRiderById);
router.put('/:id/status', authenticateToken, requireAdmin, updateRiderStatus);
router.delete('/:id', authenticateToken, requireAdmin, deleteRider);

module.exports = router;