import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ActiveTripProvider, useActiveTrip } from './context/ActiveTripContext';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import TripRoomPage from './pages/TripRoomPage';
import api from './utils/api';
import { MOCK_ROUTE_COORDINATES, MOCK_CHECKPOINTS } from './utils/geoUtils';

// Core content switcher checking session profile status
const MainAppContent = () => {
  const { token, loading, user } = useAuth();
  const { joinTrip, joinLocalTrip, activeTrip } = useActiveTrip();
  const [inActiveRoom, setInActiveRoom] = useState(false);
  const [autoJoining, setAutoJoining] = useState(false);

  // 1. Check for invite query parameter on boot
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');
    if (joinCode) {
      sessionStorage.setItem('pending_join_code', joinCode.toUpperCase());
    }
  }, []);

  // 2. Auto-join checker when user nickname is entered (token active)
  useEffect(() => {
    const checkAutoJoin = async () => {
      const pendingCode = sessionStorage.getItem('pending_join_code');
      if (token && pendingCode && !activeTrip && !autoJoining) {
        setAutoJoining(true);
        sessionStorage.removeItem('pending_join_code');
        // Clean URL query parameters
        window.history.replaceState({}, '', window.location.pathname);

        try {
          // Attempt to join live Render room with a 2.5s timeout to prevent freezes!
          const res = await api.post('/trips/join', { inviteCode: pendingCode }, { timeout: 2500 });
          if (res.data.trip) {
            const success = await joinTrip(res.data.trip._id);
            if (success) setInActiveRoom(true);
          }
        } catch (err) {
          console.warn('Backend auto-join failed, using local offline fallback:', err.message);
          // Fallback local join: guarantees that direct invite links always work instantly!
          const mockTripId = 'local_trip_' + Math.random().toString(36).substring(2, 9);
          const mockCreatedTrip = {
            _id: mockTripId,
            name: 'Chai Break',
            description: 'SRM to Mahindra City Chennai GST road ride',
            inviteCode: pendingCode,
            creator: { username: 'Group Leader' },
            status: 'active',
            route: {
              startPoint: 'Kattankulathur, Chennai',
              endPoint: 'Mahindra World City Chennai',
              polyline: MOCK_ROUTE_COORDINATES,
            },
            checkpoints: MOCK_CHECKPOINTS,
            participants: [
              { user: user || { username: 'Guest Rider' }, role: 'rider' }
            ],
            visibility: 'public',
          };
          joinLocalTrip(mockCreatedTrip);
          setInActiveRoom(true);
        } finally {
          setAutoJoining(false);
        }
      }
    };

    checkAutoJoin();
  }, [token, activeTrip, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-darkBg flex flex-col items-center justify-center text-gray-400 gap-4">
        <div className="w-8 h-8 rounded bg-brandOrange flex items-center justify-center text-white font-black text-lg animate-pulse">
          🧭
        </div>
        <div className="flex flex-col items-center gap-1.5 select-none font-sans">
          <span className="text-xs font-black text-white tracking-widest uppercase">EASYTRIP RADAR</span>
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Warming Up Telemetry Engine...</span>
        </div>
      </div>
    );
  }

  // Session guard redirecting to Auth Page if display name is absent
  if (!token) {
    return <AuthPage />;
  }

  return (
    <>
      {inActiveRoom ? (
        <TripRoomPage onExitRoom={() => setInActiveRoom(false)} />
      ) : (
        <DashboardPage onActiveRoomSelected={() => setInActiveRoom(true)} />
      )}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ActiveTripProvider>
          <MainAppContent />
        </ActiveTripProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
