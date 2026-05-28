import React, { useState, useRef, useEffect } from 'react';
import { useActiveTrip } from '../../context/ActiveTripContext';
import { useAuth } from '../../context/AuthContext';
import { AlertOctagon, ShieldAlert, MapPin } from 'lucide-react';

const SOSButton = () => {
  const { user } = useAuth();
  const { activeTrip, triggerSOS, resolveSOS, sosAlerts } = useActiveTrip();

  const [isPressing, setIsPressing] = useState(false);
  const [pressProgress, setPressProgress] = useState(0);
  const pressIntervalRef = useRef(null);

  const activeAlert = sosAlerts.find((alert) => alert.status === 'active');

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
    }, 120);
  };

  const cancelPress = () => {
    setIsPressing(false);
    setPressProgress(0);
    if (pressIntervalRef.current) clearInterval(pressIntervalRef.current);
  };

  const handleTriggerSOS = () => {
    const lat = 37.8199 + (Math.random() - 0.5) * 0.005;
    const lng = -122.4783 + (Math.random() - 0.5) * 0.005;

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
      {/* 1. Large safety alert card */}
      <div className="glass-panel p-5 rounded border border-brandCrimson/20 bg-red-950/5 relative overflow-hidden select-none flex flex-col items-center text-center font-sans">
        <AlertOctagon size={24} className="text-brandCrimson mb-2" />
        <h3 className="text-white font-black text-xs uppercase tracking-wider">Emergency SOS Radar</h3>
        <p className="text-neutral-400 text-[10px] mt-1 mb-4 max-w-xs font-semibold uppercase">
          Press and hold for 1.2s to alert other riders
        </p>

        <div className="relative w-28 h-28 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="56"
              cy="56"
              r="48"
              stroke="rgba(239, 68, 68, 0.08)"
              strokeWidth="4"
              fill="transparent"
            />
            <circle
              cx="56"
              cy="56"
              r="48"
              stroke="#ef4444"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray="301.6"
              strokeDashoffset={301.6 - (301.6 * pressProgress) / 100}
              className="transition-all duration-75"
            />
          </svg>

          <button
            onMouseDown={startPress}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
            className={`w-20 h-20 rounded-full bg-brandCrimson hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest flex flex-col items-center justify-center transition-all focus:outline-none ${
              isPressing ? 'scale-90 opacity-90 animate-pulse-red' : 'scale-100 hover:scale-105 active:scale-95 shadow-lg shadow-red-500/10'
            }`}
          >
            <span>{isPressing ? `${pressProgress}%` : 'Hold'}</span>
            <span className="text-[9px] font-black mt-0.5">{isPressing ? 'LOCKING' : 'SOS'}</span>
          </button>
        </div>
      </div>

      {/* 2. Emergency Overlay */}
      {activeAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in font-sans">
          <div className="w-full max-w-sm bg-darkCard border border-brandCrimson/45 rounded p-6 text-center relative overflow-hidden shadow-2xl animate-pulse-red">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-brandCrimson flex items-center justify-center mx-auto mb-4 animate-bounce">
              <ShieldAlert size={24} />
            </div>

            <h2 className="text-xl font-black text-white tracking-wide uppercase">🚨 EMERGENCY ALERT 🚨</h2>
            <p className="text-red-400 text-[10px] font-black uppercase tracking-widest mt-1">
              Active distress coordinates
            </p>

            <div className="my-4 p-4 rounded border border-[#242424] bg-neutral-900/60 text-left space-y-2 text-xs font-bold uppercase text-neutral-400">
              <p className="text-[10px]">
                Rider: <span className="text-white font-black">{activeAlert.username}</span>
              </p>
              <div className="flex items-center gap-1.5 text-[10px]">
                <MapPin size={14} className="text-brandCrimson shrink-0" />
                <span className="text-white">[{activeAlert.location?.lat?.toFixed(5)}, {activeAlert.location?.lng?.toFixed(5)}]</span>
              </div>
              <p className="text-[10px]">
                Telemetry: <span className="text-white font-black">{activeAlert.batteryPercentage}% Battery</span>
              </p>
            </div>

            <button
              onClick={() => resolveSOS(activeAlert._id)}
              className="w-full py-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs tracking-wider uppercase transition-all shadow"
            >
              Resolve / Cancel Alert
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SOSButton;
