import React, { useState, useEffect, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Compass, Users, MapPin, Plus, Share2, LogOut, ShieldAlert, Award, Play, Square, Navigation, CheckCircle } from 'lucide-react';

// Connect to local Node server or Render backend dynamically
const SOCKET_URL = import.meta.env.MODE === 'production'
  ? 'https://easytrip-fj1o.onrender.com'
  : 'http://localhost:5000';

// Custom Map Centering Controller
const MapController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

// Map Click Listener for interactive Route planning & Checkpoints
const MapClickHandler = ({ onClick }) => {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng);
    },
  });
  return null;
};

function App() {
  // App States
  const [nickname, setNickname] = useState(() => sessionStorage.getItem('easytrip_nickname') || '');
  const [tempNickname, setTempNickname] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [rideCode, setRideCode] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // GPS Locations States
  const [currentPosition, setCurrentPosition] = useState({ lat: 12.8230, lng: 80.0440 });
  const [autoCenter, setAutoCenter] = useState(true);
  const [activeSOS, setActiveSOS] = useState(null);

  // Live Ride States (Synced across users via Socket)
  const [riders, setRiders] = useState([]);
  const [destination, setDestination] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [route, setRoute] = useState([]);
  const [isCreator, setIsCreator] = useState(false);

  // Mock Telemetry States
  const [speed, setSpeed] = useState(0);
  const [battery, setBattery] = useState(100);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simIndex, setSimIndex] = useState(0);

  // Socket & Refs
  const socketRef = useRef(null);
  const simIntervalRef = useRef(null);

  // 1. Initialize Socket.io Connection
  useEffect(() => {
    socketRef.current = io(SOCKET_URL);

    // Listeners
    socketRef.current.on('connect', () => {
      console.log('Connected to socket server:', socketRef.current.id);
    });

    socketRef.current.on('rideCreated', (ride) => {
      setRideCode(ride.code);
      setRiders(Object.values(ride.riders));
      setDestination(ride.destination);
      setCheckpoints(ride.checkpoints);
      setRoute(ride.route);
      setIsCreator(true);
      setIsJoined(true);
      setErrorMsg('');
    });

    socketRef.current.on('rideJoined', (ride) => {
      setRideCode(ride.code);
      setRiders(Object.values(ride.riders));
      setDestination(ride.destination);
      setCheckpoints(ride.checkpoints);
      setRoute(ride.route);
      setIsCreator(false);
      setIsJoined(true);
      setErrorMsg('');
    });

    socketRef.current.on('riderJoined', ({ nickname, riders }) => {
      setRiders(riders);
      triggerNotification(`${nickname} joined the ride!`);
    });

    socketRef.current.on('receiveLocation', (updatedRiders) => {
      setRiders(updatedRiders);
    });

    socketRef.current.on('checkpointAdded', (updatedCheckpoints) => {
      setCheckpoints(updatedCheckpoints);
      triggerNotification('🏁 Checkpoint added by the Group Leader!');
    });

    socketRef.current.on('routeSynced', ({ destination, route }) => {
      setDestination(destination);
      setRoute(route);
      triggerNotification('🗺️ Route updated by the Group Leader!');
    });

    socketRef.current.on('sosAlert', ({ nickname, isSOS, lat, lng }) => {
      if (isSOS) {
        setActiveSOS({ nickname, lat, lng });
      } else {
        setActiveSOS(null);
      }
    });

    socketRef.current.on('riderLeft', ({ nickname, riders }) => {
      setRiders(riders);
      triggerNotification(`${nickname} disconnected.`);
    });

    socketRef.current.on('error', (msg) => {
      setErrorMsg(msg);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  // 2. Continuous Location Watcher
  useEffect(() => {
    if (!nickname) return;

    let watchId = null;
    if (navigator.geolocation) {
      // Get current position once to bootstrap coordinates
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCurrentPosition(coords);
        },
        (err) => console.warn('Initial GPS query deferred:', err.message)
      );

      // Start continuous watching
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (isSimulating) return; // Ignore actual coordinates if simulator is driving
          const { latitude, longitude, speed: gpsSpeed } = pos.coords;
          const coords = { lat: latitude, lng: longitude };
          setCurrentPosition(coords);

          // Convert speed to km/h
          const speedKmH = gpsSpeed ? Math.round(gpsSpeed * 3.6) : 0;
          setSpeed(speedKmH);

          // Stream coordinates to group room
          if (isJoined && rideCode) {
            socketRef.current.emit('sendLocation', {
              rideCode,
              lat: latitude,
              lng: longitude,
            });
          }
        },
        (err) => console.warn('GPS tracking error:', err.message),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [nickname, isJoined, rideCode, isSimulating]);

  // 3. User Actions
  const handleEnterNickname = (e) => {
    e.preventDefault();
    if (!tempNickname.trim()) return;

    sessionStorage.setItem('easytrip_nickname', tempNickname.trim());
    setNickname(tempNickname.trim());
  };

  const handleCreateRide = () => {
    if (!nickname || !socketRef.current) return;
    socketRef.current.emit('createRide', {
      nickname,
      startLocation: currentPosition,
    });
  };

  const handleJoinRide = (e) => {
    e.preventDefault();
    if (!nickname || !joinCodeInput.trim() || !socketRef.current) return;

    socketRef.current.emit('joinRide', {
      rideCode: joinCodeInput.trim().toUpperCase(),
      nickname,
      currentLocation: currentPosition,
    });
  };

  const handleLeaveRide = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.connect(); // Reconnect fresh
    }
    setIsJoined(false);
    setRideCode('');
    setDestination(null);
    setCheckpoints([]);
    setRoute([]);
    setIsCreator(false);
    setRiders([]);
    setActiveSOS(null);
    stopSimulation();
  };

  const handleMapClick = (latlng) => {
    if (!isJoined || !isCreator || !rideCode) return;

    if (!destination) {
      // 1. Destination not set -> Set Destination and construct route polyline
      const destCoords = { lat: latlng.lat, lng: latlng.lng };
      const routePath = [
        [currentPosition.lat, currentPosition.lng],
        [latlng.lat, latlng.lng],
      ];
      setDestination(destCoords);
      setRoute(routePath);

      socketRef.current.emit('updateRoute', {
        rideCode,
        destination: destCoords,
        route: routePath,
      });
    } else {
      // 2. Destination set -> Add Checkpoints
      const cpIndex = checkpoints.length + 1;
      const newCheckpoint = {
        name: `CP-${cpIndex}`,
        lat: latlng.lat,
        lng: latlng.lng,
        order: cpIndex,
      };

      socketRef.current.emit('addCheckpoint', {
        rideCode,
        checkpoint: newCheckpoint,
      });
    }
  };

  // SOS button trigger
  const handleToggleSOS = () => {
    if (!isJoined || !rideCode) return;
    const isCurrentlySOS = riders.find(r => r.socketId === socketRef.current.id)?.isSOS || false;
    const nextSOSState = !isCurrentlySOS;

    socketRef.current.emit('sosAlert', {
      rideCode,
      nickname,
      isSOS: nextSOSState,
    });
  };

  // 4. Scenic GPS Route Simulator for Indoor Verification
  const startSimulation = () => {
    if (isSimulating || !isJoined || !rideCode) return;

    setIsSimulating(true);
    triggerNotification('Starting scenic GPS simulator path...');

    // Generate mock route coordinates from start to destination
    const startPoint = currentPosition;
    const endPoint = destination || { lat: startPoint.lat + 0.05, lng: startPoint.lng + 0.05 };

    const steps = 15;
    const mockCoordinates = [];
    for (let i = 0; i <= steps; i++) {
      const fraction = i / steps;
      mockCoordinates.push({
        lat: startPoint.lat + (endPoint.lat - startPoint.lat) * fraction,
        lng: startPoint.lng + (endPoint.lng - startPoint.lng) * fraction,
      });
    }

    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= mockCoordinates.length) {
        clearInterval(interval);
        setIsSimulating(false);
        setSpeed(0);
        triggerNotification('Simulation route completed!');
        return;
      }

      const coords = mockCoordinates[idx];
      setCurrentPosition(coords);
      setSpeed(Math.round(45 + Math.random() * 15));
      setBattery(prev => Math.max(15, prev - 2));

      socketRef.current.emit('sendLocation', {
        rideCode,
        lat: coords.lat,
        lng: coords.lng,
      });

      idx++;
      setSimIndex(idx);
    }, 3000);

    simIntervalRef.current = interval;
  };

  const stopSimulation = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      setIsSimulating(false);
      setSpeed(0);
      triggerNotification('Simulator stopped.');
    }
  };

  // Notifications Toast Trigger
  const [toast, setToast] = useState('');
  const triggerNotification = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  // Custom marker generators
  const getRiderIcon = (color, isMe = false, isSOS = false) => {
    return L.divIcon({
      className: 'custom-rider-icon',
      html: `
        <div class="relative flex flex-col items-center">
          <div class="w-7 h-7 rounded-full border-2 ${isMe ? 'border-white' : 'border-neutral-800'} flex items-center justify-center shadow-lg relative" style="background-color: ${color}">
            <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
            ${isSOS ? `<div class="absolute inset-0 rounded-full border-2 border-red-500 animate-ping"></div>` : ''}
          </div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  };

  const getCheckpointIcon = (order) => {
    return L.divIcon({
      className: 'custom-cp-icon',
      html: `
        <div class="w-6 h-6 rounded bg-[#121212] border-2 border-[#fc6100] flex items-center justify-center font-black text-[10px] text-[#fc6100] rotate-45 shadow-md">
          <span class="-rotate-45">${order}</span>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  const getFinishIcon = () => {
    return L.divIcon({
      className: 'custom-finish-icon',
      html: `
        <div class="w-7 h-7 rounded bg-[#fc6100] border border-white flex items-center justify-center font-black text-white text-[12px] shadow-lg animate-bounce">
          🏁
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
  };

  // Clean UI Nickname overlay if not set
  if (!nickname) {
    return (
      <div className="min-h-screen bg-darkBg flex flex-col items-center justify-center p-4 font-sans select-none relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(252,97,0,0.12),transparent_70%)] pointer-events-none"></div>

        <div className="w-full max-w-sm p-6 rounded-lg glass-panel shadow-2xl relative z-10 flex flex-col items-center">
          <div className="w-10 h-10 rounded bg-brandOrange flex items-center justify-center text-white font-black text-xl mb-4 shadow-lg animate-pulse-orange">
            🧭
          </div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase">
            EASY<span className="text-brandOrange">TRIP</span>
          </h1>
          <p className="text-neutral-400 text-xs mt-1 text-center font-semibold uppercase tracking-wider mb-6">
            Real-Time Group Coordination Map
          </p>

          <form onSubmit={handleEnterNickname} className="w-full space-y-4">
            <div>
              <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-1.5 text-center">
                CHOOSE RIDER NICKNAME
              </label>
              <input
                type="text"
                value={tempNickname}
                onChange={(e) => setTempNickname(e.target.value)}
                placeholder="e.g. AMAN"
                required
                maxLength={10}
                className="w-full py-2.5 px-3 rounded glass-input text-xs text-center font-bold tracking-widest uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={!tempNickname.trim()}
              className="w-full py-2.5 bg-brandOrange hover:bg-[#e25700] text-white font-extrabold text-xs tracking-widest uppercase transition-all shadow-md rounded"
            >
              Enter Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden relative font-sans select-none bg-black">
      {/* 1. Full-Screen Modern Dark Map */}
      <div className="h-full w-full relative z-10">
        <MapContainer
          center={[currentPosition.lat, currentPosition.lng]}
          zoom={14}
          zoomControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          <MapController center={autoCenter ? [currentPosition.lat, currentPosition.lng] : null} />
          <MapClickHandler onClick={handleMapClick} />

          {/* Polyline Route */}
          {route.length > 0 && (
            <Polyline
              positions={route}
              color="#fc6100"
              weight={4}
              opacity={0.8}
            />
          )}

          {/* Checkpoints Markers */}
          {checkpoints.map((cp, idx) => (
            <Marker
              key={idx}
              position={[cp.lat, cp.lng]}
              icon={getCheckpointIcon(cp.order)}
            >
              <Popup>
                <div className="text-xs p-1 font-sans">
                  <h4 className="font-extrabold text-[#fc6100] uppercase text-[10px]">Checkpoint {cp.order}</h4>
                  <p className="text-white mt-0.5 font-bold uppercase text-[9px]">{cp.name}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Destination Finish Marker */}
          {destination && (
            <Marker
              position={[destination.lat, destination.lng]}
              icon={getFinishIcon()}
            >
              <Popup>
                <div className="text-xs p-1 font-sans text-center">
                  <span className="font-black text-white text-[10px] uppercase">🏁 DESTINATION ENDPOINT</span>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Live Riders Markers */}
          {riders.map((loc) => {
            const isMe = loc.socketId === socketRef.current?.id;
            return (
              <Marker
                key={loc.socketId}
                position={[loc.lat, loc.lng]}
                icon={getRiderIcon(loc.color, isMe, loc.isSOS)}
              >
                <Popup>
                  <div className="text-xs p-2 min-w-[120px] font-sans">
                    <div className="flex items-center justify-between border-b border-[#242424] pb-1.5 mb-1.5 select-none">
                      <span className="font-black text-white text-xs uppercase tracking-wider">{loc.nickname}</span>
                      {isMe && <span className="text-[8px] bg-brandOrange/20 text-brandOrange px-1 rounded uppercase font-black">Me</span>}
                    </div>
                    <div className="space-y-1 font-black text-neutral-400 uppercase text-[9px]">
                      <p>Speed: <span className="text-white">{isMe ? speed : loc.speed || 0} km/h</span></p>
                      <p>Emergency: <span className={loc.isSOS ? 'text-red-500' : 'text-emerald-500'}>{loc.isSOS ? 'ACTIVE' : 'NONE'}</span></p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* 2. Top-Left Floating Logo Card */}
      <div className="absolute top-4 left-4 z-20 glass-panel p-3.5 rounded-lg flex flex-col shadow-2xl">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-brandOrange flex items-center justify-center text-white font-black text-xs">
            🧭
          </div>
          <span className="text-sm font-black tracking-tight text-white select-none">
            EASY<span className="text-brandOrange">TRIP</span>
          </span>
        </div>
        {isJoined && (
          <div className="mt-2.5 pt-2 border-t border-[#242424] flex flex-col gap-0.5">
            <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider">ACTIVE GROUP CODE</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white tracking-widest uppercase select-all">{rideCode}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(rideCode);
                  triggerNotification('Invite code copied to clipboard!');
                }}
                className="p-1 hover:bg-[#1c1c1e] text-neutral-400 hover:text-brandOrange rounded border border-[#2c2c2e] transition-all"
                title="Copy Invite Code"
              >
                <Share2 size={10} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Top-Right Active Telemetry & Riders Drawer */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2.5">
        {/* Map Center & Autocenter Controls */}
        <div className="flex gap-2">
          <button
            onClick={() => setAutoCenter(prev => !prev)}
            className={`p-2 rounded-lg shadow-2xl border transition-all ${
              autoCenter ? 'bg-brandOrange/25 border-brandOrange/45 text-brandOrange' : 'glass-panel text-neutral-400'
            }`}
            title="Toggle Map Auto-Centering"
          >
            <Compass size={16} />
          </button>
          <button
            onClick={() => {
              setAutoCenter(true);
              setCurrentPosition({ ...currentPosition });
            }}
            className="p-2 glass-panel hover:bg-neutral-800 rounded-lg text-white shadow-2xl"
            title="Locate Me"
          >
            <Navigation size={16} />
          </button>
        </div>

        {/* Live Active Riders List */}
        {isJoined && (
          <div className="glass-panel p-3.5 rounded-lg shadow-2xl w-44 max-h-56 overflow-y-auto flex flex-col gap-2.5">
            <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Users size={10} /> Group Riders ({riders.length})
            </span>
            <div className="space-y-2.5">
              {riders.map((r) => {
                const isMe = r.socketId === socketRef.current?.id;
                return (
                  <div key={r.socketId} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: r.color }}></span>
                      <span className="text-white font-extrabold truncate uppercase">{r.nickname}</span>
                      {isMe && <span className="text-[7px] text-neutral-500 font-black tracking-wide">(ME)</span>}
                    </div>
                    {r.isSOS && (
                      <span className="text-[7px] bg-red-950/80 border border-red-500/20 text-red-500 font-black px-1.5 py-0.5 rounded animate-pulse shrink-0">
                        SOS
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Full-Screen Flashing SOS Alert Warning Overlay */}
      {activeSOS && (
        <div className="absolute inset-0 bg-red-950/85 z-40 flex flex-col items-center justify-center p-6 animate-pulse-red">
          <div className="w-14 h-14 rounded-full bg-red-600 border border-white flex items-center justify-center text-white mb-4 animate-bounce">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-xl font-black text-white tracking-widest uppercase">
            🚨 EMERGENCY BROADCAST 🚨
          </h2>
          <p className="text-white/80 text-xs font-bold mt-2 uppercase tracking-wide text-center max-w-xs">
            Rider <span className="text-white font-black underline">{activeSOS.nickname}</span> triggered an emergency SOS distress alert.
          </p>
          <div className="flex gap-3 mt-8">
            <button
              onClick={() => {
                setAutoCenter(false);
                setCurrentPosition({ lat: activeSOS.lat, lng: activeSOS.lng });
                setActiveSOS(null);
                triggerNotification(`Centering map on ${activeSOS.nickname}...`);
              }}
              className="px-4 py-2 bg-white text-red-700 font-black text-xs uppercase tracking-widest rounded-lg shadow-lg hover:bg-neutral-100 transition-all"
            >
              Locate Rider
            </button>
            <button
              onClick={() => setActiveSOS(null)}
              className="px-4 py-2 bg-transparent border border-white/20 text-white/70 hover:text-white font-bold text-xs uppercase tracking-widest rounded-lg transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 5. Bottom Coordination Control Deck */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-md px-4">
        <div className="glass-panel p-4 rounded-xl shadow-2xl flex flex-col gap-3.5 select-none relative">
          
          {errorMsg && (
            <div className="p-2 mb-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md text-[10px] font-bold text-center uppercase tracking-wider">
              {errorMsg}
            </div>
          )}

          {/* SCENARIO A: User is in the Dashboard (Not Joined) */}
          {!isJoined ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#242424] pb-2">
                <span className="text-[10px] text-neutral-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
                  🏁 EasyTrip Cockpit
                </span>
                <span className="text-[8px] bg-brandOrange/15 text-brandOrange border border-brandOrange/25 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                  Rider: {nickname}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {/* Create Ride widget */}
                <button
                  onClick={handleCreateRide}
                  className="py-3 px-3 rounded-lg bg-brandOrange hover:bg-[#e25700] text-white font-black text-xs tracking-wider uppercase transition-all shadow-md flex flex-col items-center justify-center gap-1.5"
                >
                  <Plus size={16} />
                  <span>Create Ride</span>
                </button>

                {/* Join Ride form */}
                <form onSubmit={handleJoinRide} className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value)}
                    placeholder="ENTER RIDE CODE"
                    required
                    maxLength={10}
                    className="w-full py-1.5 px-2 rounded glass-input text-[10px] text-center font-bold uppercase tracking-wider text-white"
                  />
                  <button
                    type="submit"
                    disabled={!joinCodeInput.trim()}
                    className="py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-45 text-white border border-[#242424] rounded font-black text-[10px] tracking-wider uppercase transition-all flex items-center justify-center gap-1"
                  >
                    Join Ride
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* SCENARIO B: User has created/joined a Ride Session */
            <div className="flex flex-col gap-3.5">
              {/* Telemetry statistics overlay */}
              <div className="grid grid-cols-3 gap-2 text-center select-none border-b border-[#242424] pb-3">
                <div className="flex flex-col">
                  <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider">SPEED</span>
                  <span className="text-sm font-black text-white">{speed} <span className="text-[9px] text-neutral-400">km/h</span></span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider">BATTERY</span>
                  <span className={`text-sm font-black ${battery < 25 ? 'text-red-500' : 'text-white'}`}>{battery}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider">RIDE ROOM</span>
                  <span className="text-sm font-black text-brandOrange tracking-wider select-all">{rideCode}</span>
                </div>
              </div>

              {/* Creator instructions guidance */}
              {isCreator && !destination && (
                <div className="p-2.5 bg-brandOrange/10 border border-brandOrange/20 rounded-lg text-[9.5px] text-brandOrange font-bold uppercase tracking-wide leading-relaxed text-center flex items-center justify-center gap-1.5 animate-pulse">
                  <MapPin size={12} className="shrink-0" />
                  <span>Click anywhere on the map to set DESTINATION!</span>
                </div>
              )}

              {isCreator && destination && (
                <div className="p-2 bg-[#121212] border border-[#242424] rounded text-[9px] text-neutral-400 font-bold uppercase text-center flex items-center justify-center gap-1.5">
                  <CheckCircle size={10} className="text-emerald-500 shrink-0" />
                  <span>Destination Selected. Click map to add Checkpoints!</span>
                </div>
              )}

              {/* Indoor Simulators & Emergency SOS Deck */}
              <div className="flex items-center gap-2 select-none">
                {/* Emergency SOS Distress Alert Toggle */}
                <button
                  onClick={handleToggleSOS}
                  className={`grow py-2.5 px-3.5 rounded-lg font-black text-[10px] tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0 ${
                    riders.find(r => r.socketId === socketRef.current?.id)?.isSOS
                      ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                      : 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500'
                  }`}
                >
                  <ShieldAlert size={14} />
                  <span>{riders.find(r => r.socketId === socketRef.current?.id)?.isSOS ? 'Cancel SOS' : 'Trigger SOS'}</span>
                </button>

                {/* Simulator Driver control */}
                {destination && (
                  <>
                    {!isSimulating ? (
                      <button
                        onClick={startSimulation}
                        className="py-2.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-[#242424] font-black text-[10px] tracking-wider uppercase transition-all flex items-center justify-center gap-1 shrink-0"
                        title="Simulate Route Movement"
                      >
                        <Play size={12} />
                        Sim Route
                      </button>
                    ) : (
                      <button
                        onClick={stopSimulation}
                        className="py-2.5 px-3 rounded-lg bg-[#2b2b2b] text-brandOrange border border-brandOrange/25 font-black text-[10px] tracking-wider uppercase transition-all flex items-center justify-center gap-1 shrink-0 animate-pulse"
                      >
                        <Square size={12} />
                        Stop Sim
                      </button>
                    )}
                  </>
                )}

                {/* Disconnect Exit session */}
                <button
                  onClick={handleLeaveRide}
                  className="py-2.5 px-3 bg-neutral-900 border border-[#242424] hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg font-black text-[10px] tracking-wider uppercase transition-all flex items-center justify-center gap-1 shrink-0"
                  title="Leave Trip room"
                >
                  <LogOut size={12} />
                  Exit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. Toast Notifications overlay banner */}
      {toast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-neutral-900/95 border border-[#242424] py-2 px-4 rounded-lg text-white font-extrabold text-[10px] uppercase tracking-wider shadow-2xl backdrop-blur-md fade-in flex items-center gap-2 select-none">
          <Award size={12} className="text-brandOrange" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

export default App;
