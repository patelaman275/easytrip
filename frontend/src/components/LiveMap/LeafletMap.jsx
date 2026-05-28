import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useActiveTrip } from '../../context/ActiveTripContext';
import { useAuth } from '../../context/AuthContext';
import { Play, Square, AlertTriangle, Compass, Navigation } from 'lucide-react';
import { calculateDistance, formatDistance, MOCK_ROUTE_COORDINATES } from '../../utils/geoUtils';

const MapController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

const LeafletMap = () => {
  const { user } = useAuth();
  const { activeTrip, ridersLocations, updateLocation, triggerSOS, triggerCheckpoint, addNotification } = useActiveTrip();

  const [currentPosition, setCurrentPosition] = useState([37.7749, -122.4194]);
  const [speed, setSpeed] = useState(0);
  const [battery, setBattery] = useState(100);
  const [autoCenter, setAutoCenter] = useState(true);

  const [isSimulating, setIsSimulating] = useState(false);
  const [simIndex, setSimIndex] = useState(0);
  const simIntervalRef = useRef(null);

  const [reachedCheckpoints, setReachedCheckpoints] = useState(new Set());

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const coords = [latitude, longitude];
          setCurrentPosition(coords);
          updateLocation(latitude, longitude, speed, battery);
          addNotification('Position updated via browser GPS.', 'success');
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
          addNotification('GPS denied or unavailable. Using simulated values.', 'warning');
        }
      );
    }
  };

  const createRiderIcon = (username, isLocal = false) => {
    return L.divIcon({
      className: 'rider-map-icon',
      html: `
        <div class="relative flex flex-col items-center">
          <div class="w-6 h-6 rounded-full border-2 ${
            isLocal ? 'border-[#ffffff] bg-brandOrange' : 'border-[#242424] bg-neutral-700'
          } flex items-center justify-center shadow-lg relative animate-fade-in">
            <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
            <div class="absolute inset-0 rounded-full border ${isLocal ? 'border-brandOrange animate-ping opacity-60' : 'border-neutral-500 animate-ping opacity-40'}"></div>
          </div>
          <div class="mt-1 px-1.5 py-0.5 bg-neutral-900 border border-[#242424] text-[9px] font-black text-white rounded whitespace-nowrap shadow-md uppercase tracking-wider">
            ${username}
          </div>
        </div>
      `,
      iconSize: [32, 40],
      iconAnchor: [16, 20],
    });
  };

  const createSOSIcon = (username) => {
    return L.divIcon({
      className: 'rider-map-icon',
      html: `
        <div class="relative flex flex-col items-center">
          <div class="w-8 h-8 rounded-full border-2 border-white bg-brandCrimson flex items-center justify-center shadow-xl animate-bounce">
            <span class="text-[9px] font-black text-white uppercase animate-pulse">SOS</span>
          </div>
          <div class="absolute inset-0 rounded-full border-4 border-red-500/50 animate-ping" style="animation-duration: 1.2s"></div>
          <div class="mt-1 px-1.5 py-0.5 bg-brandCrimson border border-white/20 text-[9px] font-black text-white rounded whitespace-nowrap shadow-md uppercase tracking-wider">
            🚨 ${username} HELP
          </div>
        </div>
      `,
      iconSize: [40, 48],
      iconAnchor: [20, 24],
    });
  };

  const createCheckpointIcon = (name, order) => {
    return L.divIcon({
      className: 'rider-map-icon',
      html: `
        <div class="relative flex flex-col items-center">
          <div class="w-6 h-6 rounded bg-neutral-900 border-2 border-brandOrange flex items-center justify-center font-black text-[10px] text-brandOrange shadow-lg rotate-45">
            <span class="-rotate-45">${order}</span>
          </div>
          <div class="mt-2 px-1.5 py-0.5 bg-neutral-900 border border-[#242424] text-[9px] font-bold text-white rounded whitespace-nowrap shadow-md uppercase">
            🏁 CP ${order}
          </div>
        </div>
      `,
      iconSize: [32, 40],
      iconAnchor: [16, 20],
    });
  };

  const startSimulation = () => {
    if (isSimulating) return;

    setIsSimulating(true);
    setReachedCheckpoints(new Set());
    addNotification('Starting scenic GPS coordinate simulator...', 'info');

    let idx = simIndex;
    const interval = setInterval(() => {
      if (idx >= MOCK_ROUTE_COORDINATES.length) {
        clearInterval(interval);
        setIsSimulating(false);
        setSimIndex(0);
        setSpeed(0);
        addNotification('Simulation route completed successfully.', 'success');
        return;
      }

      const coords = MOCK_ROUTE_COORDINATES[idx];
      setCurrentPosition(coords);

      const newSpeed = Math.round(50 + Math.random() * 20);
      const newBattery = Math.max(20, 100 - idx * 5);

      setSpeed(newSpeed);
      setBattery(newBattery);
      updateLocation(coords[0], coords[1], newSpeed, newBattery);

      if (activeTrip?.checkpoints) {
        activeTrip.checkpoints.forEach((cp, cpIdx) => {
          const dist = calculateDistance(coords[0], coords[1], cp.coords.lat, cp.coords.lng);
          if (dist < 0.25 && !reachedCheckpoints.has(cp.name)) {
            triggerCheckpoint(cpIdx, cp.name, 'reached');
            setReachedCheckpoints((prev) => {
              const updated = new Set(prev);
              updated.add(cp.name);
              return updated;
            });
          }
        });
      }

      idx++;
      setSimIndex(idx);
    }, 4500);

    simIntervalRef.current = interval;
  };

  const stopSimulation = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      setIsSimulating(false);
      setSpeed(0);
      addNotification('Simulator paused.', 'warning');
    }
  };

  useEffect(() => {
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeTrip && currentPosition) {
      updateLocation(currentPosition[0], currentPosition[1], speed, battery);
    }
  }, [activeTrip]);

  const separationAlerts = useMemo(() => {
    const alerts = [];
    ridersLocations.forEach((loc) => {
      if (loc.userId === user?.id) return;
      const dist = calculateDistance(currentPosition[0], currentPosition[1], loc.lat, loc.lng);
      if (dist > 0.6) {
        alerts.push({
          username: loc.username,
          distance: formatDistance(dist),
        });
      }
    });
    return alerts;
  }, [ridersLocations, currentPosition, user]);

  return (
    <div className="flex flex-col h-[520px] rounded overflow-hidden glass-panel border border-[#242424] shadow-2xl relative font-sans">
      {/* 1. Map container panel */}
      <div className="grow w-full h-full relative z-10">
        <MapContainer
          center={currentPosition}
          zoom={14}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="dark-map-tiles"
          />

          <MapController center={autoCenter ? currentPosition : null} />

          {activeTrip?.route?.polyline?.length > 0 && (
            <Polyline
              positions={activeTrip.route.polyline}
              color="#fc6100"
              weight={4}
              opacity={0.8}
            />
          )}

          {activeTrip?.checkpoints?.map((cp, idx) => (
            <Marker
              key={cp._id || idx}
              position={[cp.coords.lat, cp.coords.lng]}
              icon={createCheckpointIcon(cp.name, cp.order)}
            >
              <Popup>
                <div className="text-xs p-1">
                  <h4 className="font-extrabold text-white text-sm uppercase">Checkpoint {cp.order}</h4>
                  <p className="text-neutral-300 mt-1 font-medium">{cp.name}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {ridersLocations.map((loc) => {
            const isMe = loc.userId === user?.id;
            const mySos = activeTrip?.sosAlerts?.find(
              (alert) => alert.user === loc.userId && alert.status === 'active'
            );

            return (
              <Marker
                key={loc.userId}
                position={[loc.lat, loc.lng]}
                icon={mySos ? createSOSIcon(loc.username) : createRiderIcon(loc.username, isMe)}
              >
                <Popup>
                  <div className="text-xs p-1.5 min-w-[130px] space-y-1.5 font-sans">
                    <div className="flex items-center justify-between border-b border-[#242424] pb-1">
                      <span className="font-black text-white text-xs uppercase">{loc.username}</span>
                      {isMe && <span className="text-[8px] bg-brandOrange/20 text-brandOrange px-1.5 rounded uppercase font-black">Me</span>}
                    </div>
                    <div className="text-neutral-300 space-y-0.5 font-bold uppercase text-[9px]">
                      <p>Speed: <span className="text-white font-black">{loc.speed} km/h</span></p>
                      <p>Battery: <span className="text-white font-black">{loc.batteryPercentage}%</span></p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* 2. Floating action triggers */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          <button
            onClick={handleLocateMe}
            className="p-2.5 bg-darkCard border border-[#242424] text-white hover:text-brandOrange rounded shadow-lg transition-all flex items-center justify-center shrink-0"
            title="Locate via GPS"
          >
            <Navigation size={16} />
          </button>
          <button
            onClick={() => setAutoCenter((prev) => !prev)}
            className={`p-2.5 rounded border shadow-lg transition-all flex items-center justify-center shrink-0 ${
              autoCenter ? 'bg-brandOrange/20 text-brandOrange border-brandOrange/30' : 'bg-darkCard border-[#242424] text-neutral-400'
            }`}
            title="Toggle Autocenter"
          >
            <Compass size={16} />
          </button>
        </div>

        {/* 3. Floating Separation Alert Banners */}
        {separationAlerts.length > 0 && (
          <div className="absolute bottom-4 left-4 z-20 bg-red-950/70 border border-brandCrimson/25 p-3 rounded max-w-sm fade-in shadow-xl backdrop-blur-md">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-brandCrimson mt-0.5 shrink-0" />
              <div>
                <h4 className="text-white text-xs font-black uppercase tracking-wider">Separation Alert</h4>
                <p className="text-neutral-300 text-[10px] mt-0.5 font-bold uppercase">
                  Riders falling behind (&gt;600m):
                </p>
                <div className="mt-1 space-y-0.5">
                  {separationAlerts.map((alert, idx) => (
                    <span key={idx} className="block text-[10px] text-red-400 font-bold uppercase">
                      - {alert.username} ({alert.distance})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Coordinate simulation control bar */}
      <div className="p-3 bg-darkCard border-t border-[#242424] flex flex-wrap items-center justify-between gap-4 z-20 select-none">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brandOrange/10 rounded text-brandOrange border border-brandOrange/20 shrink-0">
            <Compass size={14} className={isSimulating ? 'animate-spin' : ''} />
          </div>
          <div>
            <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block">Scenic GPS Simulator</span>
            <span className="text-xs text-neutral-300 font-black uppercase">
              {isSimulating ? `Waypoint ${simIndex}/${MOCK_ROUTE_COORDINATES.length} (${speed} km/h)` : 'Simulator Off'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isSimulating ? (
            <button
              onClick={startSimulation}
              className="px-3.5 py-1.5 bg-brandOrange hover:bg-[#e25700] text-white font-extrabold text-xs tracking-wider rounded uppercase transition-all shadow-md flex items-center gap-1.5"
            >
              <Play size={12} />
              Start Simulator
            </button>
          ) : (
            <button
              onClick={stopSimulation}
              className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-extrabold text-xs tracking-wider rounded border border-[#242424] uppercase transition-all shadow-md flex items-center gap-1.5"
            >
              <Square size={12} />
              Stop Simulator
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeafletMap;
