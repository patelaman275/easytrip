import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import api from '../utils/api';

const ActiveTripContext = createContext(null);

export const ActiveTripProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [activeTrip, setActiveTrip] = useState(null);
  const [onlineRiders, setOnlineRiders] = useState([]);
  const [ridersLocations, setRidersLocations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingRiders, setTypingRiders] = useState({});
  const [sosAlerts, setSosAlerts] = useState([]);
  const [checkpointsProgress, setCheckpointsProgress] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [kicked, setKicked] = useState(false);

  const activeTripRef = useRef(null);
  activeTripRef.current = activeTrip;

  // Add toast notification helper
  const addNotification = (text, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4500);
  };

  // Clean up states when leaving or ending trip
  const cleanUpTripState = () => {
    setActiveTrip(null);
    setOnlineRiders([]);
    setRidersLocations([]);
    setMessages([]);
    setTypingRiders({});
    setSosAlerts([]);
    setCheckpointsProgress([]);
    setKicked(false);
  };

  // Join a trip room (API fetch + Socket connection)
  const joinTrip = async (tripId) => {
    if (!socket || !user) return false;
    try {
      // 1. Fetch details from REST API
      const res = await api.get(`/trips/${tripId}`);
      setActiveTrip(res.data);
      setKicked(false);

      // 2. Fetch history (messages, alerts, progress)
      try {
        const statsRes = await api.get(`/analytics/${tripId}`);
        setCheckpointsProgress(statsRes.data.checkpointsProgress || []);
      } catch (err) {
        console.warn('Could not fetch checkpoints progress history:', err.message);
      }

      // 3. Emit join socket event
      socket.emit('join_trip_room', {
        tripId,
        userId: user.id,
        username: user.username,
      });

      addNotification(`Joined Trip: ${res.data.name}`, 'success');
      return true;
    } catch (err) {
      console.error('Join trip action failed:', err.message);
      addNotification(err.response?.data?.message || 'Could not join trip.', 'error');
      return false;
    }
  };

  // Leave active trip room
  const leaveTrip = () => {
    if (socket && activeTrip) {
      // Socket disconnect is handled automatically or we just clear client state
      console.log('Leaving trip room');
      cleanUpTripState();
    }
  };

  // 4. Bind Socket listeners inside a single useEffect
  useEffect(() => {
    if (!socket || !activeTrip) return;

    const tripId = activeTrip._id;

    // Presence update
    socket.on('online_riders_update', (riders) => {
      setOnlineRiders(riders);
    });

    socket.on('rider_joined', ({ username }) => {
      addNotification(`${username} joined the ride!`, 'info');
    });

    socket.on('rider_left', ({ username }) => {
      addNotification(`${username} disconnected.`, 'warning');
    });

    // Locations synchronizer
    socket.on('rider_locations_updated', (locations) => {
      setRidersLocations(locations);
    });

    // Chat messages
    socket.on('new_chat_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (msg.sender._id !== user.id) {
        addNotification(`New chat from ${msg.sender.username}`, 'chat');
      }
    });

    // Typing statuses
    socket.on('typing_update', ({ username, isTyping }) => {
      setTypingRiders((prev) => ({
        ...prev,
        [username]: isTyping,
      }));
    });

    // Emergency broadcasts (SOS)
    socket.on('sos_broadcast', (sosPayload) => {
      setSosAlerts((prev) => [sosPayload, ...prev]);
      addNotification(`🚨 SOS Emergency from ${sosPayload.username}!`, 'error');
    });

    socket.on('sos_resolved_broadcast', ({ alertId, resolvedByUsername }) => {
      setSosAlerts((prev) =>
        prev.map((alert) =>
          alert._id === alertId ? { ...alert, status: 'resolved' } : alert
        )
      );
      addNotification(`✅ SOS Emergency cleared by ${resolvedByUsername}.`, 'success');
    });

    // Route Synced by leader
    socket.on('route_synchronized', ({ route, checkpoints }) => {
      setActiveTrip((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          route,
          checkpoints,
        };
      });
      addNotification('🗺️ Route updated by the Trip Leader!', 'warning');
    });

    // Milestone progression alerts
    socket.on('checkpoint_notification', ({ username, checkpointName, status }) => {
      // Add progress entry locally
      const progressEntry = {
        user: { username },
        checkpointIndex: -1, // UI resolves by name
        status,
        timestamp: new Date(),
      };
      setCheckpointsProgress((prev) => [progressEntry, ...prev]);

      const statusEmoji = status === 'reached' ? '🏁' : status === 'delayed' ? '⏳' : '⚠️';
      addNotification(
        `${statusEmoji} ${username} has marked checkpoint "${checkpointName}" as ${status.toUpperCase()}`,
        status === 'reached' ? 'success' : 'warning'
      );
    });

    // Leader Kick participant
    socket.on('participant_kicked', ({ userId, username }) => {
      if (user.id === userId) {
        setKicked(true);
        addNotification('⚠️ You have been removed from the trip by the Leader.', 'error');
        cleanUpTripState();
      } else {
        addNotification(`❌ ${username} was removed from the group.`, 'warning');
        setActiveTrip((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            participants: prev.participants.filter((p) => p.user._id !== userId),
          };
        });
      }
    });

    // End trip closed
    socket.on('trip_closed', () => {
      addNotification('🏁 The trip has been marked as ended. Ride completed!', 'success');
      cleanUpTripState();
    });

    return () => {
      socket.off('online_riders_update');
      socket.off('rider_joined');
      socket.off('rider_left');
      socket.off('rider_locations_updated');
      socket.off('new_chat_message');
      socket.off('typing_update');
      socket.off('sos_broadcast');
      socket.off('sos_resolved_broadcast');
      socket.off('route_synchronized');
      socket.off('checkpoint_notification');
      socket.off('participant_kicked');
      socket.off('trip_closed');
    };
  }, [socket, activeTrip, user]);

  // Action methods
  const updateLocation = (lat, lng, speed = 0, batteryPercentage = 100) => {
    if (!socket || !activeTrip) return;
    socket.emit('update_location', {
      tripId: activeTrip._id,
      userId: user.id,
      lat,
      lng,
      speed,
      batteryPercentage,
    });
  };

  const sendMessage = (content) => {
    if (!socket || !activeTrip) return;
    socket.emit('send_message', {
      tripId: activeTrip._id,
      userId: user.id,
      username: user.username,
      content,
    });
  };

  const setTyping = (isTyping) => {
    if (!socket || !activeTrip) return;
    socket.emit('typing_status', {
      tripId: activeTrip._id,
      username: user.username,
      isTyping,
    });
  };

  const triggerSOS = (lat, lng, batteryPercentage = 100) => {
    if (!socket || !activeTrip) return;
    socket.emit('trigger_sos', {
      tripId: activeTrip._id,
      userId: user.id,
      username: user.username,
      lat,
      lng,
      batteryPercentage,
    });
  };

  const resolveSOS = (alertId) => {
    if (!socket || !activeTrip) return;
    socket.emit('resolve_sos', {
      tripId: activeTrip._id,
      alertId,
      userId: user.id,
      username: user.username,
    });
  };

  const triggerCheckpoint = (checkpointIndex, checkpointName, status) => {
    if (!socket || !activeTrip) return;
    socket.emit('checkpoint_trigger', {
      tripId: activeTrip._id,
      userId: user.id,
      username: user.username,
      checkpointIndex,
      checkpointName,
      status, // 'reached', 'delayed', 'missed'
    });
  };

  const removeParticipant = async (participantId, participantUsername) => {
    if (!activeTrip) return;
    try {
      await api.delete(`/trips/${activeTrip._id}/participants/${participantId}`);
      if (socket) {
        socket.emit('kick_rider', {
          tripId: activeTrip._id,
          userId: participantId,
          username: participantUsername,
        });
      }
    } catch (err) {
      addNotification('Could not remove participant.', 'error');
    }
  };

  const syncLeaderRoute = async (startPoint, endPoint, polyline, checkpoints) => {
    if (!activeTrip) return;
    try {
      const res = await api.put(`/trips/${activeTrip._id}/route`, {
        startPoint,
        endPoint,
        polyline,
        checkpoints,
      });

      const updatedTrip = res.data.trip;
      setActiveTrip((prev) => ({
        ...prev,
        route: updatedTrip.route,
        checkpoints: updatedTrip.checkpoints,
      }));

      if (socket) {
        socket.emit('update_route', {
          tripId: activeTrip._id,
          route: updatedTrip.route,
          checkpoints: updatedTrip.checkpoints,
        });
      }
      addNotification('Route successfully updated & synced!', 'success');
    } catch (err) {
      addNotification('Could not update route in database.', 'error');
    }
  };

  const endTrip = async () => {
    if (!activeTrip) return;
    try {
      await api.put(`/trips/${activeTrip._id}/status`, { status: 'ended' });
      if (socket) {
        socket.emit('end_trip', { tripId: activeTrip._id });
      }
      addNotification('Trip has ended.', 'info');
      cleanUpTripState();
    } catch (err) {
      addNotification('Could not end trip.', 'error');
    }
  };

  const startTrip = async () => {
    if (!activeTrip) return;
    try {
      const res = await api.put(`/trips/${activeTrip._id}/status`, { status: 'active' });
      setActiveTrip((prev) => ({
        ...prev,
        status: 'active',
      }));
      addNotification('Trip is now LIVE!', 'success');
    } catch (err) {
      addNotification('Could not start trip.', 'error');
    }
  };

  return (
    <ActiveTripContext.Provider
      value={{
        activeTrip,
        onlineRiders,
        ridersLocations,
        messages,
        typingRiders,
        sosAlerts,
        checkpointsProgress,
        notifications,
        kicked,
        joinTrip,
        leaveTrip,
        updateLocation,
        sendMessage,
        setTyping,
        triggerSOS,
        resolveSOS,
        triggerCheckpoint,
        removeParticipant,
        syncLeaderRoute,
        endTrip,
        startTrip,
        addNotification,
      }}
    >
      {children}
    </ActiveTripContext.Provider>
  );
};

export const useActiveTrip = () => useContext(ActiveTripContext);
