const mongoose = require('mongoose');

const vehicleTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, required: true, unique: true, lowercase: true, trim: true },
  seats: { type: Number, default: 1 },
  ac: { type: Boolean, default: false },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('VehicleType', vehicleTypeSchema);