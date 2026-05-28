const express = require('express');
const crypto = require('crypto');
const Trip = require('../models/Trip');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Helper to generate 6-character unique invite code
const generateInviteCode = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};

// @route   POST api/trips/create
// @desc    Create a new trip
router.post('/create', authMiddleware, async (req, res) => {
  const { name, description, startPoint, endPoint, polyline, checkpoints, visibility } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Trip name is required.' });
  }

  try {
    let inviteCode = generateInviteCode();
    // Ensure uniqueness
    let exists = await Trip.findOne({ inviteCode });
    while (exists) {
      inviteCode = generateInviteCode();
      exists = await Trip.findOne({ inviteCode });
    }

    const newTrip = new Trip({
      name,
      description: description || '',
      inviteCode,
      creator: req.user.id,
      status: 'planned',
      route: {
        startPoint: startPoint || '',
        endPoint: endPoint || '',
        polyline: polyline || [],
      },
      checkpoints: checkpoints || [],
      participants: [
        {
          user: req.user.id,
          role: 'leader',
        },
      ],
      visibility: visibility || 'public',
    });

    await newTrip.save();
    res.status(201).json(newTrip);
  } catch (error) {
    console.error('Create trip error:', error.message);
    res.status(500).json({ message: 'Server error during trip creation.' });
  }
});

// @route   POST api/trips/join
// @desc    Join a trip using an invite code
router.post('/join', authMiddleware, async (req, res) => {
  const { inviteCode } = req.body;

  if (!inviteCode) {
    return res.status(400).json({ message: 'Invite code is required.' });
  }

  try {
    const trip = await Trip.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found. Please check your invite code.' });
    }

    if (trip.status === 'ended') {
      return res.status(400).json({ message: 'This trip has already ended.' });
    }

    // Check if user already in trip
    const isParticipant = trip.participants.some(
      (p) => p.user.toString() === req.user.id
    );

    if (isParticipant) {
      return res.status(200).json({ message: 'You are already a participant in this trip.', trip });
    }

    // Add to participants
    trip.participants.push({
      user: req.user.id,
      role: 'rider',
    });

    await trip.save();
    res.status(200).json({ message: 'Successfully joined trip.', trip });
  } catch (error) {
    console.error('Join trip error:', error.message);
    res.status(500).json({ message: 'Server error while joining trip.' });
  }
});

// @route   GET api/trips
// @desc    Get all public trips + joined trips for the current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const trips = await Trip.find({
      $or: [
        { visibility: 'public', status: { $ne: 'ended' } },
        { 'participants.user': req.user.id },
      ],
    })
      .populate('creator', 'username profileImage')
      .populate('participants.user', 'username profileImage riderDetails')
      .sort({ createdAt: -1 });

    res.json(trips);
  } catch (error) {
    console.error('Get trips error:', error.message);
    res.status(500).json({ message: 'Server error fetching trips.' });
  }
});

// @route   GET api/trips/:id
// @desc    Get trip details by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const trip = await Trip.findById(req.id || req.params.id)
      .populate('creator', 'username profileImage')
      .populate('participants.user', 'username profileImage riderDetails');

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    // Verify if participant
    const isParticipant = trip.participants.some(
      (p) => p.user._id.toString() === req.user.id
    );

    if (!isParticipant && trip.visibility === 'private') {
      return res.status(403).json({ message: 'Access denied to this private trip.' });
    }

    res.json(trip);
  } catch (error) {
    console.error('Get trip details error:', error.message);
    res.status(500).json({ message: 'Server error fetching trip details.' });
  }
});

// @route   PUT api/trips/:id/route
// @desc    Update trip route & checkpoints (Leader only)
router.put('/:id/route', authMiddleware, async (req, res) => {
  const { startPoint, endPoint, polyline, checkpoints } = req.body;

  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    // Check if requester is the leader
    if (trip.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the trip leader can update the route.' });
    }

    if (startPoint !== undefined) trip.route.startPoint = startPoint;
    if (endPoint !== undefined) trip.route.endPoint = endPoint;
    if (polyline !== undefined) trip.route.polyline = polyline;
    if (checkpoints !== undefined) trip.checkpoints = checkpoints;

    await trip.save();
    res.json({ message: 'Route updated successfully', trip });
  } catch (error) {
    console.error('Update route error:', error.message);
    res.status(500).json({ message: 'Server error updating route.' });
  }
});

// @route   PUT api/trips/:id/status
// @desc    Start or end a trip (Leader only)
router.put('/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body; // 'active' or 'ended'

  if (!['active', 'ended'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status update.' });
  }

  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    if (trip.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the trip leader can change trip status.' });
    }

    trip.status = status;
    await trip.save();
    res.json({ message: `Trip status updated to ${status}.`, trip });
  } catch (error) {
    console.error('Update status error:', error.message);
    res.status(500).json({ message: 'Server error updating status.' });
  }
});

// @route   DELETE api/trips/:id/participants/:userId
// @desc    Remove a rider from the trip (Leader only)
router.delete('/:id/participants/:userId', authMiddleware, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    // Leader only
    if (trip.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the trip leader can remove participants.' });
    }

    // Cannot remove the leader
    if (trip.creator.toString() === req.params.userId) {
      return res.status(400).json({ message: 'The trip leader cannot be removed.' });
    }

    trip.participants = trip.participants.filter(
      (p) => p.user.toString() !== req.params.userId
    );

    await trip.save();
    res.json({ message: 'Rider successfully removed from trip.', trip });
  } catch (error) {
    console.error('Remove participant error:', error.message);
    res.status(500).json({ message: 'Server error removing participant.' });
  }
});

module.exports = router;
