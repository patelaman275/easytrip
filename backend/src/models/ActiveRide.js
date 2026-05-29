const mongoose = require('mongoose');

const ActiveRideSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  creatorId: { type: String, required: true },
  destination: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  route: { type: [[Number]], default: [] },
  checkpoints: [
    {
      name: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      order: { type: Number, required: true }
    }
  ],
  hazards: [
    {
      id: { type: String, required: true },
      type: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      reporter: { type: String, required: true },
      timestamp: { type: Number, required: true }
    }
  ],
  geofenceRadius: { type: Number, default: 1000 },
  riders: {
    type: Map,
    of: {
      socketId: { type: String, required: true },
      nickname: { type: String, required: true },
      avatar: { type: String, default: '🏍️' },
      vehicleModel: { type: String, default: 'N/A' },
      vehicleNumber: { type: String, default: 'N/A' },
      vehicleType: { type: String, default: 'Motorcycle' },
      emergencyContact: { type: String, default: '' },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      isSOS: { type: Boolean, default: false },
      color: { type: String, required: true },
      speed: { type: Number, default: 0 },
      batteryPercentage: { type: Number, default: 100 }
    },
    default: {}
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ActiveRide', ActiveRideSchema);
