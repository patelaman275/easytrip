import React, { useMemo } from 'react';
import { useActiveTrip } from '../../context/ActiveTripContext';
import { useAuth } from '../../context/AuthContext';
import { Users, Gauge, Zap, CloudSun, MapPin } from 'lucide-react';

const StatsBar = () => {
  const { activeTrip, ridersLocations, onlineRiders } = useActiveTrip();
  const { user } = useAuth();

  // Compute statistics using useMemo
  const stats = useMemo(() => {
    if (!activeTrip || ridersLocations.length === 0) {
      return {
        avgSpeed: 0,
        myBattery: 100,
        mySpeed: 0,
        weather: 'Sunny (72°F)',
        nextCheckpoint: 'None',
      };
    }

    // 1. Speeds calculation
    let speedSum = 0;
    ridersLocations.forEach((loc) => {
      speedSum += loc.speed || 0;
    });
    const avgSpeed = (speedSum / ridersLocations.length).toFixed(1);

    // 2. Local user statistics
    const myLocation = ridersLocations.find((loc) => loc.userId === user?.id);
    const mySpeed = myLocation ? myLocation.speed : 0;
    const myBattery = myLocation ? myLocation.batteryPercentage : 100;

    // 3. Next Checkpoint calculation
    const nextCp = activeTrip.checkpoints.length > 0
      ? activeTrip.checkpoints[0].name
      : 'Destination';

    // 4. Mock weather integration based on coordinates
    let weather = 'Sunny (72°F)';
    if (myLocation) {
      // Mock changes based on lat/lng values
      const factor = Math.abs(myLocation.lat + myLocation.lng) % 3;
      if (factor < 1) weather = 'Cloudy (64°F)';
      else if (factor < 2) weather = 'Windy (58°F)';
    }

    return {
      avgSpeed,
      mySpeed,
      myBattery,
      weather,
      nextCheckpoint: nextCp,
    };
  }, [activeTrip, ridersLocations, user]);

  if (!activeTrip) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      {/* 1. Riders Tracker */}
      <div className="glass-panel p-4 rounded-xl flex items-center justify-between shadow-lg">
        <div>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Active Riders</span>
          <span className="text-2xl font-black text-white">{ridersLocations.length}</span>
          <span className="text-[9px] text-brandCyan font-semibold block mt-0.5">
            {onlineRiders.length} Online Present
          </span>
        </div>
        <div className="p-3 bg-cyan-500/10 rounded-xl text-brandCyan">
          <Users size={20} />
        </div>
      </div>

      {/* 2. Speed Telemetry */}
      <div className="glass-panel p-4 rounded-xl flex items-center justify-between shadow-lg">
        <div>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">My Speed</span>
          <span className="text-2xl font-black text-white">{stats.mySpeed} <span className="text-xs font-medium text-gray-400">km/h</span></span>
          <span className="text-[9px] text-brandPurple font-semibold block mt-0.5">
            Group Avg: {stats.avgSpeed} km/h
          </span>
        </div>
        <div className="p-3 bg-violet-500/10 rounded-xl text-brandPurple">
          <Gauge size={20} />
        </div>
      </div>

      {/* 3. Battery Telemetry */}
      <div className="glass-panel p-4 rounded-xl flex items-center justify-between shadow-lg">
        <div>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">My Battery</span>
          <span className="text-2xl font-black text-white">{stats.myBattery}%</span>
          <div className="w-20 bg-gray-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                stats.myBattery > 50
                  ? 'bg-emerald-500'
                  : stats.myBattery > 20
                  ? 'bg-amber-500'
                  : 'bg-brandCrimson'
              }`}
              style={{ width: `${stats.myBattery}%` }}
            ></div>
          </div>
        </div>
        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
          <Zap size={20} />
        </div>
      </div>

      {/* 4. Weather forecasts */}
      <div className="glass-panel p-4 rounded-xl flex items-center justify-between shadow-lg">
        <div>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Local Weather</span>
          <span className="text-lg font-black text-white truncate max-w-[140px] block mt-1">{stats.weather}</span>
          <span className="text-[9px] text-gray-500 font-semibold block mt-0.5">GPS Synced</span>
        </div>
        <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
          <CloudSun size={20} />
        </div>
      </div>

      {/* 5. Destination point */}
      <div className="glass-panel p-4 rounded-xl flex items-center justify-between shadow-lg">
        <div>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Next Landmark</span>
          <span className="text-base font-black text-white truncate max-w-[140px] block mt-1">
            {stats.nextCheckpoint}
          </span>
          <span className="text-[9px] text-brandCyan font-semibold block mt-0.5">
            {activeTrip.route?.endPoint || 'Ride Finish'}
          </span>
        </div>
        <div className="p-3 bg-brandCyan/10 rounded-xl text-brandCyan">
          <MapPin size={20} />
        </div>
      </div>
    </div>
  );
};

export default StatsBar;
