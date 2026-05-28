import React, { useState, useEffect, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { 
  Compass, Users, MapPin, Plus, Share2, LogOut, ShieldAlert, Award, 
  Play, Square, Navigation, CheckCircle, MessageSquare, Bell, CloudSun,
  Activity, Zap, Trash2, ArrowRight
} from 'lucide-react';

// Connect to local Node server or Render backend dynamically
const SOCKET_URL = import.meta.env.MODE === 'production'
  ? 'https://easytrip-fj1o.onrender.com'
  : 'http://localhost:5000';

// Haversine geodesic distance calculator in km
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; 
  return d;
};

// Dynamic Map View Control Centering
const MapController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

// Click listener to set Destination and drop Checkpoints dynamically
const MapClickHandler = ({ onClick }) => {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng);
    },
  });
  return null;
};

function App() {
  // Authentication & Entrance
  const [nickname, setNickname] = useState(() => sessionStorage.getItem('easytrip_nickname') || '');
  const [tempNickname, setTempNickname] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [rideCode, setRideCode] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // GPS Coordinates & Map Tracking
  const [currentPosition, setCurrentPosition] = useState({ lat: 12.8230, lng: 80.0440 });
  const [startPoint, setStartPoint] = useState(null);
  const [autoCenter, setAutoCenter] = useState(true);
  const [activeSOS, setActiveSOS] = useState(null);

  // Synced Room States
  const [riders, setRiders] = useState([]);
  const [destination, setDestination] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [route, setRoute] = useState([]);
  const [isCreator, setIsCreator] = useState(false);

  // Group Chat & System Logs (Right Panel)
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [systemLogs, setSystemLogs] = useState([]);
  const [activeRightTab, setActiveRightTab] = useState('chat'); // 'chat' or 'logs'

  // Dynamic Telemetry Metrics
  const [speed, setSpeed] = useState(0);
  const [battery, setBattery] = useState(100);

  // Socket & Refs
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const pendingJoinCodeRef = useRef(new URLSearchParams(window.location.search).get('join'));

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 1. Setup Sockets listeners
  useEffect(() => {
    socketRef.current = io(SOCKET_URL);

    socketRef.current.on('connect', () => {
      console.log('Connected to server socket:', socketRef.current.id);
      
      // Auto-join from invite share URL
      const savedNickname = sessionStorage.getItem('easytrip_nickname');
      if (savedNickname && pendingJoinCodeRef.current) {
        socketRef.current.emit('joinRide', {
          rideCode: pendingJoinCodeRef.current.toUpperCase(),
          nickname: savedNickname,
          currentLocation: currentPosition,
        });
        pendingJoinCodeRef.current = null;
        window.history.replaceState({}, '', window.location.pathname);
      }
    });

    socketRef.current.on('rideCreated', (ride) => {
      setRideCode(ride.code);
      setRiders(Object.values(ride.riders));
      setDestination(ride.destination);
      setCheckpoints(ride.checkpoints);
      setRoute(ride.route);
      setStartPoint(currentPosition);
      setIsCreator(true);
      setIsJoined(true);
      setErrorMsg('');
      addSystemLog('Ride room created. Click on the map to set your target destination.');
    });

    socketRef.current.on('rideJoined', (ride) => {
      setRideCode(ride.code);
      setRiders(Object.values(ride.riders));
      setDestination(ride.destination);
      setCheckpoints(ride.checkpoints);
      setRoute(ride.route);
      const creatorRider = Object.values(ride.riders).find(r => r.socketId === ride.creatorId);
      setStartPoint(creatorRider ? { lat: creatorRider.lat, lng: creatorRider.lng } : currentPosition);
      setIsCreator(false);
      setIsJoined(true);
      setErrorMsg('');
      addSystemLog(`Joined room: ${ride.code}`);
    });

    socketRef.current.on('riderJoined', ({ nickname, riders }) => {
      setRiders(riders);
      addSystemLog(`${nickname} joined the ride.`);
      triggerNotification(`${nickname} joined the ride!`);
    });

    socketRef.current.on('receiveLocation', (updatedRiders) => {
      setRiders(updatedRiders);
    });

    socketRef.current.on('checkpointAdded', (updatedCheckpoints) => {
      setCheckpoints(updatedCheckpoints);
      addSystemLog(`Leader dropped Checkpoint ${updatedCheckpoints.length}.`);
      triggerNotification('🏁 Checkpoint added by the Group Leader!');
    });

    socketRef.current.on('routeSynced', ({ destination, route }) => {
      setDestination(destination);
      setRoute(route);
      addSystemLog('Leader synchronized destination path.');
      triggerNotification('🗺️ Route updated by the Group Leader!');
    });

    socketRef.current.on('sosAlert', ({ nickname, isSOS, lat, lng }) => {
      if (isSOS) {
        setActiveSOS({ nickname, lat, lng });
        addSystemLog(`🚨 EMERGENCY: SOS triggered by ${nickname}!`);
      } else {
        setActiveSOS(null);
        addSystemLog(`✅ SOS resolved by ${nickname}.`);
      }
    });

    socketRef.current.on('receiveMessage', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socketRef.current.on('riderLeft', ({ nickname, riders }) => {
      setRiders(riders);
      addSystemLog(`${nickname} disconnected.`);
      triggerNotification(`${nickname} disconnected.`);
    });

    socketRef.current.on('error', (msg) => {
      setErrorMsg(msg);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // 2. Geolocation Watch Position
  useEffect(() => {
    if (!nickname) return;

    let watchId = null;
    if (navigator.geolocation) {
      // Fetch baseline position instantly
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCurrentPosition(coords);
        },
        (err) => console.warn('GPS bootstrapping deferred:', err.message)
      );

      // Start watcher
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, speed: gpsSpeed } = pos.coords;
          const coords = { lat: latitude, lng: longitude };
          setCurrentPosition(coords);

          const speedKmH = gpsSpeed ? Math.round(gpsSpeed * 3.6) : 0;
          setSpeed(speedKmH);

          if (isJoined && rideCode) {
            socketRef.current.emit('sendLocation', {
              rideCode,
              lat: latitude,
              lng: longitude,
            });
          }
        },
        (err) => console.warn('Continuous GPS tracking error:', err.message),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [nickname, isJoined, rideCode]);

  // 3. OSRM Road Routing API Integration
  const fetchRoadRoute = async (start, dest, cps = []) => {
    try {
      // Sort checkpoints by order sequence
      const sortedCps = [...cps].sort((a, b) => a.order - b.order);
      
      // Construct routing coordinate segments list: Start Point -> Checkpoints -> Destination End Point
      const pointsList = [
        start,
        ...sortedCps.map(cp => ({ lat: cp.lat, lng: cp.lng })),
        dest
      ];

      // OSRM coordinates are structured: lng,lat separated by semicolons
      const coordString = pointsList.map(pt => `${pt.lng},${pt.lat}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        // Parse geometry coordinates from [lng, lat] back into Leaflet's [lat, lng] format
        const roadCoords = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        return roadCoords;
      }
    } catch (err) {
      console.warn('OSRM road routing failed, falling back to straight segment map:', err.message);
    }
    
    // Safety Fallback: Straight segment route connections
    const fallbackPath = [[start.lat, start.lng]];
    cps.forEach(cp => fallbackPath.push([cp.lat, cp.lng]));
    fallbackPath.push([dest.lat, dest.lng]);
    return fallbackPath;
  };

  // 4. User Actions
  const handleEnterNickname = (e) => {
    e.preventDefault();
    if (!tempNickname.trim()) return;

    const trimmed = tempNickname.trim();
    sessionStorage.setItem('easytrip_nickname', trimmed);
    setNickname(trimmed);

    // Auto-join if user holds a pending ride share link
    if (pendingJoinCodeRef.current && socketRef.current) {
      socketRef.current.emit('joinRide', {
        rideCode: pendingJoinCodeRef.current.toUpperCase(),
        nickname: trimmed,
        currentLocation: currentPosition,
      });
      pendingJoinCodeRef.current = null;
      window.history.replaceState({}, '', window.location.pathname);
    }
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
      socketRef.current.connect();
    }
    setIsJoined(false);
    setRideCode('');
    setDestination(null);
    setCheckpoints([]);
    setRoute([]);
    setIsCreator(false);
    setRiders([]);
    setActiveSOS(null);
    setMessages([]);
    setSystemLogs([]);
  };

  const handleMapClick = async (latlng) => {
    if (!isJoined || !isCreator || !rideCode) return;

    if (!destination) {
      // 1. Select destination finish point & query actual road routing path
      const destCoords = { lat: latlng.lat, lng: latlng.lng };
      triggerNotification('Connecting target road routes...');

      const roadRoute = await fetchRoadRoute(currentPosition, destCoords, []);
      setDestination(destCoords);
      setRoute(roadRoute);

      socketRef.current.emit('updateRoute', {
        rideCode,
        destination: destCoords,
        route: roadRoute,
      });
    } else {
      // 2. Select checkpoints (dynamic road routing recalculation)
      const cpIndex = checkpoints.length + 1;
      const newCheckpoint = {
        name: `CP-${cpIndex}`,
        lat: latlng.lat,
        lng: latlng.lng,
        order: cpIndex,
      };

      triggerNotification(`Planning route segment via Checkpoint ${cpIndex}...`);
      const updatedCPs = [...checkpoints, newCheckpoint];
      setCheckpoints(updatedCPs);

      // Re-calculate the winding road route passing through all checkpoints to destination
      const roadRoute = await fetchRoadRoute(currentPosition, destination, updatedCPs);
      setRoute(roadRoute);

      // Broadcast checkpoints
      socketRef.current.emit('addCheckpoint', {
        rideCode,
        checkpoint: newCheckpoint,
      });

      // Broadcast recalculated route geometry
      socketRef.current.emit('updateRoute', {
        rideCode,
        destination,
        route: roadRoute,
      });
    }
  };

  const handleClearRoute = () => {
    if (!isCreator || !rideCode) return;
    setDestination(null);
    setRoute([]);
    setCheckpoints([]);

    socketRef.current.emit('updateRoute', {
      rideCode,
      destination: null,
      route: [],
    });
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !isJoined || !rideCode) return;

    socketRef.current.emit('sendMessage', {
      rideCode,
      nickname,
      message: chatInput.trim(),
    });
    setChatInput('');
  };

  const handleToggleSOS = () => {
    if (!isJoined || !rideCode) return;
    const myRiderInfo = riders.find(r => r.socketId === socketRef.current.id);
    const currentlySOS = myRiderInfo ? myRiderInfo.isSOS : false;
    const nextSOS = !currentlySOS;

    socketRef.current.emit('sosAlert', {
      rideCode,
      nickname,
      isSOS: nextSOS,
    });
  };

  const addSystemLog = (text) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSystemLogs((prev) => [{ text, time }, ...prev]);
  };

  // Toast helper
  const [toast, setToast] = useState('');
  const triggerNotification = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  // Telemetry metric selectors
  const metrics = useMemo(() => {
    if (!destination) {
      return { distanceLeft: '0.0 km', progress: 0, eta: '--:--' };
    }

    const totalDist = startPoint 
      ? calculateDistance(startPoint.lat, startPoint.lng, destination.lat, destination.lng) 
      : 10;
    const remainingDist = calculateDistance(currentPosition.lat, currentPosition.lng, destination.lat, destination.lng);

    const progressPercent = Math.min(100, Math.max(0, Math.round(((totalDist - remainingDist) / totalDist) * 100)));
    
    let etaStr = '--:--';
    if (speed > 0) {
      const timeHours = remainingDist / speed;
      const minsTotal = Math.round(timeHours * 60);
      const hours = Math.floor(minsTotal / 60);
      const mins = minsTotal % 60;
      etaStr = `${hours > 0 ? `${hours}h ` : ''}${mins}m`;
    } else {
      etaStr = 'Resting';
    }

    return {
      distanceLeft: `${remainingDist.toFixed(1)} km`,
      progress: progressPercent,
      eta: etaStr,
    };
  }, [destination, currentPosition, speed, startPoint]);

  // Leaflet Marker Icons
  const createRiderIcon = (color, isMe = false, isSOS = false) => {
    return L.divIcon({
      className: 'rider-custom-marker',
      html: `
        <div class="relative flex flex-col items-center">
          <div class="w-8 h-8 rounded-full border-2 ${isMe ? 'border-white animate-pulse-orange' : 'border-neutral-800'} flex items-center justify-center shadow-lg relative" style="background-color: ${color}">
            <div class="w-2 h-2 rounded-full bg-white"></div>
            ${isSOS ? `<div class="absolute inset-0 rounded-full border-4 border-red-500 animate-ping"></div>` : ''}
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const createCheckpointIcon = (order) => {
    return L.divIcon({
      className: 'checkpoint-custom-marker',
      html: `
        <div class="w-6 h-6 rounded bg-[#0d0d0d] border-2 border-brandOrange flex items-center justify-center font-black text-[10px] text-brandOrange rotate-45 shadow-lg">
          <span class="-rotate-45">${order}</span>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  const createFinishIcon = () => {
    return L.divIcon({
      className: 'finish-custom-marker',
      html: `
        <div class="w-8 h-8 rounded bg-brandOrange border border-white flex items-center justify-center shadow-2xl animate-bounce">
          <span class="text-sm">🏁</span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
  };

  // Entrance Overlay if username is not configured
  if (!nickname) {
    return (
      <div className="min-h-screen bg-darkBg flex flex-col items-center justify-center p-4 font-sans select-none relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(252,97,0,0.12),transparent_70%)] pointer-events-none"></div>

        <div className="w-full max-w-sm p-6 rounded-lg glass-panel shadow-2xl relative z-10 flex flex-col items-center border border-[#242424] transition-all duration-300">
          <div className="w-10 h-10 rounded bg-brandOrange flex items-center justify-center text-white font-black text-xl mb-4 shadow-lg animate-pulse-orange">
            🧭
          </div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase">
            EASY<span className="text-brandOrange">TRIP</span>
          </h1>
          <p className="text-neutral-400 text-xs mt-1 text-center font-semibold uppercase tracking-wider mb-6">
            Real-Time Cyberpunk Biker Radar
          </p>

          <form onSubmit={handleEnterNickname} className="w-full space-y-4">
            <div>
              <label className="block text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-1.5 text-center">
                CHOOSE RIDER CALLSIGN
              </label>
              <input
                type="text"
                value={tempNickname}
                onChange={(e) => setTempNickname(e.target.value)}
                placeholder="e.g. MAVERICK"
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
              Initialize Cockpit
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#060608] overflow-hidden flex font-sans text-white select-none relative">
      
      {/* LEFT SIDEBAR PANEL */}
      <aside className="w-80 h-full bg-[#0b0c10]/95 border-r border-[#1a1c23] flex flex-col p-5 z-20 shrink-0 select-none shadow-2xl transition-all duration-300">
        {/* App Title Logo */}
        <div className="flex items-center gap-3 mb-6 select-none shrink-0">
          <div className="w-7 h-7 rounded bg-brandOrange flex items-center justify-center text-white font-black text-sm shadow-md shadow-brandOrange/15">
            🧭
          </div>
          <span className="text-md font-black tracking-wider uppercase text-white">
            EASY<span className="text-brandOrange">TRIP</span>
          </span>
        </div>

        {/* Action button creation decks */}
        {!isJoined ? (
          <div className="flex flex-col gap-4 shrink-0">
            <button
              onClick={handleCreateRide}
              className="w-full py-3 px-4 bg-brandOrange hover:bg-[#e25700] text-white font-black text-xs tracking-widest uppercase rounded-lg shadow-lg shadow-brandOrange/10 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={14} /> Create Ride Session
            </button>

            <form onSubmit={handleJoinRide} className="space-y-2 pt-2 border-t border-[#1a1c23]">
              <span className="block text-[9px] text-neutral-500 font-bold uppercase tracking-wider">Join Existing Run</span>
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                placeholder="RIDE CODE"
                required
                className="w-full py-2 px-3 rounded-lg glass-input text-xs font-black uppercase text-center tracking-widest border border-[#1a1c23]"
              />
              <button
                type="submit"
                disabled={!joinCodeInput.trim()}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-45 text-white font-black text-xs tracking-widest uppercase rounded-lg transition-all"
              >
                Join Ride Room
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 shrink-0 select-none">
            <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider">ACTIVE TRIP CARD</span>
            <div className="glass-panel p-3 rounded-lg border border-[#1a1c23] flex flex-col gap-2 relative">
              <span className="text-[9px] text-neutral-400 font-bold uppercase">Room Code</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-brandOrange tracking-widest select-all">{rideCode}</span>
                <button
                  onClick={() => {
                    const shareUrl = `${window.location.origin}?join=${rideCode}`;
                    navigator.clipboard.writeText(shareUrl);
                    triggerNotification('Share Link copied to clipboard!');
                  }}
                  className="p-1.5 hover:bg-[#1a1c23] text-neutral-400 hover:text-brandOrange border border-[#1a1c23] rounded transition-all flex items-center justify-center"
                  title="Copy Direct Share URL"
                >
                  <Share2 size={12} />
                </button>
              </div>
            </div>

            <button
              onClick={handleLeaveRide}
              className="w-full py-2.5 bg-brandCrimson/10 hover:bg-brandCrimson/20 border border-brandCrimson/25 text-brandCrimson font-extrabold text-[10px] tracking-widest uppercase rounded-lg transition-all flex items-center justify-center gap-1.5"
            >
              Leave Ride Session
            </button>
          </div>
        )}

        {/* Dynamic active riders list */}
        {isJoined && (
          <div className="grow overflow-y-auto mt-6 flex flex-col gap-3">
            <div className="flex items-center justify-between shrink-0">
              <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1">
                <Users size={12} /> Active Riders ({riders.length})
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-brandOrange animate-pulse shrink-0"></span>
            </div>

            <div className="space-y-2 pr-1">
              {riders.map((r) => {
                const isMe = r.socketId === socketRef.current?.id;
                return (
                  <div
                    key={r.socketId}
                    className="p-2.5 rounded-lg border border-[#1a1c23] bg-[#0c0d12] flex items-center justify-between transition-all duration-200"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-inner" style={{ backgroundColor: r.color }}></span>
                      <span className="text-white font-extrabold text-xs truncate uppercase tracking-wide">{r.nickname}</span>
                      {isMe && <span className="text-[8px] text-neutral-500 font-black shrink-0">(ME)</span>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 select-none">
                      {r.isSOS && (
                        <span className="text-[8px] bg-red-950/80 border border-red-500/20 text-red-500 font-black px-1.5 py-0.5 rounded animate-pulse">
                          SOS
                        </span>
                      )}
                      <span className="text-[10px] text-neutral-400 font-bold">{isMe ? speed : r.speed || 0} km/h</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Callsign profile indicator */}
        <div className="mt-auto pt-4 border-t border-[#1a1c23] flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-full bg-brandOrange flex items-center justify-center font-black text-white uppercase text-xs">
            {nickname.substring(0, 2)}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black text-white uppercase tracking-wider">{nickname}</span>
            <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest">Active Pilot</span>
          </div>
        </div>
      </aside>

      {/* CENTER INTERACTIVE WORKSPACE */}
      <div className="grow flex flex-col h-full overflow-hidden relative z-10">
        
        {/* TOP METRICS TELEMETRY GRID */}
        <div className="h-20 border-b border-[#1a1c23] bg-[#0b0c10]/95 px-6 flex items-center justify-between gap-4 select-none shrink-0 shadow-md relative z-20 transition-all">
          <div className="grid grid-cols-6 gap-6 w-full max-w-5xl mx-auto">
            {/* Metric 1 */}
            <div className="flex flex-col">
              <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1"><Users size={10} className="text-brandOrange" /> Riders</span>
              <span className="text-sm font-black text-white mt-0.5 uppercase tracking-wide">
                {isJoined ? `${riders.length} Active` : '0 Pilots'}
              </span>
            </div>

            {/* Metric 2 */}
            <div className="flex flex-col">
              <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1"><Zap size={10} className="text-brandOrange" /> Live Speed</span>
              <span className="text-sm font-black text-white mt-0.5 tracking-wide">
                {isJoined ? `${speed} km/h` : '0 km/h'}
              </span>
            </div>

            {/* Metric 3 */}
            <div className="flex flex-col">
              <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1"><MapPin size={10} className="text-brandOrange" /> Distance Left</span>
              <span className="text-sm font-black text-white mt-0.5 tracking-wide">
                {isJoined ? metrics.distanceLeft : '0.0 km'}
              </span>
            </div>

            {/* Metric 4 */}
            <div className="flex flex-col">
              <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1"><Compass size={10} className="text-brandOrange" /> Target ETA</span>
              <span className="text-sm font-black text-white mt-0.5 uppercase tracking-wide">
                {isJoined ? metrics.eta : '--:--'}
              </span>
            </div>

            {/* Metric 5 */}
            <div className="flex flex-col">
              <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1"><CloudSun size={10} className="text-brandOrange" /> Weather</span>
              <span className="text-sm font-black text-white mt-0.5 uppercase tracking-wide">28°C Clear</span>
            </div>

            {/* Metric 6 */}
            <div className="flex flex-col">
              <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1"><Activity size={10} className="text-brandOrange" /> Run Progress</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="grow bg-neutral-800 h-1.5 rounded-full overflow-hidden border border-neutral-700/50">
                  <div className="bg-brandOrange h-full transition-all" style={{ width: `${isJoined ? metrics.progress : 0}%` }}></div>
                </div>
                <span className="text-[10px] font-black text-white shrink-0">{isJoined ? metrics.progress : 0}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* LARGE INTERACTIVE MAP CONTAINER */}
        <div className="grow w-full h-full relative z-10">
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

            {/* Winding Road Routing Line */}
            {route.length > 0 && (
              <Polyline
                positions={route}
                color="#fc6100"
                weight={4}
                opacity={0.85}
              />
            )}

            {/* Checkpoints Markers */}
            {checkpoints.map((cp, idx) => (
              <Marker
                key={idx}
                position={[cp.lat, cp.lng]}
                icon={createCheckpointIcon(cp.order)}
              >
                <Popup>
                  <div className="text-xs p-1 font-sans">
                    <h4 className="font-extrabold text-[#fc6100] uppercase text-[10px]">Checkpoint {cp.order}</h4>
                    <p className="text-white mt-0.5 font-bold uppercase text-[9px]">{cp.name}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Destination Marker */}
            {destination && (
              <Marker
                position={[destination.lat, destination.lng]}
                icon={createFinishIcon()}
              >
                <Popup>
                  <div className="text-xs p-1 font-sans text-center">
                    <span className="font-black text-white text-[10px] uppercase">🏁 Target Endpoint</span>
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
                  icon={createRiderIcon(loc.color, isMe, loc.isSOS)}
                >
                  <Popup>
                    <div className="text-xs p-2 min-w-[120px] font-sans">
                      <div className="flex items-center justify-between border-b border-[#242424] pb-1.5 mb-1.5 select-none">
                        <span className="font-black text-white text-xs uppercase tracking-wider">{loc.nickname}</span>
                        {isMe && <span className="text-[8px] bg-brandOrange/20 text-brandOrange px-1.5 rounded uppercase font-black">Me</span>}
                      </div>
                      <div className="space-y-1 font-black text-neutral-400 uppercase text-[9px]">
                        <p>Speed: <span className="text-white">{isMe ? speed : loc.speed || 0} km/h</span></p>
                        <p>Battery: <span className="text-white">{isMe ? battery : loc.batteryPercentage || 100}%</span></p>
                        <p>Distress: <span className={loc.isSOS ? 'text-red-500' : 'text-emerald-500'}>{loc.isSOS ? 'ACTIVE' : 'NONE'}</span></p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* FLOATING ACTION DECKS OVER MAP */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
            <button
              onClick={() => setAutoCenter(prev => !prev)}
              className={`p-2.5 rounded-lg shadow-2xl border transition-all ${
                autoCenter ? 'bg-brandOrange/25 border-brandOrange/45 text-brandOrange shadow-brandOrange/5' : 'glass-panel text-neutral-400'
              }`}
              title="Toggle Dynamic Autocenter"
            >
              <Compass size={16} />
            </button>
            <button
              onClick={() => {
                setAutoCenter(true);
                setCurrentPosition({ ...currentPosition });
              }}
              className="p-2.5 glass-panel hover:bg-neutral-800 border border-[#1a1c23] rounded-lg text-white shadow-2xl"
              title="Locate GPS Position"
            >
              <Navigation size={16} />
            </button>
          </div>

          {/* Leader Route Operations and Checkpoint selectors */}
          {isJoined && isCreator && (
            <div className="absolute top-4 right-4 z-20 flex gap-2.5 select-none">
              {/* Clear Route builder */}
              {destination && (
                <button
                  onClick={handleClearRoute}
                  className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-[#1a1c23] rounded-lg font-black text-[10px] tracking-wider uppercase transition-all shadow-xl flex items-center gap-1.5"
                >
                  <Trash2 size={12} /> Clear Run
                </button>
              )}
            </div>
          )}

          {/* Guidance warning bar if route planning is active */}
          {isJoined && isCreator && !destination && (
            <div className="absolute bottom-6 left-6 z-20 p-2.5 bg-brandOrange/15 border border-brandOrange/35 rounded-lg text-[9.5px] text-brandOrange font-black uppercase tracking-widest shadow-2xl flex items-center gap-2 select-none animate-pulse">
              <MapPin size={12} className="shrink-0" />
              <span>Planning: Click anywhere on roads to drop Destination End-Point</span>
            </div>
          )}

          {isJoined && isCreator && destination && (
            <div className="absolute bottom-6 left-6 z-20 p-2 bg-[#0c0d12] border border-[#1a1c23] rounded-lg text-[9px] text-neutral-400 font-extrabold uppercase tracking-wider shadow-2xl flex items-center gap-2 select-none">
              <CheckCircle size={10} className="text-emerald-500 shrink-0" />
              <span>Destination Configured. Click anywhere on map to add Checkpoints!</span>
            </div>
          )}

          {/* FLOATING ACTION BOTTOM CONTROLS PANEL */}
          {isJoined && (
            <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2 select-none">
              {/* Emergency SOS Trigger */}
              <button
                onClick={handleToggleSOS}
                className={`py-2 px-3.5 rounded-lg font-black text-[10px] tracking-widest uppercase transition-all shadow-xl flex items-center gap-1.5 shrink-0 ${
                  riders.find(r => r.socketId === socketRef.current?.id)?.isSOS
                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-red-500/10'
                    : 'bg-red-600/15 hover:bg-red-600/25 border border-red-500/25 text-red-500'
                }`}
              >
                <ShieldAlert size={14} />
                <span>{riders.find(r => r.socketId === socketRef.current?.id)?.isSOS ? 'Deactivate SOS' : 'SOS Emergency'}</span>
              </button>

              {/* Dynamic GPS Radar Live badge */}
              {isJoined && (
                <div className="py-2.5 px-3.5 bg-emerald-950/80 border border-emerald-500/20 text-emerald-400 rounded-lg font-black text-[10px] tracking-wider uppercase flex items-center justify-center gap-1.5 shrink-0 select-none animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  🛰️ GPS Live
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT CHAT & SYSTEM ALERTS PANEL */}
      <aside className="w-80 h-full bg-[#0b0c10]/95 border-l border-[#1a1c23] flex flex-col p-5 z-20 shrink-0 select-none shadow-2xl transition-all duration-300">
        {/* Panel Tabs */}
        <div className="flex bg-[#0c0d12] p-1 rounded-lg border border-[#1a1c23] select-none shrink-0 mb-4">
          <button
            onClick={() => setActiveRightTab('chat')}
            className={`grow py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              activeRightTab === 'chat' ? 'bg-[#1a1c23] text-brandOrange font-black border border-[#2b2d38]' : 'text-neutral-500 hover:text-neutral-300 font-bold'
            }`}
          >
            <MessageSquare size={12} /> Chat
          </button>
          <button
            onClick={() => setActiveRightTab('logs')}
            className={`grow py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              activeRightTab === 'logs' ? 'bg-[#1a1c23] text-brandOrange font-black border border-[#2b2d38]' : 'text-neutral-500 hover:text-neutral-300 font-bold'
            }`}
          >
            <Bell size={12} /> Run Logs
          </button>
        </div>

        {/* Tab 1: Group Chat Panel */}
        {activeRightTab === 'chat' && (
          <div className="grow flex flex-col overflow-hidden">
            {/* Message history */}
            <div className="grow overflow-y-auto mb-4 space-y-3.5 pr-1 select-text">
              {!isJoined ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-600 gap-2 text-center select-none font-bold uppercase tracking-wider">
                  <MessageSquare size={20} className="text-neutral-700" />
                  <span className="text-[10px]">Chat is locked until you create or join a ride.</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-600 gap-2 text-center select-none font-bold uppercase tracking-wider">
                  <Compass size={20} className="text-neutral-700 animate-spin" style={{ animationDuration: '6s' }} />
                  <span className="text-[10px]">No chat pings received yet</span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.nickname === nickname;
                  return (
                    <div
                      key={msg._id}
                      className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end animate-fade-in' : 'mr-auto items-start'}`}
                    >
                      <span className="text-[8px] text-neutral-500 font-black mb-0.5 px-1 uppercase tracking-wider">
                        {isMe ? 'Me' : msg.nickname}
                      </span>
                      <div
                        className={`p-2.5 rounded-lg text-xs ${
                          isMe
                            ? 'bg-brandOrange text-white rounded-tr-none font-semibold'
                            : 'bg-[#1c1c1e] text-neutral-200 border border-[#2c2c2e] rounded-tl-none font-medium'
                        }`}
                      >
                        {msg.message}
                      </div>
                      <span className="text-[8px] text-neutral-600 font-extrabold mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Submission bar */}
            {isJoined && (
              <form onSubmit={handleSendChat} className="mt-auto flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="SEND MESSAGE..."
                  required
                  className="grow py-2 px-3 rounded-lg glass-input text-xs border border-[#1a1c23]"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="p-2.5 bg-brandOrange hover:bg-[#e25700] disabled:opacity-40 text-white rounded-lg transition-all shadow flex items-center justify-center shrink-0"
                >
                  <ArrowRight size={14} />
                </button>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: System notifications & logs */}
        {activeRightTab === 'logs' && (
          <div className="grow overflow-y-auto pr-1">
            {systemLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-600 gap-2 text-center select-none font-bold uppercase tracking-wider">
                <Bell size={20} className="text-neutral-700" />
                <span className="text-[10px]">No logs generated yet</span>
              </div>
            ) : (
              <div className="space-y-3">
                {systemLogs.map((log, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-[#1a1c23] bg-[#0c0d12] flex flex-col gap-1">
                    <span className="text-[10px] text-neutral-200 font-extrabold tracking-wide select-text uppercase">{log.text}</span>
                    <span className="text-[8px] text-neutral-500 font-black self-end">{log.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>

      {/* FULL SCREEN EMERGENCY SOS DISTRESS OVERLAY */}
      {activeSOS && (
        <div className="absolute inset-0 bg-red-950/90 z-40 flex flex-col items-center justify-center p-6 select-none animate-pulse-red">
          <div className="w-14 h-14 rounded-full bg-red-600 border border-white flex items-center justify-center text-white mb-4 animate-bounce">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-xl font-black text-white tracking-widest uppercase">
            🚨 EMERGENCY BROADCAST 🚨
          </h2>
          <p className="text-white/80 text-xs font-bold mt-2 uppercase tracking-wide text-center max-w-xs leading-relaxed">
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
              className="px-5 py-2.5 bg-white text-red-700 font-black text-xs uppercase tracking-widest rounded-lg shadow-lg hover:bg-neutral-100 transition-all"
            >
              Locate Pilot
            </button>
            <button
              onClick={() => setActiveSOS(null)}
              className="px-5 py-2.5 bg-transparent border border-white/20 text-white/70 hover:text-white font-bold text-xs uppercase tracking-widest rounded-lg transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* FLOAT NOTIFICATION BANNER */}
      {toast && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 bg-neutral-900/95 border border-[#1a1c23] py-2 px-4 rounded-lg text-white font-extrabold text-[10px] uppercase tracking-wider shadow-2xl backdrop-blur-md fade-in flex items-center gap-2 select-none">
          <Award size={12} className="text-brandOrange" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

export default App;
