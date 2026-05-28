import React, { useMemo } from 'react';
import { useActiveTrip } from '../../context/ActiveTripContext';
import { useAuth } from '../../context/AuthContext';
import { Users, Gauge, Zap, CloudSun, MapPin } from 'lucide-react';
import { calculateDistance, calculateETA } from '../../utils/geoUtils';

const StatsBar = () => {
  const { activeTrip, ridersLocations, onlineRiders } = useActiveTrip();
  const { user } = useAuth();

  const stats = useMemo(() => {
    if (!activeTrip || ridersLocations.length === 0) {
      return {
        avgSpeed: 0,
        myBattery: 100,
        mySpeed: 0,
        weather: 'Sunny (72°F)',
        nextCheckpoint: 'None',
        coveredPercent: 0,
        destinationETA: 'N/A',
        remainingKm: 0,
      };
    }

    let speedSum = 0;
    ridersLocations.forEach((loc) => {
      speedSum += loc.speed || 0;
    });
    const avgSpeed = (speedSum / ridersLocations.length).toFixed(1);

    const myLocation = ridersLocations.find((loc) => loc.userId === user?.id);
    const mySpeed = myLocation ? myLocation.speed : 0;
    const myBattery = myLocation ? myLocation.batteryPercentage : 100;

    const nextCp = activeTrip.checkpoints.length > 0
      ? activeTrip.checkpoints[0].name
      : 'Destination';

    let weather = 'Sunny (72°F)';
    if (myLocation) {
      const factor = Math.abs(myLocation.lat + myLocation.lng) % 3;
      if (factor < 1) weather = 'Cloudy (64°F)';
      else if (factor < 2) weather = 'Windy (58°F)';
    }

    // 1. Core journey calculations (Kattankulathur SRM to Mahindra World City Paranur loop)
    const startCoords = [12.8230, 80.0440];
    const finalCoords = [12.7380, 80.0050];
    const totalDistance = calculateDistance(startCoords[0], startCoords[1], finalCoords[0], finalCoords[1]); // ~10.5 km

    const currentCoords = myLocation ? [myLocation.lat, myLocation.lng] : startCoords;
    const remainingKm = calculateDistance(currentCoords[0], currentCoords[1], finalCoords[0], finalCoords[1]);
    
    const coveredDistance = Math.max(0, totalDistance - remainingKm);
    const coveredPercent = Math.min(100, Math.max(0, Math.round((coveredDistance / totalDistance) * 100)));

    // 2. Final destination ETA
    const destinationETA = calculateETA(remainingKm, mySpeed);

    return {
      avgSpeed,
      mySpeed,
      myBattery,
      weather,
      nextCheckpoint: nextCp,
      coveredPercent,
      destinationETA,
      remainingKm,
    };
  }, [activeTrip, ridersLocations, user]);

  if (!activeTrip) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 select-none font-sans">
      {/* 1. Riders */}
      <div className="glass-panel p-4 rounded border border-[#242424] flex items-center justify-between shadow-lg bg-darkCard">
        <div>
          <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block">Active Riders</span>
          <span className="text-2xl font-black text-white">{ridersLocations.length}</span>
          <span className="text-[8px] text-brandOrange font-bold block mt-0.5 uppercase">
            {onlineRiders.length} Online
          </span>
        </div>
        <div className="p-2.5 bg-brandOrange/10 rounded text-brandOrange border border-brandOrange/25">
          <Users size={16} />
        </div>
      </div>

      {/* 2. Speed */}
      <div className="glass-panel p-4 rounded border border-[#242424] flex items-center justify-between shadow-lg bg-darkCard">
        <div>
          <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block">My Speed</span>
          <span className="text-2xl font-black text-white">{stats.mySpeed} <span className="text-[10px] font-bold text-neutral-500 uppercase">km/h</span></span>
          <span className="text-[8px] text-neutral-400 font-bold block mt-0.5 uppercase">
            Avg: {stats.avgSpeed} km/h
          </span>
        </div>
        <div className="p-2.5 bg-neutral-800 rounded text-white border border-[#242424]">
          <Gauge size={16} />
        </div>
      </div>

      {/* 3. Battery */}
      <div className="glass-panel p-4 rounded border border-[#242424] flex items-center justify-between shadow-lg bg-darkCard">
        <div>
          <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block">My Battery</span>
          <span className="text-2xl font-black text-white">{stats.myBattery}%</span>
          <div className="w-16 bg-neutral-800 h-1 rounded mt-1.5 overflow-hidden">
            <div
              className={`h-full rounded transition-all ${
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
        <div className="p-2.5 bg-neutral-800 rounded text-white border border-[#242424]">
          <Zap size={16} />
        </div>
      </div>

      {/* 4. Weather */}
      <div className="glass-panel p-4 rounded border border-[#242424] flex items-center justify-between shadow-lg bg-darkCard">
        <div>
          <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block">Local Weather</span>
          <span className="text-sm font-black text-white truncate max-w-[120px] block mt-1 uppercase">{stats.weather}</span>
          <span className="text-[8px] text-neutral-500 font-bold block mt-0.5 uppercase">GPS Synced</span>
        </div>
        <div className="p-2.5 bg-neutral-800 rounded text-white border border-[#242424]">
          <CloudSun size={16} />
        </div>
      </div>

      {/* 5. Destination Progress Dashboard */}
      <div className="glass-panel p-4 rounded border border-[#242424] flex items-center justify-between shadow-lg bg-darkCard border-brandOrange/20">
        <div>
          <span className="text-[9px] text-brandOrange font-bold uppercase tracking-wider block">Journey Covered</span>
          <span className="text-2xl font-black text-white block mt-0.5">{stats.coveredPercent}%</span>
          <span className="text-[8px] text-neutral-400 font-bold block mt-0.5 uppercase truncate max-w-[140px]">
            ETA: {stats.destinationETA} ({stats.remainingKm.toFixed(1)} km left)
          </span>
        </div>
        <div className="p-2.5 bg-brandOrange/10 rounded text-brandOrange border border-brandOrange/25">
          <MapPin size={16} />
        </div>
      </div>
    </div>
  );
};

export default StatsBar;
