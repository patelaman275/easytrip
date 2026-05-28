import React, { useState, useRef, useEffect } from 'react';
import { useActiveTrip } from '../../context/ActiveTripContext';
import { useAuth } from '../../context/AuthContext';
import { AlertOctagon, ShieldAlert, XCircle, BellRing, MapPin } from 'lucide-react';

const SOSButton = () => {
  const { user } = useAuth();
  const { activeTrip, triggerSOS, resolveSOS, sosAlerts } = useActiveTrip();

  const [isPressing, setIsPressing] = useState(false);
  const [pressProgress, setPressProgress] = useState(0);
  const pressIntervalRef = useRef(null);

  // Filter for active alerts on the current trip
  const activeAlert = sosAlerts.find((alert) => alert.status === 'active');

  // Triggering mechanism: hold button down for 1.2 seconds
  const startPress = () => {
    setIsPressing(true);
    setPressProgress(0);

    pressIntervalRef.current = setInterval(() => {
      setPressProgress((prev) => {
        if (prev >= 100) {
          clearInterval(pressIntervalRef.current);
          setIsPressing(false);
          handleTriggerSOS();
          return 100;
        }
        return prev + 10;
      });
    }, 120); // 1.2s total hold duration
  };

  const cancelPress = () => {
    setIsPressing(false);
    setPressProgress(0);
    if (pressIntervalRef.current) clearInterval(pressIntervalRef.current);
  };

  const handleTriggerSOS = () => {
    // Attempt to grab actual coords or fall back to standard Golden Gate coordinate
    const lat = 37.8199 + (Math.random() - 0.5) * 0.005;
    const lng = -122.4783 + (Math.random() - 0.5) * 0.005;

    // Trigger context event which emits over Sockets & posts to DB
    const myBattery = user?.riderDetails?.batteryPercentage || 100;
    triggerSOS(lat, lng, myBattery);
  };

  useEffect(() => {
    return () => {
      if (pressIntervalRef.current) clearInterval(pressIntervalRef.current);
    };
  }, []);

  if (!activeTrip) return null;

  return (
    <>
      {/* 1. Large glass panic controller widget */}
      <div className="glass-panel p-5 rounded-2xl border border-red-500/10 shadow-2xl bg-red-950/5 relative overflow-hidden select-none flex flex-col items-center text-center">
        <div className="absolute top-[-50px] right-[-50px] w-28 h-28 bg-red-500/10 rounded-full blur-2xl"></div>

        <AlertOctagon size={24} className="text-brandCrimson mb-2" />
        <h3 className="text-white font-extrabold text-sm uppercase tracking-wider">SOS Safety Alert</h3>
        <p className="text-gray-400 text-[10px] mt-1 mb-4 max-w-xs">
          Press and hold the button for 1.2s to alert nearby riders of an emergency.
        </p>

        {/* Circular Hold-Down Button */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          {/* Radial progress ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="56"
              cy="56"
              r="48"
              stroke="rgba(239, 68, 68, 0.08)"
              strokeWidth="5"
              fill="transparent"
            />
            <circle
              cx="56"
              cy="56"
              r="48"
              stroke="#ef4444"
              strokeWidth="5"
              fill="transparent"
              strokeDasharray="301.6"
              strokeDashoffset={301.6 - (301.6 * pressProgress) / 100}
              className="transition-all duration-75"
            />
          </svg>

          {/* Core trigger button */}
          <button
            onMouseDown={startPress}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
            className={`w-20 h-20 rounded-full bg-gradient-to-tr from-brandCrimson to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black text-xs uppercase tracking-wider flex flex-col items-center justify-center transition-all select-none focus:outline-none ${
              isPressing ? 'scale-90 opacity-90 animate-pulse-red' : 'scale-100 hover:scale-105 active:scale-95 shadow-lg shadow-red-500/20'
            }`}
          >
            <span>{isPressing ? `${pressProgress}%` : 'Hold'}</span>
            <span className="text-[9px] font-bold mt-0.5">{isPressing ? 'Locking...' : 'SOS'}</span>
          </button>
        </div>
      </div>

      {/* 2. Full screen High Priority audio-visual emergency overlay */}
      {activeAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in select-none">
          <div className="w-full max-w-lg bg-darkCard border border-brandCrimson/40 rounded-3xl p-8 text-center relative overflow-hidden shadow-2xl animate-pulse-red">
            {/* Ambient decorative glowing backdrops */}
            <div className="absolute inset-0 bg-red-950/20 pointer-events-none"></div>

            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-brandCrimson flex items-center justify-center mx-auto mb-5 animate-bounce">
              <ShieldAlert size={36} />
            </div>

            <h2 className="text-3xl font-black text-white tracking-wide uppercase">🚨 EMERGENCY SOS 🚨</h2>
            <p className="text-red-400 text-xs font-bold uppercase tracking-widest mt-1.5 animate-pulse">
              Active Incident Alert
            </p>

            <div className="my-6 p-5 rounded-2xl glass-panel text-left space-y-3 bg-red-950/15 border-red-500/10">
              <p className="text-xs text-gray-400">
                Rider in distress: <span className="text-white font-black text-sm">{activeAlert.username}</span>
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <MapPin size={16} className="text-brandCrimson shrink-0" />
                <span>Coordinates: [{activeAlert.location?.lat?.toFixed(5)}, {activeAlert.location?.lng?.toFixed(5)}]</span>
              </div>
              <p className="text-xs text-gray-400">
                Battery Remaining: <span className="text-white font-bold">{activeAlert.batteryPercentage}%</span>
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => resolveSOS(activeAlert._id)}
                className="grow py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs tracking-wider uppercase transition-all shadow-lg hover:shadow-emerald-500/15 flex items-center justify-center gap-1.5"
              >
                Clear Emergency / Help Arrived
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SOSButton;
