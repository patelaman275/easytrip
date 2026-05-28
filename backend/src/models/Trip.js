const mongoose = require('mongoose');

const CheckpointSchema = new mongoose.Schema({
  name: { type: String, required: true },
  coords: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  order: { type: Number, required: true },
});

const TripSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  inviteCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['planned', 'active', 'ended'],
    default: 'planned',
  },
  route: {
    startPoint: { type: String, default: '' },
    endPoint: { type: String, default: '' },
    polyline: {
      type: [[Number]], // Array of [lat, lng] coordinates
      default: [],
    },
  },
  checkpoints: [CheckpointSchema],
  participants: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      role: {
        type: String,
        enum: ['leader', 'rider'],
        default: 'rider',
      },
    },
  ],
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Trip', TripSchema);
