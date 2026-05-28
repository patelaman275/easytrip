import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ActiveTripProvider } from './context/ActiveTripContext';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import TripRoomPage from './pages/TripRoomPage';

// Core content switcher checking session profile status
const MainAppContent = () => {
  const { token, loading } = useAuth();
  const [inActiveRoom, setInActiveRoom] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center text-gray-400 gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-xl animate-pulse">
          E
        </div>
        <div className="flex flex-col items-center gap-1.5 select-none">
          <span className="text-sm font-black text-white tracking-wider">EASYTRIP NAVIGATION</span>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Warming Up Telemetry Engine...</span>
        </div>
      </div>
    );
  }

  // Session guard redirecting to Auth Page if JWT token is absent
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
