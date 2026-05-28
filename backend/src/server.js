const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');

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

// In-memory data store for simple, database-free coordination
const rides = {}; // rideCode -> { code, creatorId, destination, route, checkpoints, riders: { socketId: { nickname, lat, lng, isSOS } } }

// Helper to clean up riders on disconnect
const getRideCodeBySocketId = (socketId) => {
  for (const [code, ride] of Object.entries(rides)) {
    if (ride.riders[socketId]) {
      return code;
    }
  }
  return null;
};

// Health Check API
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', activeRides: Object.keys(rides).length });
});

// Socket.io Events Setup
io.on('connection', (socket) => {
  console.log('User connected to socket:', socket.id);

  // 1. Create Ride
  socket.on('createRide', ({ nickname, startLocation }) => {
    try {
      const codeNum = Math.floor(1000 + Math.random() * 9000);
      const rideCode = `RIDE-${codeNum}`;

      // Initialize the ride in-memory
      rides[rideCode] = {
        code: rideCode,
        creatorId: socket.id,
        destination: null,
        route: [],
        checkpoints: [],
        riders: {
          [socket.id]: {
            socketId: socket.id,
            nickname: nickname || 'Creator',
            lat: startLocation.lat,
            lng: startLocation.lng,
            isSOS: false,
            color: '#fc6100', // Admin gets brand orange
          },
        },
      };

      socket.join(rideCode);
      console.log(`Ride ${rideCode} created by ${nickname} (${socket.id})`);

      // Emit creation confirmation back to creator
      socket.emit('rideCreated', rides[rideCode]);
    } catch (err) {
      console.error('Error creating ride:', err.message);
      socket.emit('error', 'Failed to create ride room.');
    }
  });

  // 2. Join Ride
  socket.on('joinRide', ({ rideCode, nickname, currentLocation }) => {
    try {
      const code = rideCode.trim().toUpperCase();
      const ride = rides[code];

      if (!ride) {
        socket.emit('error', 'Ride code not found. Please double-check.');
        return;
      }

      // Add joiner to riders map
      const randomColors = ['#00f0ff', '#a855f7', '#10b981', '#3b82f6', '#ec4899', '#f59e0b'];
      const chosenColor = randomColors[Math.floor(Math.random() * randomColors.length)];

      ride.riders[socket.id] = {
        socketId: socket.id,
        nickname: nickname || `Rider-${Math.floor(100 + Math.random() * 900)}`,
        lat: currentLocation?.lat || 12.8230,
        lng: currentLocation?.lng || 80.0440,
        isSOS: false,
        color: chosenColor,
      };

      socket.join(code);
      console.log(`User ${nickname} joined ride room: ${code}`);

      // Confirm join back to user
      socket.emit('rideJoined', ride);

      // Broadcast updated list of riders to everyone in the room
      io.to(code).emit('riderJoined', {
        nickname: ride.riders[socket.id].nickname,
        riders: Object.values(ride.riders),
      });
    } catch (err) {
      console.error('Error joining ride:', err.message);
      socket.emit('error', 'Failed to join ride room.');
    }
  });

  // 3. Continuous Location Tracking
  socket.on('sendLocation', ({ rideCode, lat, lng }) => {
    try {
      const code = rideCode.toUpperCase();
      const ride = rides[code];

      if (ride && ride.riders[socket.id]) {
        ride.riders[socket.id].lat = lat;
        ride.riders[socket.id].lng = lng;

        // Broadcast all riders locations to room
        io.to(code).emit('receiveLocation', Object.values(ride.riders));
      }
    } catch (err) {
      console.error('Location transmission failed:', err.message);
    }
  });

  // 4. Add Checkpoint
  socket.on('addCheckpoint', ({ rideCode, checkpoint }) => {
    try {
      const code = rideCode.toUpperCase();
      const ride = rides[code];

      if (ride) {
        // Push the checkpoint to the list
        ride.checkpoints.push(checkpoint);
        console.log(`Checkpoint added to ${code}: ${checkpoint.name}`);

        // Sync checkpoints to all room riders
        io.to(code).emit('checkpointAdded', ride.checkpoints);
      }
    } catch (err) {
      console.error('Failed to sync checkpoint:', err.message);
    }
  });

  // 4.5. Undo Checkpoint
  socket.on('undoCheckpoint', ({ rideCode }) => {
    try {
      const code = rideCode.toUpperCase();
      const ride = rides[code];

      if (ride && ride.checkpoints.length > 0) {
        ride.checkpoints.pop();
        console.log(`Checkpoint removed from ${code}`);

        // Sync checkpoints to all room riders
        io.to(code).emit('checkpointUndone', ride.checkpoints);
      }
    } catch (err) {
      console.error('Failed to undo last checkpoint:', err.message);
    }
  });

  // 5. Update/Sync Destination and Route polylines
  socket.on('updateRoute', ({ rideCode, destination, route }) => {
    try {
      const code = rideCode.toUpperCase();
      const ride = rides[code];

      if (ride) {
        ride.destination = destination;
        ride.route = route;

        // Synchronize destination & polylines with all riders instantly
        io.to(code).emit('routeSynced', { destination, route });
      }
    } catch (err) {
      console.error('Failed to sync route:', err.message);
    }
  });

  // 6. SOS Alert Broadcast
  socket.on('sosAlert', ({ rideCode, nickname, isSOS }) => {
    try {
      const code = rideCode.toUpperCase();
      const ride = rides[code];

      if (ride && ride.riders[socket.id]) {
        ride.riders[socket.id].isSOS = isSOS;

        // Broadcast to all room users
        io.to(code).emit('sosAlert', {
          socketId: socket.id,
          nickname,
          isSOS,
          lat: ride.riders[socket.id].lat,
          lng: ride.riders[socket.id].lng,
        });
      }
    } catch (err) {
      console.error('Failed to broadcast SOS:', err.message);
    }
  });

  // 6.5. Send Chat Message
  socket.on('sendMessage', ({ rideCode, nickname, message, msgId }) => {
    try {
      const code = rideCode.toUpperCase();
      const ride = rides[code];

      if (ride && ride.riders[socket.id]) {
        const chatMsg = {
          _id: msgId || ('msg_' + Math.random().toString(36).substring(2, 9) + Date.now()),
          nickname,
          message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          color: ride.riders[socket.id].color || '#fc6100',
        };

        // Broadcast to everyone in the room
        io.to(code).emit('receiveMessage', chatMsg);
      }
    } catch (err) {
      console.error('Failed to broadcast chat message:', err.message);
    }
  });

  // 7. Handle Disconnections & Cleanup
  socket.on('disconnect', () => {
    const code = getRideCodeBySocketId(socket.id);

    if (code) {
      const ride = rides[code];
      const nickname = ride.riders[socket.id]?.nickname || 'Rider';

      delete ride.riders[socket.id];
      console.log(`${nickname} disconnected from ride room: ${code}`);

      const remainingRiders = Object.values(ride.riders);

      if (remainingRiders.length === 0) {
        // Delete empty rooms to release memory
        delete rides[code];
        console.log(`Deleted empty ride room: ${code}`);
      } else {
        // Notify others and update list of active riders
        io.to(code).emit('riderLeft', {
          nickname,
          riders: remainingRiders,
        });
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`  EasyTrip In-Memory Simple Server Running Live    `);
  console.log(`  Listening on Port: ${PORT}                       `);
  console.log(`===================================================`);
});
