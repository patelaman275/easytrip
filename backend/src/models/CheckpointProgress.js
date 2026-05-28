const mongoose = require('mongoose');

const CheckpointProgressSchema = new mongoose.Schema({
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  checkpointIndex: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['reached', 'delayed', 'missed'],
    default: 'reached',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

CheckpointProgressSchema.index({ trip: 1, user: 1, checkpointIndex: 1 }, { unique: true });

module.exports = mongoose.model('CheckpointProgress', CheckpointProgressSchema);
