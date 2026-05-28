const Location = require('../models/Location');
const Message = require('../models/Message');
const SOSAlert = require('../models/SOSAlert');
const CheckpointProgress = require('../models/CheckpointProgress');
const User = require('../models/User');

const socketHandler = (io) => {
  // Keep track of active sockets and users in-memory for fast messaging/presence
  const onlineUsers = new Map(); // socket.id -> { userId, tripId, username }
  const locationCache = new Map(); // tripId -> Map(userId -> locationData)

  io.on('connection', (socket) => {
    console.log('Rider connected to socket:', socket.id);

    // 1. Join a Trip Room
    socket.on('join_trip_room', async ({ tripId, userId, username }) => {
      try {
        socket.join(`trip_${tripId}`);
        onlineUsers.set(socket.id, { userId, tripId, username });

        console.log(`Rider ${username} (${userId}) joined room trip_${tripId}`);

        // Notify others in room
        io.to(`trip_${tripId}`).emit('rider_joined', {
          userId,
          username,
          socketId: socket.id,
        });

        // Send a list of currently online users in this trip
        const activeRiders = [];
        onlineUsers.forEach((value, key) => {
          if (value.tripId === tripId) {
            activeRiders.push({ userId: value.userId, username: value.username });
          }
        });
        io.to(`trip_${tripId}`).emit('online_riders_update', activeRiders);

        // Also broadcast any existing locations in cache immediately upon joining
        if (locationCache.has(tripId)) {
          const locationsArray = Array.from(locationCache.get(tripId).values());
          socket.emit('rider_locations_updated', locationsArray);
        }
      } catch (error) {
        console.error('Socket join_trip_room error:', error.message);
      }
    });

    // 2. Real-Time Location Update
    socket.on('update_location', async ({ tripId, userId, lat, lng, speed, batteryPercentage }) => {
      try {
        if (!tripId || !userId || lat === undefined || lng === undefined) return;

        // Fetch username from online users or default
        const activeUser = onlineUsers.get(socket.id);
        const username = activeUser ? activeUser.username : 'Rider';

        // 1. Instantly update in-memory cache for ultra-resilient streaming
        if (!locationCache.has(tripId)) {
          locationCache.set(tripId, new Map());
        }
        locationCache.get(tripId).set(userId, {
          userId,
          username,
          lat,
          lng,
          speed: speed || 0,
          batteryPercentage: batteryPercentage || 100,
          updatedAt: new Date(),
        });

        // 2. Broadcast the cached array of locations immediately (zero DB delay/dependency)
        const locationsArray = Array.from(locationCache.get(tripId).values());
        io.to(`trip_${tripId}`).emit('rider_locations_updated', locationsArray);

        // 3. Perform Mongoose/MongoDB upserts in the background (failures are non-blocking)
        Location.findOneAndUpdate(
          { user: userId, trip: tripId },
          {
            location: { lat, lng },
            speed: speed || 0,
            batteryPercentage: batteryPercentage || 100,
            updatedAt: new Date(),
          },
          { upsert: true, new: true }
        ).catch((dbErr) => {
          console.warn(`Location DB write deferred/skipped: ${dbErr.message}`);
        });

        User.findByIdAndUpdate(userId, {
          'riderDetails.speed': speed || 0,
          'riderDetails.batteryPercentage': batteryPercentage || 100,
        }).catch((dbErr) => {
          console.warn(`User telemetry DB update deferred: ${dbErr.message}`);
        });

      } catch (error) {
        console.error('Socket update_location error:', error.message);
      }
    });

    // 3. Real-Time Chat Messaging
    socket.on('send_message', async ({ tripId, userId, username, content }) => {
      try {
        if (!tripId || !userId || !content) return;

        // 1. Construct populated payload and broadcast instantly
        const populatedMessage = {
          _id: 'msg_' + Math.random().toString(36).substring(2, 9) + Date.now(),
          content,
          timestamp: new Date(),
          sender: {
            _id: userId,
            username: username,
          },
        };

        io.to(`trip_${tripId}`).emit('new_chat_message', populatedMessage);

        // 2. Write to MongoDB in background (completely non-blocking)
        const newMessage = new Message({
          trip: tripId,
          sender: userId,
          content,
        });
        newMessage.save().catch((dbErr) => {
          console.warn(`Chat DB save deferred/skipped: ${dbErr.message}`);
        });

      } catch (error) {
        console.error('Socket send_message error:', error.message);
      }
    });

    // 4. Typing Statuses
    socket.on('typing_status', ({ tripId, username, isTyping }) => {
      socket.to(`trip_${tripId}`).emit('typing_update', { username, isTyping });
    });

    // 5. Trigger SOS Emergency Alert
    socket.on('trigger_sos', async ({ tripId, userId, username, lat, lng, batteryPercentage }) => {
      try {
        if (!tripId || !userId || lat === undefined || lng === undefined) return;

        // 1. Broadcast overlay instantly
        const sosPayload = {
          _id: 'sos_' + Math.random().toString(36).substring(2, 9) + Date.now(),
          tripId,
          userId,
          username,
          location: { lat, lng },
          batteryPercentage: batteryPercentage || 100,
          createdAt: new Date(),
          status: 'active',
        };

        io.to(`trip_${tripId}`).emit('sos_broadcast', sosPayload);

        // 2. Save in DB in background
        const newSOS = new SOSAlert({
          trip: tripId,
          user: userId,
          location: { lat, lng },
          status: 'active',
        });
        newSOS.save().catch((dbErr) => {
          console.warn(`SOS DB save deferred/skipped: ${dbErr.message}`);
        });

      } catch (error) {
        console.error('Socket trigger_sos error:', error.message);
      }
    });

    // 6. Resolve SOS Emergency Alert
    socket.on('resolve_sos', async ({ tripId, alertId, userId, username }) => {
      try {
        // 1. Broadcast resolved state instantly
        io.to(`trip_${tripId}`).emit('sos_resolved_broadcast', {
          alertId,
          resolvedByUsername: username,
        });

        // 2. Update DB in background
        SOSAlert.findByIdAndUpdate(
          alertId,
          { status: 'resolved', resolvedBy: userId },
          { new: true }
        ).catch((dbErr) => {
          console.warn(`SOS resolve DB write deferred: ${dbErr.message}`);
        });

      } catch (error) {
        console.error('Socket resolve_sos error:', error.message);
      }
    });

    // 7. Route Synchronizer (Leader pushes change)
    socket.on('update_route', ({ tripId, route, checkpoints }) => {
      // Force all rider screens to redraw lines and checkpoints
      socket.to(`trip_${tripId}`).emit('route_synchronized', { route, checkpoints });
    });

    // 8. Checkpoint Monitoring Trigger
    socket.on('checkpoint_trigger', async ({ tripId, userId, username, checkpointIndex, checkpointName, status }) => {
      try {
        // 1. Notify group of Milestone achieved instantly
        io.to(`trip_${tripId}`).emit('checkpoint_notification', {
          userId,
          username,
          checkpointIndex,
          checkpointName,
          status, // 'reached', 'delayed', 'missed'
        });

        // 2. Save to DB in background
        CheckpointProgress.findOneAndUpdate(
          { trip: tripId, user: userId, checkpointIndex },
          { status, timestamp: new Date() },
          { upsert: true, new: true }
        ).catch((dbErr) => {
          console.warn(`Checkpoint DB update deferred: ${dbErr.message}`);
        });

      } catch (error) {
        console.error('Socket checkpoint_trigger error:', error.message);
      }
    });

    // 9. Kick / Remove Participant (Leader pushes change)
    socket.on('kick_rider', ({ tripId, userId, username }) => {
      io.to(`trip_${tripId}`).emit('participant_kicked', { userId, username });
    });

    // 10. End Trip (Leader finishes ride)
    socket.on('end_trip', ({ tripId }) => {
      io.to(`trip_${tripId}`).emit('trip_closed', { tripId });
      // Clear location cache for this trip
      locationCache.delete(tripId);
    });

    // 11. Disconnect
    socket.on('disconnect', () => {
      const user = onlineUsers.get(socket.id);
      if (user) {
        const { userId, tripId, username } = user;
        console.log(`Rider ${username} (${userId}) disconnected`);
        onlineUsers.delete(socket.id);

        io.to(`trip_${tripId}`).emit('rider_left', { userId, username });

        // Update list of online users in this trip
        const activeRiders = [];
        onlineUsers.forEach((value) => {
          if (value.tripId === tripId) {
            activeRiders.push({ userId: value.userId, username: value.username });
          }
        });
        io.to(`trip_${tripId}`).emit('online_riders_update', activeRiders);
      }
    });
  });
};

module.exports = socketHandler;
