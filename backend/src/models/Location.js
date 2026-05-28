const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  speed: {
    type: Number,
    default: 0,
  },
  batteryPercentage: {
    type: Number,
    default: 100,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index so searching for a user in a specific trip is extremely fast, and locations expire after 2 hours if desired, or we just upsert.
LocationSchema.index({ user: 1, trip: 1 }, { unique: true });

module.exports = mongoose.model('Location', LocationSchema);
