const express = require('express');
const router = express.Router();

const { list, create } = require('../controllers/vehicleType.controller');
const authMiddleware = require('../middleware/authMiddleware');

// Public: list active vehicle types
router.get('/', list);

// Admin only: create type
router.post('/', authMiddleware, (req, res, next) => {
  // Simple role check; expecting req.user.role === 'admin'
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
}, create);

module.exports = router;