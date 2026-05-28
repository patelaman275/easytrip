const express = require('express');
const Trip = require('../models/Trip');
const Message = require('../models/Message');
const SOSAlert = require('../models/SOSAlert');
const CheckpointProgress = require('../models/CheckpointProgress');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// @route   GET api/analytics/history
// @desc    Get user's past ended trips history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const historicalTrips = await Trip.find({
      'participants.user': req.user.id,
      status: 'ended',
    })
      .populate('creator', 'username profileImage')
      .populate('participants.user', 'username profileImage')
      .sort({ createdAt: -1 });

    res.json(historicalTrips);
  } catch (error) {
    console.error('History fetch error:', error.message);
    res.status(500).json({ message: 'Server error fetching ride history.' });
  }
});

// @route   GET api/analytics/:tripId
// @desc    Get detailed statistics and analytics for a trip
router.get('/:tripId', authMiddleware, async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId).populate('participants.user', 'username profileImage riderDetails');
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    // Counts
    const messageCount = await Message.countDocuments({ trip: tripId });
    const sosCount = await SOSAlert.countDocuments({ trip: tripId });
    const resolvedSosCount = await SOSAlert.countDocuments({ trip: tripId, status: 'resolved' });

    // Checkpoint progress stats
    const checkpointsProgress = await CheckpointProgress.find({ trip: tripId })
      .populate('user', 'username');

    // Calculate rider speed stats
    let totalSpeed = 0;
    let maxSpeed = 0;
    let activeRidersCount = 0;

    trip.participants.forEach((p) => {
      const details = p.user.riderDetails;
      if (details) {
        const speed = details.speed || 0;
        totalSpeed += speed;
        if (speed > maxSpeed) {
          maxSpeed = speed;
        }
        if (speed > 0) activeRidersCount++;
      }
    });

    const averageSpeed = trip.participants.length > 0 ? (totalSpeed / trip.participants.length).toFixed(1) : 0;

    res.json({
      tripName: trip.name,
      status: trip.status,
      participantsCount: trip.participants.length,
      checkpointsCount: trip.checkpoints.length,
      totalMessages: messageCount,
      totalSosAlerts: sosCount,
      resolvedSosAlerts: resolvedSosCount,
      averageSpeed: Number(averageSpeed),
      maxSpeed: maxSpeed,
      checkpointsProgress,
    });
  } catch (error) {
    console.error('Analytics fetch error:', error.message);
    res.status(500).json({ message: 'Server error fetching ride analytics.' });
  }
});

module.exports = router;
