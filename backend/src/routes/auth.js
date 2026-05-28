const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'easytrip_secret_key_123';

// @route   POST api/auth/signup
// @desc    Register a new user
router.post('/signup', async (req, res) => {
  const { username, email, password, bikeModel, licensePlate, experienceLevel, profileImage } = req.body;

  try {
    // Check if user already exists
    let userByEmail = await User.findOne({ email });
    if (userByEmail) {
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }

    let userByUsername = await User.findOne({ username });
    if (userByUsername) {
      return res.status(400).json({ message: 'This username is already taken.' });
    }

    // Create new User instance
    const newUser = new User({
      username,
      email,
      password,
      profileImage: profileImage || '',
      riderDetails: {
        bikeModel: bikeModel || '',
        licensePlate: licensePlate || '',
        experienceLevel: experienceLevel || 'Beginner',
      },
    });

    await newUser.save();

    // Sign JWT
    const token = jwt.sign({ id: newUser._id, username: newUser.username }, JWT_SECRET, {
      expiresIn: '24h',
    });

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        profileImage: newUser.profileImage,
        riderDetails: newUser.riderDetails,
      },
    });
  } catch (error) {
    console.error('Signup error:', error.message);
    res.status(500).json({ message: 'Server error during signup.' });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user and get token
router.post('/login', async (req, res) => {
  const { emailOrUsername, password } = req.body;

  try {
    // Find by email or username
    const user = await User.findOne({
      $or: [{ email: emailOrUsername.toLowerCase() }, { username: emailOrUsername }],
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Sign JWT
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, {
      expiresIn: '24h',
    });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        riderDetails: user.riderDetails,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// @route   GET api/auth/profile
// @desc    Get current user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({ message: 'Server error fetching profile.' });
  }
});

// @route   PUT api/auth/profile
// @desc    Update user profile & rider details
router.put('/profile', authMiddleware, async (req, res) => {
  const { bikeModel, licensePlate, experienceLevel, profileImage } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (profileImage !== undefined) user.profileImage = profileImage;
    if (bikeModel !== undefined) user.riderDetails.bikeModel = bikeModel;
    if (licensePlate !== undefined) user.riderDetails.licensePlate = licensePlate;
    if (experienceLevel !== undefined) user.riderDetails.experienceLevel = experienceLevel;

    await user.save();

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      profileImage: user.profileImage,
      riderDetails: user.riderDetails,
    });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({ message: 'Server error updating profile.' });
  }
});

module.exports = router;
