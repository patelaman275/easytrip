import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useActiveTrip } from '../../context/ActiveTripContext';
import { useAuth } from '../../context/AuthContext';
import { Play, Square, RefreshCw, AlertTriangle, Compass, Navigation } from 'lucide-react';
import { calculateDistance, formatDistance, MOCK_ROUTE_COORDINATES } from '../../utils/geoUtils';

// 1. Map Auto-Center Controller Component
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

  const [currentPosition, setCurrentPosition] = useState([37.7749, -122.4194]); // SF default
  const [speed, setSpeed] = useState(0);
  const [battery, setBattery] = useState(100);
  const [autoCenter, setAutoCenter] = useState(true);

  // Simulation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simIndex, setSimIndex] = useState(0);
  const simIntervalRef = useRef(null);

  // Checkpoints reached tracker
  const [reachedCheckpoints, setReachedCheckpoints] = useState(new Set());

  // Handle actual browser geolocation
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

  // 2. Custom Leaflet SVG Div Icons to ensure beautiful styling and zero broken asset paths
  const createRiderIcon = (username, isLocal = false) => {
    return L.divIcon({
      className: 'rider-map-icon',
      html: `
        <div class="relative flex flex-col items-center">
          <div class="w-8 h-8 rounded-full border-2 ${
            isLocal ? 'border-brandCyan bg-cyan-500/25' : 'border-brandPurple bg-violet-600/25'
          } flex items-center justify-center shadow-lg relative animate-fade-in">
            <div class="w-2.5 h-2.5 rounded-full ${isLocal ? 'bg-brandCyan' : 'bg-brandPurple'}"></div>
            <!-- Pulse indicator -->
            <div class="absolute inset-0 rounded-full ${
              isLocal ? 'border border-brandCyan animate-ping opacity-60' : 'border border-brandPurple animate-ping opacity-40'
            }"></div>
          </div>
          <div class="mt-1 px-1.5 py-0.5 bg-darkCard/90 border border-white/10 text-[10px] font-bold text-white rounded whitespace-nowrap shadow-md">
            ${username}
          </div>
        </div>
      `,
      iconSize: [40, 48],
      iconAnchor: [20, 24],
    });
  };

  const createSOSIcon = (username) => {
    return L.divIcon({
      className: 'rider-map-icon',
      html: `
        <div class="relative flex flex-col items-center">
          <div class="w-10 h-10 rounded-full border-2 border-brandCrimson bg-red-500/30 flex items-center justify-center shadow-xl animate-bounce">
            <span class="text-xs font-bold text-white uppercase animate-pulse">SOS</span>
          </div>
          <div class="absolute inset-0 rounded-full border-4 border-red-500/50 animate-ping" style="animation-duration: 1.2s"></div>
          <div class="mt-1 px-1.5 py-0.5 bg-brandCrimson border border-white/20 text-[10px] font-black text-white rounded whitespace-nowrap shadow-md uppercase tracking-wider">
            🚨 ${username} HELP
          </div>
        </div>
      `,
      iconSize: [50, 58],
      iconAnchor: [25, 30],
    });
  };

  const createCheckpointIcon = (name, order) => {
    return L.divIcon({
      className: 'rider-map-icon',
      html: `
        <div class="relative flex flex-col items-center">
          <div class="w-7 h-7 rounded-lg bg-slate-800 border-2 border-brandCyan flex items-center justify-center font-black text-xs text-brandCyan shadow-lg rotate-45">
            <span class="-rotate-45">${order}</span>
          </div>
          <div class="mt-2 px-1.5 py-0.5 bg-slate-900/90 border border-brandCyan/20 text-[9px] font-semibold text-white rounded whitespace-nowrap shadow-md">
            🏁 ${name}
          </div>
        </div>
      `,
      iconSize: [40, 48],
      iconAnchor: [20, 24],
    });
  };

  // 3. Location Simulation Engine (Coastal Scenic Route Driver)
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

      // Decrement battery and set random speed
      const newSpeed = Math.round(50 + Math.random() * 20); // 50-70 km/h
      const newBattery = Math.max(20, 100 - idx * 5); // depletion

      setSpeed(newSpeed);
      setBattery(newBattery);
      updateLocation(coords[0], coords[1], newSpeed, newBattery);

      // 4. Trigger checkpoint crossing detection (< 200m separation)
      if (activeTrip?.checkpoints) {
        activeTrip.checkpoints.forEach((cp, cpIdx) => {
          const dist = calculateDistance(coords[0], coords[1], cp.coords.lat, cp.coords.lng);
          if (dist < 0.25 && !reachedCheckpoints.has(cp.name)) {
            // Reached checkpoint!
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
    }, 4500); // Step coordinate every 4.5 seconds

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

  // Update initial location on room joined
  useEffect(() => {
    if (activeTrip && currentPosition) {
      updateLocation(currentPosition[0], currentPosition[1], speed, battery);
    }
  }, [activeTrip]);

  // Compute separation metrics between user and nearby riders
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
    <div className="flex flex-col h-[520px] rounded-2xl overflow-hidden glass-panel border border-white/10 shadow-2xl relative">
      {/* 1. Map container panel */}
      <div className="grow w-full h-full relative z-10">
        <MapContainer
          center={currentPosition}
          zoom={14}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
        >
          {/* Dark Mode Theme filter via standard OpenStreetMap tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="dark-map-tiles"
          />

          <MapController center={autoCenter ? currentPosition : null} />

          {/* Draw trip route polyline pathway */}
          {activeTrip?.route?.polyline?.length > 0 && (
            <Polyline
              positions={activeTrip.route.polyline}
              color="#8b5cf6"
              weight={5}
              opacity={0.8}
            />
          )}

          {/* Render active checkpoints pins */}
          {activeTrip?.checkpoints?.map((cp, idx) => (
            <Marker
              key={cp._id || idx}
              position={[cp.coords.lat, cp.coords.lng]}
              icon={createCheckpointIcon(cp.name, cp.order)}
            >
              <Popup>
                <div className="text-xs p-1">
                  <h4 className="font-extrabold text-white text-sm">Checkpoint {cp.order}</h4>
                  <p className="text-gray-300 mt-1">{cp.name}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Render other riders live tracked positions */}
          {ridersLocations.map((loc) => {
            const isMe = loc.userId === user?.id;
            // Check if rider has active SOS alert in history
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
                  <div className="text-xs p-1.5 min-w-[130px] space-y-1.5">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1">
                      <span className="font-extrabold text-white text-sm">{loc.username}</span>
                      {isMe && <span className="text-[9px] bg-cyan-500/20 text-brandCyan px-1.5 rounded uppercase font-black">Me</span>}
                    </div>
                    <div className="text-gray-300 space-y-0.5">
                      <p>Speed: <span className="text-white font-bold">{loc.speed} km/h</span></p>
                      <p>Battery: <span className="text-white font-bold">{loc.batteryPercentage}%</span></p>
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
            className="p-3 bg-darkCard/95 hover:bg-slate-800 text-brandCyan rounded-xl border border-white/10 shadow-lg transition-all flex items-center justify-center shrink-0"
            title="Locate via GPS"
          >
            <Navigation size={18} />
          </button>
          <button
            onClick={() => setAutoCenter((prev) => !prev)}
            className={`p-3 rounded-xl border border-white/10 shadow-lg transition-all flex items-center justify-center shrink-0 ${
              autoCenter ? 'bg-brandCyan/20 text-brandCyan' : 'bg-darkCard/95 hover:bg-slate-800 text-gray-400'
            }`}
            title="Toggle Autocenter"
          >
            <Compass size={18} />
          </button>
        </div>

        {/* 3. Floating Separation Alert Banners */}
        {separationAlerts.length > 0 && (
          <div className="absolute bottom-4 left-4 z-20 glass-panel border border-brandCrimson/20 p-3 rounded-xl max-w-sm fade-in shadow-xl bg-red-950/40">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-brandCrimson mt-0.5 shrink-0" />
              <div>
                <h4 className="text-white text-xs font-bold uppercase tracking-wider">Separation Warning</h4>
                <p className="text-gray-300 text-[10px] mt-0.5">
                  Riders getting separated (&gt;600m):
                </p>
                <div className="mt-1 space-y-0.5">
                  {separationAlerts.map((alert, idx) => (
                    <span key={idx} className="block text-[10px] text-red-300 font-semibold">
                      - {alert.username} ({alert.distance} away)
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Coordinate simulation control bar */}
      <div className="p-3 bg-darkCard border-t border-white/5 flex flex-wrap items-center justify-between gap-4 z-20 select-none">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-600/10 rounded-lg text-brandPurple shrink-0">
            <Compass size={16} className={isSimulating ? 'animate-spin' : ''} />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Scenic GPS Simulator</span>
            <span className="text-xs text-gray-300">
              {isSimulating ? `Waypoint ${simIndex}/${MOCK_ROUTE_COORDINATES.length} (${speed} km/h)` : 'Simulator Idle'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isSimulating ? (
            <button
              onClick={startSimulation}
              className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold text-xs tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-1.5"
            >
              <Play size={12} />
              Start Simulator
            </button>
          ) : (
            <button
              onClick={stopSimulation}
              className="px-3.5 py-1.5 bg-brandCrimson hover:bg-red-500 text-white font-bold text-xs tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-1.5"
            >
              <Square size={12} />
              Pause Simulator
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeafletMap;
