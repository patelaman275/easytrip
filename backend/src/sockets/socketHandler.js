const Location = require('../models/Location');
const Message = require('../models/Message');
const SOSAlert = require('../models/SOSAlert');
const CheckpointProgress = require('../models/CheckpointProgress');
const User = require('../models/User');

const socketHandler = (io) => {
  // Keep track of active sockets and users in-memory for fast messaging/presence
  const onlineUsers = new Map(); // socket.id -> { userId, tripId, username }

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
      } catch (error) {
        console.error('Socket join_trip_room error:', error.message);
      }
    });

    // 2. Real-Time Location Update
    socket.on('update_location', async ({ tripId, userId, lat, lng, speed, batteryPercentage }) => {
      try {
        if (!tripId || !userId || lat === undefined || lng === undefined) return;

        // Upsert to DB Location
        await Location.findOneAndUpdate(
          { user: userId, trip: tripId },
          {
            location: { lat, lng },
            speed: speed || 0,
            batteryPercentage: batteryPercentage || 100,
            updatedAt: new Date(),
          },
          { upsert: true, new: true }
        );

        // Also update User profile speed/battery telemetry
        await User.findByIdAndUpdate(userId, {
          'riderDetails.speed': speed || 0,
          'riderDetails.batteryPercentage': batteryPercentage || 100,
        });

        // Retrieve all coordinates for riders on this trip
        const locations = await Location.find({ trip: tripId })
          .populate('user', 'username profileImage riderDetails')
          .lean();

        const formattedLocations = locations.map((loc) => ({
          userId: loc.user._id,
          username: loc.user.username,
          profileImage: loc.user.profileImage,
          lat: loc.location.lat,
          lng: loc.location.lng,
          speed: loc.speed,
          batteryPercentage: loc.batteryPercentage,
          updatedAt: loc.updatedAt,
        }));

        // Broadcast to everyone in the room
        io.to(`trip_${tripId}`).emit('rider_locations_updated', formattedLocations);
      } catch (error) {
        console.error('Socket update_location error:', error.message);
      }
    });

    // 3. Real-Time Chat Messaging
    socket.on('send_message', async ({ tripId, userId, username, content }) => {
      try {
        if (!tripId || !userId || !content) return;

        const newMessage = new Message({
          trip: tripId,
          sender: userId,
          content,
        });
        await newMessage.save();

        const populatedMessage = {
          _id: newMessage._id,
          content: newMessage.content,
          timestamp: newMessage.timestamp,
          sender: {
            _id: userId,
            username: username,
          },
        };

        io.to(`trip_${tripId}`).emit('new_chat_message', populatedMessage);
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

        const newSOS = new SOSAlert({
          trip: tripId,
          user: userId,
          location: { lat, lng },
          status: 'active',
        });
        await newSOS.save();

        const sosPayload = {
          _id: newSOS._id,
          tripId,
          userId,
          username,
          location: { lat, lng },
          batteryPercentage: batteryPercentage || 100,
          createdAt: newSOS.createdAt,
          status: 'active',
        };

        // Broadcast full overlay alerts to everyone in the trip room
        io.to(`trip_${tripId}`).emit('sos_broadcast', sosPayload);
      } catch (error) {
        console.error('Socket trigger_sos error:', error.message);
      }
    });

    // 6. Resolve SOS Emergency Alert
    socket.on('resolve_sos', async ({ tripId, alertId, userId, username }) => {
      try {
        const updatedSOS = await SOSAlert.findByIdAndUpdate(
          alertId,
          { status: 'resolved', resolvedBy: userId },
          { new: true }
        );

        if (updatedSOS) {
          io.to(`trip_${tripId}`).emit('sos_resolved_broadcast', {
            alertId,
            resolvedByUsername: username,
          });
        }
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
        await CheckpointProgress.findOneAndUpdate(
          { trip: tripId, user: userId, checkpointIndex },
          { status, timestamp: new Date() },
          { upsert: true, new: true }
        );

        // Notify group of Milestone achieved
        io.to(`trip_${tripId}`).emit('checkpoint_notification', {
          userId,
          username,
          checkpointIndex,
          checkpointName,
          status, // 'reached', 'delayed', 'missed'
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
