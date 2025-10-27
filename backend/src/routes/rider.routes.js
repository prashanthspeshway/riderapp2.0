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
  updateRiderOnlineStatus,
  getRidersByVehicleType,
  getVehicleTypeStats,
  updateRiderLocation,
  getOnlineRiders
} = require('../controllers/rider.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Public routes (no auth middleware)
router.get('/online', getOnlineRiders); // Get all online riders with locations (public for map) - NO AUTH
router.post('/register', uploadMultiple, registerRider);

// Protected routes (require authentication)
router.get('/status', authenticateToken, getRiderStatus); // Rider's own status
router.put('/status', authenticateToken, updateRiderOnlineStatus); // Update rider's online status
router.put('/location', authenticateToken, updateRiderLocation); // Update rider's location (real-time tracking)
router.get('/stats/vehicle-types', authenticateToken, requireAdmin, getVehicleTypeStats); // Vehicle type statistics
router.get('/vehicle-type/:vehicleType', authenticateToken, requireAdmin, getRidersByVehicleType); // Riders by vehicle type
router.get('/', authenticateToken, requireAdmin, getAllRiders);
router.get('/:id', authenticateToken, requireAdmin, getRiderById);
router.put('/:id/status', authenticateToken, requireAdmin, updateRiderStatus);
router.delete('/:id', authenticateToken, requireAdmin, deleteRider);

module.exports = router;