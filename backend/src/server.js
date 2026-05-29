const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Enable Socket.io with open CORS for standard and development builds
const io = socketio(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Connect to MongoDB Atlas (Production Grade Database Integration)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/easytrip';
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB Atlas database.');
  })
  .catch((err) => {
    console.error('MongoDB Atlas connection failed:', err.message);
  });

// Mount Mongoose Schema Model
const ActiveRide = require('./models/ActiveRide');

// Mount API Routes for Clean Architecture
app.use('/api/auth', require('./routes/auth'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/analytics', require('./routes/analytics'));

// Health Check API
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED'
  });
});

// Socket.io Real-Time Events Setup
io.on('connection', (socket) => {
  console.log('User connected to socket:', socket.id);

  // 1. Create Ride
  socket.on('createRide', async ({ nickname, startLocation, vehicleModel, vehicleNumber, vehicleType, emergencyContact }) => {
    try {
      const codeNum = Math.floor(1000 + Math.random() * 9000);
      const rideCode = `RIDE-${codeNum}`;

      // Initialize and save the active ride in MongoDB Atlas
      const newRide = new ActiveRide({
        code: rideCode,
        creatorId: socket.id,
        destination: null,
        route: [],
        checkpoints: [],
        hazards: [],
        geofenceRadius: 1000,
        riders: {
          [socket.id]: {
            socketId: socket.id,
            nickname: nickname || 'Aman Patel',
            vehicleModel: vehicleModel || 'Yamaha Ray ZR',
            vehicleNumber: vehicleNumber || 'UP32 AB 1234',
            vehicleType: vehicleType || 'Scooter',
            emergencyContact: emergencyContact || '+91 98765 43210',
            lat: startLocation.lat,
            lng: startLocation.lng,
            isSOS: false,
            color: '#fc6100', // Admin brand orange
            speed: 0,
            batteryPercentage: 100,
          }
        }
      });

      await newRide.save();
      socket.join(rideCode);
      console.log(`Ride ${rideCode} created by ${nickname || 'Aman Patel'} in MongoDB Atlas`);

      // Emit creation confirmation back to creator
      socket.emit('rideCreated', {
        code: newRide.code,
        creatorId: newRide.creatorId,
        destination: newRide.destination,
        route: newRide.route,
        checkpoints: newRide.checkpoints,
        hazards: newRide.hazards,
        geofenceRadius: newRide.geofenceRadius,
        riders: Array.from(newRide.riders.values()),
      });
    } catch (err) {
      console.error('Error creating ride in MongoDB:', err.message);
      socket.emit('error', 'Failed to create ride room in database.');
    }
  });

  // 2. Join Ride
  socket.on('joinRide', async ({ rideCode, nickname, currentLocation, vehicleModel, vehicleNumber, vehicleType, emergencyContact }) => {
    try {
      const code = rideCode.trim().toUpperCase();
      const ride = await ActiveRide.findOne({ code });

      if (!ride) {
        socket.emit('error', 'Ride code not found. Please double-check.');
        return;
      }

      const randomColors = ['#00f0ff', '#a855f7', '#10b981', '#3b82f6', '#ec4899', '#f59e0b'];
      const chosenColor = randomColors[Math.floor(Math.random() * randomColors.length)];

      // Push joined participant into Map schema
      ride.riders.set(socket.id, {
        socketId: socket.id,
        nickname: nickname || 'Aman Patel',
        vehicleModel: vehicleModel || 'Yamaha Ray ZR',
        vehicleNumber: vehicleNumber || 'UP32 AB 1234',
        vehicleType: vehicleType || 'Scooter',
        emergencyContact: emergencyContact || '+91 98765 43210',
        lat: currentLocation?.lat || 12.8230,
        lng: currentLocation?.lng || 80.0440,
        isSOS: false,
        color: chosenColor,
        speed: 0,
        batteryPercentage: 100,
      });

      await ride.save();
      socket.join(code);
      console.log(`User ${nickname} joined ride room: ${code}`);

      // Confirm join back to user
      socket.emit('rideJoined', {
        code: ride.code,
        creatorId: ride.creatorId,
        destination: ride.destination,
        route: ride.route,
        checkpoints: ride.checkpoints,
        hazards: ride.hazards,
        geofenceRadius: ride.geofenceRadius,
        riders: Array.from(ride.riders.values()),
      });

      // Broadcast updated list of riders to everyone in the room
      io.to(code).emit('riderJoined', {
        nickname: nickname,
        riders: Array.from(ride.riders.values()),
      });
    } catch (err) {
      console.error('Error joining ride in MongoDB:', err.message);
      socket.emit('error', 'Failed to join ride room in database.');
    }
  });

  // 3. Continuous Location Tracking (High Speed Non-Blocking Upserts)
  socket.on('sendLocation', async ({ rideCode, lat, lng, speed, batteryPercentage }) => {
    try {
      const code = rideCode.toUpperCase();
      
      const updateFields = {};
      updateFields[`riders.${socket.id}.lat`] = lat;
      updateFields[`riders.${socket.id}.lng`] = lng;
      if (speed !== undefined) updateFields[`riders.${socket.id}.speed`] = speed;
      if (batteryPercentage !== undefined) updateFields[`riders.${socket.id}.batteryPercentage`] = batteryPercentage;

      // Update MongoDB Atlas in background
      ActiveRide.findOneAndUpdate({ code }, { $set: updateFields }, { new: true })
        .then((updatedRide) => {
          if (updatedRide) {
            // Broadcast location coordinate array directly from DB
            io.to(code).emit('receiveLocation', Array.from(updatedRide.riders.values()));
          }
        })
        .catch((dbErr) => {
          console.warn(`Location DB update deferred: ${dbErr.message}`);
        });

    } catch (err) {
      console.error('Location transmission failed:', err.message);
    }
  });

  // 4. Add Checkpoint
  socket.on('addCheckpoint', async ({ rideCode, checkpoint }) => {
    try {
      const code = rideCode.toUpperCase();
      const updatedRide = await ActiveRide.findOneAndUpdate(
        { code },
        { $push: { checkpoints: checkpoint } },
        { new: true }
      );
      if (updatedRide) {
        console.log(`Checkpoint ${checkpoint.name} saved to DB for ${code}`);
        io.to(code).emit('checkpointAdded', updatedRide.checkpoints);
      }
    } catch (err) {
      console.error('Failed to sync checkpoint in DB:', err.message);
    }
  });

  // 4.5. Undo Checkpoint
  socket.on('undoCheckpoint', async ({ rideCode }) => {
    try {
      const code = rideCode.toUpperCase();
      const updatedRide = await ActiveRide.findOneAndUpdate(
        { code },
        { $pop: { checkpoints: 1 } },
        { new: true }
      );
      if (updatedRide) {
        console.log(`Undid checkpoint in DB for ${code}`);
        io.to(code).emit('checkpointUndone', updatedRide.checkpoints);
      }
    } catch (err) {
      console.error('Failed to undo last checkpoint in DB:', err.message);
    }
  });

  // 5. Update/Sync Destination and Route polylines
  socket.on('updateRoute', async ({ rideCode, destination, route }) => {
    try {
      const code = rideCode.toUpperCase();
      const updatedRide = await ActiveRide.findOneAndUpdate(
        { code },
        { $set: { destination, route } },
        { new: true }
      );
      if (updatedRide) {
        console.log(`Destination route synced to DB for ${code}`);
        io.to(code).emit('routeSynced', { destination, route });
      }
    } catch (err) {
      console.error('Failed to sync route in DB:', err.message);
    }
  });

  // 6. SOS Alert Broadcast
  socket.on('sosAlert', async ({ rideCode, nickname, isSOS }) => {
    try {
      const code = rideCode.toUpperCase();
      
      const updateFields = {};
      updateFields[`riders.${socket.id}.isSOS`] = isSOS;

      const updatedRide = await ActiveRide.findOneAndUpdate(
        { code },
        { $set: updateFields },
        { new: true }
      );

      if (updatedRide) {
        const riderInfo = updatedRide.riders.get(socket.id);
        if (riderInfo) {
          io.to(code).emit('sosAlert', {
            socketId: socket.id,
            nickname,
            isSOS,
            lat: riderInfo.lat,
            lng: riderInfo.lng,
          });
        }
      }
    } catch (err) {
      console.error('Failed to broadcast SOS in DB:', err.message);
    }
  });

  // 6.5. Send Chat Message
  socket.on('sendMessage', async ({ rideCode, nickname, message, msgId }) => {
    try {
      const code = rideCode.toUpperCase();
      const ride = await ActiveRide.findOne({ code });

      if (ride) {
        const riderInfo = ride.riders.get(socket.id);
        const chatMsg = {
          _id: msgId || ('msg_' + Math.random().toString(36).substring(2, 9) + Date.now()),
          nickname,
          message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          color: riderInfo ? riderInfo.color : '#fc6100',
        };

        io.to(code).emit('receiveMessage', chatMsg);
      }
    } catch (err) {
      console.error('Failed to broadcast chat message:', err.message);
    }
  });

  // 6.6. Hazards Safety System
  socket.on('addHazard', async ({ rideCode, hazard }) => {
    try {
      const code = rideCode.toUpperCase();
      const updatedRide = await ActiveRide.findOneAndUpdate(
        { code },
        { $push: { hazards: hazard } },
        { new: true }
      );
      if (updatedRide) {
        console.log(`Hazard ${hazard.type} committed to DB for ${code}`);
        io.to(code).emit('hazardAdded', updatedRide.hazards);
      }
    } catch (err) {
      console.error('Failed to add hazard in DB:', err.message);
    }
  });

  socket.on('removeHazard', async ({ rideCode, hazardId }) => {
    try {
      const code = rideCode.toUpperCase();
      const updatedRide = await ActiveRide.findOneAndUpdate(
        { code },
        { $pull: { hazards: { id: hazardId } } },
        { new: true }
      );
      if (updatedRide) {
        console.log(`Hazard cleared from DB for ${code}`);
        io.to(code).emit('hazardRemoved', updatedRide.hazards);
      }
    } catch (err) {
      console.error('Failed to remove hazard in DB:', err.message);
    }
  });

  // 6.7. Geofence Limits Sync
  socket.on('updateGeofence', async ({ rideCode, radius }) => {
    try {
      const code = rideCode.toUpperCase();
      const updatedRide = await ActiveRide.findOneAndUpdate(
        { code },
        { $set: { geofenceRadius: radius } },
        { new: true }
      );
      if (updatedRide) {
        console.log(`Geofence limit ${radius}m saved to DB for ${code}`);
        io.to(code).emit('geofenceUpdated', updatedRide.geofenceRadius);
      }
    } catch (err) {
      console.error('Failed to update geofence in DB:', err.message);
    }
  });

  // 6.8. Quick Action Broadcast
  socket.on('quickAction', async ({ rideCode, nickname, actionType }) => {
    try {
      const code = rideCode.toUpperCase();
      console.log(`Quick action ping: ${nickname} -> ${actionType}`);
      io.to(code).emit('quickActionReceived', { nickname, actionType });
    } catch (err) {
      console.error('Failed to broadcast quick action:', err.message);
    }
  });

  // 6.9. Send Announcement (Leader Mode)
  socket.on('sendAnnouncement', async ({ rideCode, nickname, announcement }) => {
    try {
      const code = rideCode.toUpperCase();
      console.log(`Leader announcement: ${announcement}`);
      io.to(code).emit('announcementReceived', { nickname, announcement });
    } catch (err) {
      console.error('Failed to broadcast announcement:', err.message);
    }
  });

  // 7. Handle Disconnections & Cleanup
  socket.on('disconnect', async () => {
    try {
      // Find the ride that contains this socket.id in its riders Map
      const ride = await ActiveRide.findOne({ [`riders.${socket.id}`]: { $exists: true } });

      if (ride) {
        const code = ride.code;
        const riderInfo = ride.riders.get(socket.id);
        const nickname = riderInfo ? riderInfo.nickname : 'Rider';

        // Remove disconnected rider
        ride.riders.delete(socket.id);
        await ride.save();
        console.log(`${nickname} disconnected and removed from DB for ${code}`);

        const remainingRiders = Array.from(ride.riders.values());

        if (remainingRiders.length === 0) {
          // Delete active run if empty to conserve database size
          await ActiveRide.deleteOne({ code });
          console.log(`Deleted empty ride room from MongoDB Atlas: ${code}`);
        } else {
          io.to(code).emit('riderLeft', {
            nickname,
            riders: remainingRiders,
          });
        }
      }
    } catch (err) {
      console.error('Socket disconnect handler failed:', err.message);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`  EasyTrip MongoDB Production Server Running Live  `);
  console.log(`  Listening on Port: ${PORT}                       `);
  console.log(`===================================================`);
});
