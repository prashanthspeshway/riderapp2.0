const VehicleType = require('../models/VehicleType');

// List all vehicle types (public)
exports.list = async (req, res) => {
  try {
    const types = await VehicleType.find({ active: true }).sort({ seats: 1, name: 1 });
    res.json({ success: true, types });
  } catch (err) {
    console.error('❌ VehicleType list error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch vehicle types' });
  }
};

// Admin: create a vehicle type
exports.create = async (req, res) => {
  try {
    const { name, code, seats, ac, active } = req.body;
    const created = await VehicleType.create({ name, code, seats, ac, active });
    res.status(201).json({ success: true, type: created });
  } catch (err) {
    console.error('❌ VehicleType create error:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to create vehicle type' });
  }
};