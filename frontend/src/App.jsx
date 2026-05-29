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

const getVehicleEmoji = (type) => {
  switch (type) {
    case 'Motorcycle': return '🏍';
    case 'Scooter': return '🛵';
    case 'Car': return '🚗';
    case 'Bicycle': return '🚲';
    default: return '🏍';
  }
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
  // Authentication & Entrance (Yamaha Ray ZR preset default)
  const [nickname, setNickname] = useState(() => sessionStorage.getItem('easytrip_nickname') || '');
  const [vehicleModel, setVehicleModel] = useState(() => sessionStorage.getItem('easytrip_vehicle_model') || '');
  const [vehicleNumber, setVehicleNumber] = useState(() => sessionStorage.getItem('easytrip_vehicle_number') || '');
  const [vehicleType, setVehicleType] = useState(() => sessionStorage.getItem('easytrip_vehicle_type') || 'Scooter');
  const [emergencyContact, setEmergencyContact] = useState(() => sessionStorage.getItem('easytrip_emergency_contact') || '');

  // Prepopulate exactly to frictionless launch with Yamaha Ray ZR Scooter
  const [tempNickname, setTempNickname] = useState('Aman Patel');
  const [tempVehicleModel, setTempVehicleModel] = useState('Yamaha Ray ZR');
  const [tempVehicleNumber, setTempVehicleNumber] = useState('UP32 AB 1234');
  const [tempVehicleType, setTempVehicleType] = useState('Scooter');
  const [tempEmergencyContact, setTempEmergencyContact] = useState('+91 98765 43210');

  const [isJoined, setIsJoined] = useState(false);
  const [rideCode, setRideCode] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // GPS Coordinates & Map Tracking
  const [currentPosition, setCurrentPosition] = useState({ lat: 12.8230, lng: 80.0440 });
  const [startPoint, setStartPoint] = useState(null);
  const [autoCenter, setAutoCenter] = useState(true);
  const [activeSOS, setActiveSOS] = useState(null);
  const [followingRiderId, setFollowingRiderId] = useState(null);

  // Synced Room States
  const [riders, setRiders] = useState([]);
  const [destination, setDestination] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [route, setRoute] = useState([]);
  const [isCreator, setIsCreator] = useState(false);
  const [creatorId, setCreatorId] = useState('');
  const [pendingCPCoords, setPendingCPCoords] = useState(null);
  const [customCPName, setCustomCPName] = useState('');

  // Group Chat & System Logs (Right Panel)
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [systemLogs, setSystemLogs] = useState([]);
  const [activeRightTab, setActiveRightTab] = useState('chat'); // 'chat', 'logs', 'manifest'
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic Telemetry Metrics
  const [speed, setSpeed] = useState(0);
  const [battery, setBattery] = useState(100);
  const [distanceTraveled, setDistanceTraveled] = useState(0);
  const [rideHistory, setRideHistory] = useState(() => JSON.parse(localStorage.getItem('easytrip_history') || '[]'));

  // Mobile Collapsible UI Layout Toggles
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);

  // Leader Mode & Geofence
  const [geofenceLimit, setGeofenceLimit] = useState(1000); // default 1km geofence radius

  // Speech turn-by-turn Navigation state tags
  const [voiceNavEnabled, setVoiceNavEnabled] = useState(true);
  const [routeSteps, setRouteSteps] = useState([]);
  const [nextManeuver, setNextManeuver] = useState(null); // { text, distance, type, modifier }
  const [lastSpokenStepIndex, setLastSpokenStepIndex] = useState(-1);

  // Specialized Checkpoint Types selection
  const [selectedCPType, setSelectedCPType] = useState('☕ Tea Break');

  // Safety Hazards system
  const [hazards, setHazards] = useState([]);
  const [showHazardModal, setShowHazardModal] = useState(false);

  // Weather Widget
  const [weatherData, setWeatherData] = useState({
    temp: 28,
    rainChance: 12,
    windSpeed: 15,
    visibility: 10,
    warning: ''
  });
  const [showWeatherOnRoute, setShowWeatherOnRoute] = useState(true);

  // Biker Analytics Dashboard
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [averageSpeed, setAverageSpeed] = useState(0);
  const [speedHistory, setSpeedHistory] = useState([]);
  const [rideStartTime, setRideStartTime] = useState(null);
  const [rideDurationSeconds, setRideDurationSeconds] = useState(0);

  // Ride Replay Simulator
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [replayCoordsHistory, setReplayCoordsHistory] = useState([]);
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);
  const [replaySpeedMultiplier, setReplaySpeedMultiplier] = useState(1);
  const [replayCurrentIndex, setReplayCurrentIndex] = useState(0);

  // Chat announcement switch toggle
  const [isAnnouncementMode, setIsAnnouncementMode] = useState(false);

  // Socket & Refs
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const pendingJoinCodeRef = useRef(new URLSearchParams(window.location.search).get('join'));
  const reachedCheckpointsRef = useRef(new Set());
  const lastSpokenGeofenceRef = useRef({}); // socketId -> timestamp
  const spokenThresholdsRef = useRef(new Map()); // stepIndex -> Set of spoken thresholds

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (err) {
      console.warn('Audio Context not supported:', err.message);
    }
  };

  const speakVoiceInstruction = (text) => {
    if (!window.speechSynthesis || !voiceNavEnabled) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('SpeechSynthesis failed:', err.message);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 1. Setup Sockets listeners
  useEffect(() => {
    socketRef.current = io(SOCKET_URL);

    socketRef.current.on('connect', () => {
      console.log('Connected to server socket:', socketRef.current.id);
      
      const savedNickname = sessionStorage.getItem('easytrip_nickname');
      const savedVehicleModel = sessionStorage.getItem('easytrip_vehicle_model');
      const savedVehicleNumber = sessionStorage.getItem('easytrip_vehicle_number');
      const savedVehicleType = sessionStorage.getItem('easytrip_vehicle_type') || 'Scooter';
      const savedEmergencyContact = sessionStorage.getItem('easytrip_emergency_contact');

      if (savedNickname && pendingJoinCodeRef.current) {
        socketRef.current.emit('joinRide', {
          rideCode: pendingJoinCodeRef.current.toUpperCase(),
          nickname: savedNickname,
          currentLocation: currentPosition,
          vehicleModel: savedVehicleModel,
          vehicleNumber: savedVehicleNumber,
          vehicleType: savedVehicleType,
          emergencyContact: savedEmergencyContact,
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
      setCreatorId(ride.creatorId || socketRef.current.id);
      setIsJoined(true);
      setRideStartTime(new Date());
      setErrorMsg('');
      addSystemLog('Ride room created. Click on map to set route destination.');
    });

    socketRef.current.on('rideJoined', (ride) => {
      setRideCode(ride.code);
      setRiders(Object.values(ride.riders));
      setDestination(ride.destination);
      setCheckpoints(ride.checkpoints);
      setRoute(ride.route);
      setCreatorId(ride.creatorId);
      const creatorRider = Object.values(ride.riders).find(r => r.socketId === ride.creatorId);
      setStartPoint(creatorRider ? { lat: creatorRider.lat, lng: creatorRider.lng } : currentPosition);
      setIsCreator(false);
      setIsJoined(true);
      setRideStartTime(new Date());
      setErrorMsg('');
      addSystemLog(`Joined room: ${ride.code}`);
    });

    socketRef.current.on('riderJoined', ({ nickname, riders }) => {
      setRiders(riders);
      addSystemLog(`${nickname} joined the ride.`);
      triggerNotification(`${nickname} joined the ride.`);
    });

    socketRef.current.on('receiveLocation', (updatedRiders) => {
      setRiders(updatedRiders);
    });

    socketRef.current.on('checkpointAdded', (updatedCheckpoints) => {
      setCheckpoints(updatedCheckpoints);
      const lastCp = updatedCheckpoints[updatedCheckpoints.length - 1];
      addSystemLog(`Leader added Checkpoint: ${lastCp?.name || updatedCheckpoints.length}`);
      triggerNotification('🏁 Checkpoint added by Group Leader.');
      speakVoiceInstruction(`New checkpoint added, ${lastCp?.name || ''}`);
    });

    socketRef.current.on('checkpointUndone', (updatedCheckpoints) => {
      setCheckpoints(updatedCheckpoints);
      addSystemLog('Leader removed the last checkpoint.');
      triggerNotification('↩️ Checkpoint removed by Group Leader.');
      speakVoiceInstruction('Last checkpoint removed');
    });

    socketRef.current.on('routeSynced', ({ destination, route }) => {
      setDestination(destination);
      setRoute(route);
      addSystemLog('Leader synchronized destination path.');
      triggerNotification('🗺️ Route updated by Group Leader.');
    });

    socketRef.current.on('sosAlert', ({ nickname, isSOS, lat, lng }) => {
      if (isSOS) {
        setActiveSOS({ nickname, lat, lng });
        addSystemLog(`🚨 EMERGENCY: SOS triggered by ${nickname}.`);
        speakVoiceInstruction(`Alert, SOS emergency triggered by ${nickname}`);
        playAlertSound();
      } else {
        setActiveSOS(null);
        addSystemLog(`✅ SOS resolved by ${nickname}.`);
        speakVoiceInstruction(`SOS emergency resolved by ${nickname}`);
      }
    });

    socketRef.current.on('receiveMessage', (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    socketRef.current.on('hazardAdded', (updatedHazards) => {
      setHazards(updatedHazards);
      const latest = updatedHazards[updatedHazards.length - 1];
      addSystemLog(`⚠ HAZARD: ${latest.type} reported by ${latest.reporter}.`);
      triggerNotification(`⚠ Hazard reported: ${latest.type}`);
      speakVoiceInstruction(`Caution, hazard reported ahead. ${latest.type}`);
      playAlertSound();
    });

    socketRef.current.on('hazardRemoved', (updatedHazards) => {
      setHazards(updatedHazards);
      addSystemLog('Hazard cleared from route.');
      triggerNotification('Hazard cleared from route.');
    });

    socketRef.current.on('geofenceUpdated', (radius) => {
      setGeofenceLimit(radius);
      addSystemLog(`Leader set Geofence limit to ${radius} meters.`);
      triggerNotification(`Geofence limit: ${radius}m`);
      speakVoiceInstruction(`Geofence limit updated to ${radius} meters`);
    });

    socketRef.current.on('quickActionReceived', ({ nickname, actionType }) => {
      addSystemLog(`⚡ STATUS: ${nickname} reports "${actionType}"`);
      triggerNotification(`${nickname}: ${actionType}`);
      speakVoiceInstruction(`${nickname} reports ${actionType}`);
      playAlertSound();
    });

    socketRef.current.on('announcementReceived', ({ nickname, announcement }) => {
      addSystemLog(`📢 LEADER ANNOUNCEMENT: "${announcement}"`);
      triggerNotification(`Leader: ${announcement}`);
      speakVoiceInstruction(`Leader announcement. ${announcement}`);
      playAlertSound();
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
    if (!nickname || isReplayMode) return;

    let watchId = null;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCurrentPosition(coords);
        },
        (err) => console.warn('GPS bootstrapping deferred:', err.message)
      );

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, speed: gpsSpeed } = pos.coords;
          const coords = { lat: latitude, lng: longitude };
          
          setCurrentPosition((prev) => {
            if (prev) {
              const increment = calculateDistance(prev.lat, prev.lng, latitude, longitude);
              if (increment > 0.01 && increment < 1) {
                setDistanceTraveled((d) => d + increment);
              }
            }
            return coords;
          });

          const speedKmH = gpsSpeed ? Math.round(gpsSpeed * 3.6) : 0;
          setSpeed(speedKmH);

          if (isJoined && rideCode) {
            socketRef.current.emit('sendLocation', {
              rideCode,
              lat: latitude,
              lng: longitude,
              speed: speedKmH,
              batteryPercentage: battery,
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
  }, [nickname, isJoined, rideCode, battery, isReplayMode]);

  // 2.5. Battery Telemetry Watcher
  useEffect(() => {
    if (!nickname) return;
    
    if (navigator.getBattery) {
      navigator.getBattery().then((bat) => {
        setBattery(Math.round(bat.level * 100));
        
        const handleLevelChange = () => {
          setBattery(Math.round(bat.level * 100));
        };
        
        bat.addEventListener('levelchange', handleLevelChange);
        return () => bat.removeEventListener('levelchange', handleLevelChange);
      });
    } else {
      const interval = setInterval(() => {
        setBattery((b) => Math.max(1, b - 1));
      }, 300000);
      return () => clearInterval(interval);
    }
  }, [nickname]);

  // 3. Telemetry stopwatch & Geofence Separation alarm checking interval
  useEffect(() => {
    if (!isJoined || !rideCode || isReplayMode) return;

    const interval = setInterval(() => {
      // Stopwatch increment
      setRideDurationSeconds((prev) => prev + 1);

      // Speed metrics logging
      setSpeedHistory((prev) => {
        const next = [...prev, speed];
        const sum = next.reduce((a, b) => a + b, 0);
        setAverageSpeed(Math.round(sum / next.length));
        return next;
      });

      if (speed > maxSpeed) {
        setMaxSpeed(speed);
      }

      // Record coordinate history for replay
      setReplayCoordsHistory((prev) => {
        const last = prev[prev.length - 1];
        if (!last || last.lat !== currentPosition.lat || last.lng !== currentPosition.lng) {
          return [...prev, { lat: currentPosition.lat, lng: currentPosition.lng }];
        }
        return prev;
      });

      // Geofence separations check relative to leader
      const leaderRider = riders.find((r) => r.socketId === creatorId);
      if (leaderRider) {
        const now = Date.now();
        riders.forEach((r) => {
          const distToLeader = calculateDistance(r.lat, r.lng, leaderRider.lat, leaderRider.lng) * 1000;
          if (distToLeader > geofenceLimit) {
            const lastSpoken = lastSpokenGeofenceRef.current[r.socketId] || 0;
            if (now - lastSpoken > 25000) {
              lastSpokenGeofenceRef.current[r.socketId] = now;
              playAlertSound();
              addSystemLog(`⚠ GEOFENCE: Rider ${r.nickname} has separated from group (${(distToLeader / 1000).toFixed(1)} km away).`);
              triggerNotification(`⚠ Geofence Alert: ${r.nickname} separated.`);
              speakVoiceInstruction(`Warning, rider ${r.nickname} separated from group`);
            }
          }
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isJoined, rideCode, speed, maxSpeed, currentPosition, riders, creatorId, geofenceLimit, isReplayMode]);

  // 3.5. Turn-by-Turn GPS voice instructions synthesis loop
  const getInstructionText = (step) => {
    const type = step.type;
    const modifier = step.modifier;
    const name = step.name && step.name !== 'road' ? ` onto ${step.name}` : '';
    if (type === 'depart') return 'Head straight';
    if (type === 'arrive') return 'Arrive at destination';
    if (type === 'turn') {
      if (modifier === 'left') return `Turn left${name}`;
      if (modifier === 'right') return `Turn right${name}`;
      if (modifier === 'sharp left') return `Sharp left${name}`;
      if (modifier === 'sharp right') return `Sharp right${name}`;
      if (modifier === 'slight left') return `Slight left${name}`;
      if (modifier === 'slight right') return `Slight right${name}`;
    }
    if (type === 'roundabout') return `Enter roundabout${name}`;
    return `${type} ${modifier || ''}${name}`;
  };

  useEffect(() => {
    if (!isJoined || routeSteps.length === 0 || isReplayMode) return;

    let closestStepIdx = 0;
    let minD = Infinity;
    for (let i = 0; i < routeSteps.length; i++) {
      const d = calculateDistance(currentPosition.lat, currentPosition.lng, routeSteps[i].lat, routeSteps[i].lng);
      if (d < minD) {
        minD = d;
        closestStepIdx = i;
      }
    }

    const currentStep = routeSteps[closestStepIdx];
    if (currentStep) {
      const distToTurn = calculateDistance(currentPosition.lat, currentPosition.lng, currentStep.lat, currentStep.lng) * 1000; // meters
      const readableInstruction = getInstructionText(currentStep);
      
      setNextManeuver({
        instruction: readableInstruction,
        distance: distToTurn,
        type: currentStep.type,
        modifier: currentStep.modifier
      });

      if (!spokenThresholdsRef.current.has(closestStepIdx)) {
        spokenThresholdsRef.current.set(closestStepIdx, new Set());
      }
      const spokenSet = spokenThresholdsRef.current.get(closestStepIdx);

      // Multi-threshold standard GPS announcement system
      if (distToTurn <= 200 && distToTurn > 60 && !spokenSet.has('200')) {
        const roundedD = Math.round(distToTurn / 10) * 10;
        speakVoiceInstruction(`In ${roundedD} meters, ${readableInstruction}`);
        spokenSet.add('200');
      } else if (distToTurn <= 60 && distToTurn > 20 && !spokenSet.has('60')) {
        const roundedD = Math.round(distToTurn / 5) * 5;
        speakVoiceInstruction(`In ${roundedD} meters, ${readableInstruction}`);
        spokenSet.add('200');
        spokenSet.add('60');
      } else if (distToTurn <= 20 && !spokenSet.has('20')) {
        if (currentStep.type === 'arrive') {
          speakVoiceInstruction('You have arrived at your destination');
        } else {
          speakVoiceInstruction(`${readableInstruction} now`);
        }
        spokenSet.add('200');
        spokenSet.add('60');
        spokenSet.add('20');
        setLastSpokenStepIndex(closestStepIdx);
      }
    }
  }, [currentPosition, routeSteps, isJoined, isReplayMode]);

  // 3.6. Checkpoint milestones reached detector
  useEffect(() => {
    if (!isJoined || checkpoints.length === 0 || isReplayMode) return;

    checkpoints.forEach((cp) => {
      const dist = calculateDistance(currentPosition.lat, currentPosition.lng, cp.lat, cp.lng) * 1000;
      if (dist < 100 && !reachedCheckpointsRef.current.has(cp.order)) {
        reachedCheckpointsRef.current.add(cp.order);
        speakVoiceInstruction(`Milestone reached, ${cp.name}`);
        addSystemLog(`🏆 MILESTONE: Reached Checkpoint ${cp.order}: ${cp.name}`);
        triggerNotification(`🏁 Reached Checkpoint: ${cp.name}`);
      }
    });
  }, [currentPosition, checkpoints, isJoined, isReplayMode]);

  // 3.7. Ride Replay Simulator Player
  useEffect(() => {
    if (!isReplayMode || !isPlayingReplay || replayCoordsHistory.length === 0) return;

    const interval = setInterval(() => {
      setReplayCurrentIndex((prev) => {
        if (prev >= replayCoordsHistory.length - 1) {
          setIsPlayingReplay(false);
          speakVoiceInstruction('Ride replay finished.');
          return prev;
        }
        const nextIndex = Math.min(prev + replaySpeedMultiplier, replayCoordsHistory.length - 1);
        setCurrentPosition(replayCoordsHistory[nextIndex]);
        return nextIndex;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isReplayMode, isPlayingReplay, replayCoordsHistory, replaySpeedMultiplier]);

  // 4. OSRM Road Routing API Integration
  const calculateRouteDistance = (path) => {
    let totalDist = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const pt1 = path[i];
      const pt2 = path[i + 1];
      totalDist += calculateDistance(pt1[0], pt1[1], pt2[0], pt2[1]);
    }
    return totalDist;
  };

  const fetchRoadRoute = async (start, dest, cps = []) => {
    try {
      const sortedCps = [...cps].sort((a, b) => a.order - b.order);
      
      const pointsList = [
        start,
        ...sortedCps.map((cp) => ({ lat: cp.lat, lng: cp.lng })),
        dest
      ];

      const coordString = pointsList.map((pt) => `${pt.lng},${pt.lat}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson&continue_straight=false&steps=true`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const roadCoords = data.routes[0].geometry.coordinates.map((coord) => [coord[1], coord[0]]);
        
        const stepsList = [];
        if (data.routes[0].legs) {
          data.routes[0].legs.forEach((leg) => {
            if (leg.steps) {
              leg.steps.forEach((step) => {
                stepsList.push({
                  type: step.maneuver.type,
                  modifier: step.maneuver.modifier,
                  name: step.name || 'road',
                  distance: step.distance,
                  lat: step.maneuver.location[1],
                  lng: step.maneuver.location[0]
                });
              });
            }
          });
        }
        setRouteSteps(stepsList);
        setLastSpokenStepIndex(-1);
        return roadCoords;
      }
    } catch (err) {
      console.warn('OSRM road routing failed, falling back to straight segment map:', err.message);
    }
    
    const fallbackPath = [[start.lat, start.lng]];
    cps.forEach((cp) => fallbackPath.push([cp.lat, cp.lng]));
    fallbackPath.push([dest.lat, dest.lng]);
    setRouteSteps([]);
    return fallbackPath;
  };

  // 5. User Actions
  const handleEnterNickname = (e) => {
    e.preventDefault();
    if (!tempNickname.trim()) return;

    const trimmedNickname = tempNickname.trim();
    const trimmedModel = tempVehicleModel.trim() || 'N/A';
    const trimmedNumber = tempVehicleNumber.trim() || 'N/A';
    const trimmedType = tempVehicleType;
    const trimmedContact = tempEmergencyContact.trim();

    sessionStorage.setItem('easytrip_nickname', trimmedNickname);
    sessionStorage.setItem('easytrip_vehicle_model', trimmedModel);
    sessionStorage.setItem('easytrip_vehicle_number', trimmedNumber);
    sessionStorage.setItem('easytrip_vehicle_type', trimmedType);
    sessionStorage.setItem('easytrip_emergency_contact', trimmedContact);

    setNickname(trimmedNickname);
    setVehicleModel(trimmedModel);
    setVehicleNumber(trimmedNumber);
    setVehicleType(trimmedType);
    setEmergencyContact(trimmedContact);

    if (pendingJoinCodeRef.current && socketRef.current) {
      socketRef.current.emit('joinRide', {
        rideCode: pendingJoinCodeRef.current.toUpperCase(),
        nickname: trimmedNickname,
        currentLocation: currentPosition,
        vehicleModel: trimmedModel,
        vehicleNumber: trimmedNumber,
        vehicleType: trimmedType,
        emergencyContact: trimmedContact,
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
      vehicleModel,
      vehicleNumber,
      vehicleType,
      emergencyContact,
    });
  };

  const handleJoinRide = (e) => {
    e.preventDefault();
    if (!nickname || !joinCodeInput.trim() || !socketRef.current) return;

    socketRef.current.emit('joinRide', {
      rideCode: joinCodeInput.trim().toUpperCase(),
      nickname,
      currentLocation: currentPosition,
      vehicleModel,
      vehicleNumber,
      vehicleType,
      emergencyContact,
    });
  };

  const handleLeaveRide = () => {
    if (isJoined && nickname) {
      const historyRecord = {
        id: 'hist_' + Math.random().toString(36).substring(2, 9) + Date.now(),
        riderName: nickname,
        vehicleModel: vehicleModel || 'N/A',
        vehicleNumber: vehicleNumber || 'N/A',
        tripDate: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
        distanceCovered: distanceTraveled.toFixed(2),
      };

      try {
        const existing = JSON.parse(localStorage.getItem('easytrip_history') || '[]');
        existing.unshift(historyRecord);
        localStorage.setItem('easytrip_history', JSON.stringify(existing.slice(0, 10)));
        setRideHistory(existing.slice(0, 10));
      } catch (err) {
        console.warn('Failed to save ride history:', err.message);
      }
    }

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
    setDistanceTraveled(0);
    setFollowingRiderId(null);
    setRouteSteps([]);
    setNextManeuver(null);
    setLastSpokenStepIndex(-1);
    setSpeedHistory([]);
    setAverageSpeed(0);
    setMaxSpeed(0);
    setRideDurationSeconds(0);
    setHazards([]);
    setIsReplayMode(false);
    setIsPlayingReplay(false);
    reachedCheckpointsRef.current.clear();
  };

  const handleMapClick = async (latlng) => {
    if (!isJoined || !isCreator || !rideCode || isReplayMode) return;

    if (!destination) {
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
      speakVoiceInstruction('Destination planned successfully');
    } else {
      setPendingCPCoords(latlng);
      setCustomCPName('');
      setSelectedCPType('☕ Tea Break');
    }
  };

  const handleConfirmCheckpoint = async (name) => {
    if (!pendingCPCoords || !rideCode) return;
    const cpIndex = checkpoints.length + 1;
    const cpName = name.trim() || `Stop ${cpIndex}`;
    const newCheckpoint = {
      name: cpName,
      lat: pendingCPCoords.lat,
      lng: pendingCPCoords.lng,
      order: cpIndex,
    };

    triggerNotification(`Planning route segment via ${cpName}...`);
    const updatedCPs = [...checkpoints, newCheckpoint];
    setCheckpoints(updatedCPs);

    const roadRoute = await fetchRoadRoute(currentPosition, destination, updatedCPs);
    setRoute(roadRoute);

    socketRef.current.emit('addCheckpoint', {
      rideCode,
      checkpoint: newCheckpoint,
    });

    socketRef.current.emit('updateRoute', {
      rideCode,
      destination,
      route: roadRoute,
    });

    setPendingCPCoords(null);
    setCustomCPName('');
  };

  const handleUndoCheckpoint = async () => {
    if (!isCreator || !rideCode || checkpoints.length === 0) return;
    
    const updatedCPs = [...checkpoints];
    const popped = updatedCPs.pop();
    
    triggerNotification(`Removing checkpoint: ${popped.name}...`);
    setCheckpoints(updatedCPs);

    const roadRoute = await fetchRoadRoute(currentPosition, destination, updatedCPs);
    setRoute(roadRoute);

    socketRef.current.emit('undoCheckpoint', { rideCode });

    socketRef.current.emit('updateRoute', {
      rideCode,
      destination,
      route: roadRoute,
    });
    
    addSystemLog(`Removed checkpoint: ${popped.name}`);
  };

  const handleClearRoute = () => {
    if (!isCreator || !rideCode) return;
    setDestination(null);
    setRoute([]);
    setCheckpoints([]);
    setRouteSteps([]);
    setNextManeuver(null);
    reachedCheckpointsRef.current.clear();

    socketRef.current.emit('updateRoute', {
      rideCode,
      destination: null,
      route: [],
    });
    speakVoiceInstruction('Active route cleared by Leader');
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !isJoined || !rideCode) return;

    const msgId = 'msg_' + Math.random().toString(36).substring(2, 9) + Date.now();
    const chatMsg = {
      _id: msgId,
      nickname,
      message: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      color: '#fc6100',
    };

    setMessages((prev) => {
      if (prev.some((m) => m._id === msgId)) return prev;
      return [...prev, chatMsg];
    });

    socketRef.current.emit('sendMessage', {
      rideCode,
      nickname,
      message: chatInput.trim(),
      msgId,
    });

    // If announcement mode is selected (and user is creator), ALSO trigger voice announcement & popup overlays
    if (isAnnouncementMode && isCreator) {
      socketRef.current.emit('sendAnnouncement', {
        rideCode,
        nickname,
        announcement: chatInput.trim()
      });
    }

    setChatInput('');
  };

  const handleToggleSOS = () => {
    if (!isJoined || !rideCode) return;
    const myRiderInfo = riders.find((r) => r.socketId === socketRef.current.id);
    const currentlySOS = myRiderInfo ? myRiderInfo.isSOS : false;
    const nextSOS = !currentlySOS;

    socketRef.current.emit('sosAlert', {
      rideCode,
      nickname,
      isSOS: nextSOS,
    });
  };

  const handleUpdateGeofence = (radius) => {
    if (!isCreator || !rideCode) return;
    socketRef.current.emit('updateGeofence', { rideCode, radius });
  };

  const handleQuickAction = (actionType) => {
    if (!isJoined || !rideCode) return;
    socketRef.current.emit('quickAction', { rideCode, nickname, actionType });
  };

  const handleSendAnnouncement = (e) => {
    e.preventDefault();
    const txt = chatInput.trim();
    if (!txt || !isCreator || !rideCode) return;

    socketRef.current.emit('sendAnnouncement', { rideCode, nickname, announcement: txt });
    setChatInput('');
  };

  const handleAddHazard = (type) => {
    if (!isJoined || !rideCode) return;
    const hazardId = 'haz_' + Math.random().toString(36).substring(2, 9) + Date.now();
    const newHazard = {
      id: hazardId,
      type,
      lat: currentPosition.lat,
      lng: currentPosition.lng,
      reporter: nickname,
      timestamp: Date.now()
    };
    socketRef.current.emit('addHazard', { rideCode, hazard: newHazard });
    setShowHazardModal(false);
  };

  const addSystemLog = (text) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSystemLogs((prev) => [{ text, time }, ...prev]);
  };

  const [toast, setToast] = useState('');
  const triggerNotification = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  };

  // Telemetry metric selectors using segment-summing
  const metrics = useMemo(() => {
    if (!destination || route.length === 0) {
      return { distanceLeft: '0.0 km', progress: 0, eta: '--:--' };
    }

    const totalRouteDistance = calculateRouteDistance(route);
    
    let closestIndex = 0;
    let minDistance = Infinity;
    for (let i = 0; i < route.length; i++) {
      const dist = calculateDistance(currentPosition.lat, currentPosition.lng, route[i][0], route[i][1]);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }

    let remainingRouteDistance = 0;
    for (let i = closestIndex; i < route.length - 1; i++) {
      const pt1 = route[i];
      const pt2 = route[i + 1];
      remainingRouteDistance += calculateDistance(pt1[0], pt1[1], pt2[0], pt2[1]);
    }

    const progressPercent = Math.min(100, Math.max(0, Math.round(((totalRouteDistance - remainingRouteDistance) / totalRouteDistance) * 100)));
    
    let etaStr = '--:--';
    if (speed > 0) {
      const timeHours = remainingRouteDistance / speed;
      const minsTotal = Math.round(timeHours * 60);
      const hours = Math.floor(minsTotal / 60);
      const mins = minsTotal % 60;
      etaStr = `${hours > 0 ? `${hours}h ` : ''}${mins}m`;
    } else {
      etaStr = 'Resting';
    }

    return {
      distanceLeft: `${remainingRouteDistance.toFixed(1)} km`,
      progress: progressPercent,
      eta: etaStr,
    };
  }, [destination, route, currentPosition, speed]);

  const filteredRiders = useMemo(() => {
    if (!searchQuery.trim()) return riders;
    const query = searchQuery.trim().toLowerCase();
    return riders.filter((r) => 
      r.nickname.toLowerCase().includes(query) ||
      (r.vehicleModel && r.vehicleModel.toLowerCase().includes(query)) ||
      (r.vehicleNumber && r.vehicleNumber.toLowerCase().includes(query))
    );
  }, [riders, searchQuery]);

  const formatDuration = (sec) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Weather warning text generator
  const weatherWarningBanner = useMemo(() => {
    if (!isJoined || !showWeatherOnRoute) return '';
    if (weatherData.rainChance > 45) return '🌧️ Heavy Rain Ahead on Route: Keep safe braking distance.';
    if (weatherData.visibility < 6) return '🌫️ Low Visibility Warning: Dense fog, activate safety flashers.';
    if (weatherData.windSpeed > 25) return '💨 Strong Winds Alert: Highway paths have strong wind gusts.';
    return '';
  }, [isJoined, weatherData, showWeatherOnRoute]);

  // Leaflet Marker Icons builders
  const createRiderIcon = (color, isMe = false, isSOS = false) => {
    return L.divIcon({
      className: 'rider-custom-marker',
      html: `
        <div class="relative flex flex-col items-center">
          <div class="w-8 h-8 rounded-full border-2 ${
            isMe ? 'border-white animate-pulse-orange' : 'border-neutral-800'
          } flex items-center justify-center shadow-lg relative transition-all duration-500" style="background-color: ${color}">
            <div class="w-2.5 h-2.5 rounded-full bg-white"></div>
            ${
              isSOS 
                ? `<div class="absolute inset-0 rounded-full border-4 border-red-500 animate-ping"></div>` 
                : ''
            }
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const getCheckpointEmoji = (name) => {
    if (name.includes('Fuel')) return '⛽';
    if (name.includes('Tea')) return '☕';
    if (name.includes('Food')) return '🍴';
    if (name.includes('Hotel')) return '🏨';
    if (name.includes('Warning')) return '⚠';
    return '🏁';
  };

  const createCheckpointIcon = (order, name) => {
    const emoji = getCheckpointEmoji(name);
    return L.divIcon({
      className: 'checkpoint-custom-marker',
      html: `
        <div class="relative flex flex-col items-center">
          <div class="w-8 h-8 rounded-full bg-[#0c0d12] border-2 border-brandOrange flex items-center justify-center shadow-lg relative animate-pulse-orange">
            <span class="text-xs">${emoji}</span>
            <div class="absolute -top-1.5 -right-1.5 bg-brandOrange text-white font-black text-[7px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white">
              ${order}
            </div>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const createFinishIcon = () => {
    return L.divIcon({
      className: 'finish-custom-marker',
      html: `
        <div class="relative flex flex-col items-center">
          <div class="w-9 h-9 rounded bg-brandOrange border-2 border-white flex items-center justify-center shadow-2xl animate-bounce">
            <span class="text-sm">🏁</span>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  };

  const createHazardIcon = (type) => {
    const emoji = type.includes('Road Closed') ? '⛔' : type.includes('Construction') ? '🚧' : type.includes('Animal') ? '🐄' : '⚠';
    return L.divIcon({
      className: 'hazard-custom-marker',
      html: `
        <div class="relative flex flex-col items-center">
          <div class="w-8 h-8 rounded-full bg-red-950 border-2 border-red-500 flex items-center justify-center shadow-lg animate-pulse">
            <span class="text-xs">${emoji}</span>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  // Entrance UI Overlay if callsign has not been created (Default Yamaha Ray ZR preset)
  if (!nickname) {
    return (
      <div className="min-h-screen bg-[#07080c] flex flex-col items-center justify-center p-4 font-sans select-none relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(252,97,0,0.1),transparent_70%)] pointer-events-none"></div>

        <div className="w-full max-w-sm p-6 rounded-xl bg-[#0b0c10]/90 backdrop-blur-xl border border-white/[0.06] shadow-2xl relative z-10 flex flex-col items-center transition-all duration-300">
          <div className="w-12 h-12 rounded-lg bg-brandOrange flex items-center justify-center text-white font-black text-xl mb-4 shadow-lg animate-pulse-orange">
            🧭
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">
            EASY<span className="text-brandOrange">TRIP</span>
          </h1>
          <p className="text-neutral-400 text-[10px] mt-1 text-center font-extrabold uppercase tracking-widest mb-6">
            Real-Time Cyberpunk Biker Radar
          </p>

          <form onSubmit={handleEnterNickname} className="w-full space-y-4">
            <div>
              <label className="block text-neutral-400 text-[8px] font-black uppercase tracking-widest mb-1">
                RIDER CALLSIGN *
              </label>
              <input
                type="text"
                value={tempNickname}
                onChange={(e) => setTempNickname(e.target.value)}
                placeholder="e.g. Aman Patel"
                required
                maxLength={12}
                className="w-full py-2 px-3 bg-[#111218] border border-[#1f2029] rounded focus:border-brandOrange text-xs font-bold uppercase tracking-wider text-white placeholder-neutral-700 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-400 text-[8px] font-black uppercase tracking-widest mb-1">
                  VEHICLE TYPE *
                </label>
                <select
                  value={tempVehicleType}
                  onChange={(e) => setTempVehicleType(e.target.value)}
                  className="w-full py-2 px-3 bg-[#111218] border border-[#1f2029] rounded focus:border-brandOrange text-xs font-bold uppercase text-white focus:outline-none"
                >
                  <option value="Scooter">Scooter</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="Car">Car</option>
                  <option value="Bicycle">Bicycle</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 text-[8px] font-black uppercase tracking-widest mb-1">
                  VEHICLE NO *
                </label>
                <input
                  type="text"
                  value={tempVehicleNumber}
                  onChange={(e) => setTempVehicleNumber(e.target.value)}
                  placeholder="e.g. UP32 AB 1234"
                  required
                  maxLength={16}
                  className="w-full py-2 px-3 bg-[#111218] border border-[#1f2029] rounded focus:border-brandOrange text-xs font-bold uppercase tracking-wider text-white placeholder-neutral-700 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-neutral-400 text-[8px] font-black uppercase tracking-widest mb-1">
                VEHICLE MODEL *
              </label>
              <input
                type="text"
                value={tempVehicleModel}
                onChange={(e) => setTempVehicleModel(e.target.value)}
                placeholder="e.g. Yamaha Ray ZR"
                required
                maxLength={30}
                className="w-full py-2 px-3 bg-[#111218] border border-[#1f2029] rounded focus:border-brandOrange text-xs font-bold uppercase tracking-wider text-white placeholder-neutral-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-neutral-400 text-[8px] font-black uppercase tracking-widest mb-1">
                EMERGENCY CONTACT (OPTIONAL)
              </label>
              <input
                type="text"
                value={tempEmergencyContact}
                onChange={(e) => setTempEmergencyContact(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                maxLength={16}
                className="w-full py-2 px-3 bg-[#111218] border border-[#1f2029] rounded focus:border-brandOrange text-xs font-bold uppercase tracking-wider text-white placeholder-neutral-700 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={!tempNickname.trim() || !tempVehicleModel.trim() || !tempVehicleNumber.trim()}
              className="w-full py-2.5 bg-brandOrange hover:bg-[#e25700] disabled:opacity-40 disabled:hover:bg-brandOrange text-white font-extrabold text-xs tracking-widest uppercase transition-all shadow-md rounded"
            >
              Initialize Cockpit
            </button>
          </form>
        </div>

        {/* Ride History record vault list */}
        {rideHistory.length > 0 && (
          <div className="w-full max-w-sm mt-5 p-5 rounded-xl bg-[#0b0c10]/90 backdrop-blur-xl border border-white/[0.06] flex flex-col gap-3 z-10 shadow-2xl max-h-52 animate-fade-in">
            <span className="text-brandOrange text-[9px] font-black uppercase tracking-widest text-center border-b border-[#1f2029] pb-2">
              🏍️ RIDE RECORDS VAULT
            </span>
            <div className="space-y-2 overflow-y-auto pr-1 flex-grow">
              {rideHistory.map((h) => (
                <div key={h.id} className="p-2.5 rounded bg-[#111218] border border-[#1f2029] flex flex-col gap-1 text-[9px] uppercase font-bold tracking-wide">
                  <div className="flex justify-between">
                    <span className="font-extrabold text-white text-[10px]">{h.riderName}</span>
                    <span className="text-neutral-500 font-semibold">{h.tripDate}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="truncate max-w-[150px] text-neutral-400">{h.vehicleModel}</span>
                    <span className="text-brandOrange font-black">{h.distanceCovered} km run</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#060608] overflow-hidden flex font-sans text-white select-none relative">
      
      {/* 1. LEFT SIDEBAR PANEL (Collapsible / Responsive Drawers) */}
      <aside className={`w-80 h-full bg-[#0b0c10]/95 border-r border-[#1a1c23] flex flex-col p-5 z-20 shrink-0 select-none shadow-2xl transition-all duration-300 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      } fixed md:static inset-y-0 left-0`}>
        {/* App Title Header */}
        <div className="flex items-center justify-between mb-5 select-none shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-brandOrange flex items-center justify-center text-white font-black text-sm shadow-md shadow-brandOrange/15">
              🧭
            </div>
            <span className="text-md font-black tracking-wider uppercase text-white">
              EASY<span className="text-brandOrange">TRIP</span>
            </span>
          </div>
          {/* Mobile Collapse Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-1 bg-neutral-900 border border-[#1a1c23] rounded hover:border-brandOrange text-neutral-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Dynamic Join / Create Ride Panels */}
        {!isJoined ? (
          <div className="flex flex-col gap-4 shrink-0">
            <button
              onClick={handleCreateRide}
              className="w-full py-3 px-4 bg-brandOrange hover:bg-[#e25700] text-white font-black text-xs tracking-widest uppercase rounded-lg shadow-lg shadow-brandOrange/10 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={14} /> Create Ride Session
            </button>

            <form onSubmit={handleJoinRide} className="space-y-2 pt-2 border-t border-[#1a1c23]">
              <span className="block text-[8px] text-neutral-500 font-bold uppercase tracking-wider">Join Existing Run</span>
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                placeholder="RIDE CODE"
                required
                className="w-full py-2 px-3 bg-[#111218] border border-[#1f2029] focus:border-brandOrange rounded text-xs font-black uppercase text-center tracking-widest text-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={!joinCodeInput.trim()}
                className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-white font-black text-xs tracking-widest uppercase rounded-lg transition-all"
              >
                Join Ride Room
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-3 shrink-0">
            <div className="p-3 bg-[#111218] rounded-lg border border-[#1f2029] flex flex-col gap-2 relative">
              <span className="text-[8px] text-neutral-500 font-bold uppercase">Room Code</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-brandOrange tracking-widest select-all">{rideCode}</span>
                <button
                  onClick={() => {
                    const shareUrl = `${window.location.origin}?join=${rideCode}`;
                    navigator.clipboard.writeText(shareUrl);
                    triggerNotification('Share Link copied to clipboard.');
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
              className="w-full py-2 bg-brandCrimson/10 hover:bg-brandCrimson/20 border border-brandCrimson/25 text-brandCrimson font-extrabold text-[9px] tracking-widest uppercase rounded-lg transition-all flex items-center justify-center gap-1.5"
            >
              Leave Session
            </button>
          </div>
        )}

        {/* Collapsible milestone vertical timeline pipeline */}
        {isJoined && destination && (
          <div className="mt-4 p-3 bg-[#0d0e12] rounded-lg border border-white/[0.04] flex flex-col gap-2.5 shrink-0 max-h-40 overflow-y-auto">
            <span className="text-[8px] text-neutral-500 font-black uppercase tracking-widest">🏁 ROAD MILESTONES TIMELINE</span>
            <div className="relative pl-3.5 flex flex-col gap-3 border-l border-neutral-850">
              <div className="relative flex items-center gap-2">
                <div className="absolute -left-[18.5px] w-2.5 h-2.5 rounded-full bg-emerald-500 border border-neutral-900"></div>
                <div className="flex flex-col text-[9px] uppercase font-bold tracking-wide">
                  <span className="text-emerald-400 font-black">Departure</span>
                  <span className="text-neutral-500">Speed: {speed} km/h</span>
                </div>
              </div>

              {checkpoints.map((cp) => {
                const reached = reachedCheckpointsRef.current.has(cp.order);
                return (
                  <div key={cp.order} className="relative flex items-center gap-2">
                    <div className={`absolute -left-[18.5px] w-2.5 h-2.5 rounded-full border border-neutral-900 ${
                      reached ? 'bg-brandOrange animate-pulse-orange' : 'bg-neutral-800'
                    }`}></div>
                    <div className="flex flex-col text-[9px] uppercase font-bold tracking-wide">
                      <span className={reached ? 'text-brandOrange font-black animate-pulse' : 'text-neutral-400'}>
                        {getCheckpointEmoji(cp.name)} {cp.name}
                      </span>
                      <span className="text-neutral-500">Stop #{cp.order}</span>
                    </div>
                  </div>
                );
              })}

              <div className="relative flex items-center gap-2">
                <div className="absolute -left-[18.5px] w-2.5 h-2.5 rounded-full bg-brandOrange border border-neutral-900 animate-pulse"></div>
                <div className="flex flex-col text-[9px] uppercase font-bold tracking-wide">
                  <span className="text-white font-black">Destination</span>
                  <span className="text-neutral-500">{metrics.distanceLeft} left</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic active riders catalog list */}
        {isJoined && (
          <div className="grow overflow-hidden mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between shrink-0">
              <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Users size={11} className="text-brandOrange" /> Active Group ({riders.length})
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-brandOrange animate-pulse shrink-0"></span>
            </div>

            <div className="relative shrink-0 select-none">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Pilot calls..."
                className="w-full py-1.5 pl-8 pr-3 bg-neutral-900 hover:bg-neutral-850 rounded border border-[#1a1c23] focus:border-brandOrange text-[9px] font-bold uppercase tracking-wider text-white placeholder-neutral-600 focus:outline-none transition-all"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 text-xs font-black">🔍</span>
            </div>

            <div className="space-y-2 pr-1 overflow-y-auto flex-grow select-none">
              {filteredRiders.map((r) => {
                const isMe = r.socketId === socketRef.current?.id;
                const distanceVal = calculateDistance(currentPosition.lat, currentPosition.lng, r.lat, r.lng);
                const distanceStr = isMe 
                  ? '0m (Me)' 
                  : distanceVal < 1 
                    ? `${(distanceVal * 1000).toFixed(0)}m` 
                    : `${distanceVal.toFixed(1)} km`;

                return (
                  <div
                    key={r.socketId}
                    onClick={() => {
                      setAutoCenter(false);
                      setFollowingRiderId(null);
                      setCurrentPosition({ lat: r.lat, lng: r.lng });
                      triggerNotification(`Centering map on ${r.nickname}`);
                    }}
                    className={`p-2.5 rounded-lg border border-white/[0.04] bg-[#0c0d12] hover:bg-[#15161f] cursor-pointer transition-all flex flex-col gap-1.5 ${
                      r.isSOS ? 'border-red-500/40 bg-red-950/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.isSOS ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                        <span className="text-white font-extrabold text-[11px] truncate uppercase tracking-wide">{r.nickname}</span>
                        {isMe && <span className="text-[7px] bg-brandOrange/25 text-brandOrange px-1 py-0.5 rounded font-black shrink-0">ME</span>}
                        {r.socketId === creatorId && <span className="text-[7px] bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/20 px-1 py-0.5 rounded font-black shrink-0">LDR</span>}
                      </div>
                      <span className="text-[9px] text-neutral-400 font-bold">{isMe ? speed : r.speed || 0} km/h</span>
                    </div>

                    <div className="flex flex-col gap-0.5 text-[9px] text-neutral-400 font-medium">
                      <div className="flex items-center gap-1 uppercase">
                        <span className="text-xs">{getVehicleEmoji(r.vehicleType)}</span>
                        <span className="text-neutral-300 font-bold truncate">{r.vehicleModel || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[8px] text-neutral-500 font-semibold tracking-wide">
                        <span>{r.vehicleNumber || 'N/A'}</span>
                        <span className="text-brandOrange font-bold">{distanceStr} away</span>
                      </div>
                    </div>

                    {r.isSOS && (
                      <span className="text-[7.5px] bg-red-950/80 border border-red-500/20 text-red-500 font-black px-1 py-0.5 rounded text-center animate-pulse">
                        🚨 EMERGENCY: ACTIVE SOS DISTRESS
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Profile Card Bottom Badge */}
        <div className="mt-auto pt-3 border-t border-[#1a1c23] flex items-center gap-3 shrink-0 select-none">
          <div className="w-8 h-8 rounded-full bg-brandOrange flex items-center justify-center font-black text-white uppercase text-xs">
            {nickname.substring(0, 2)}
          </div>
          <div className="flex flex-col truncate max-w-[180px]">
            <span className="text-xs font-black text-white uppercase tracking-wider truncate">{nickname}</span>
            <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest truncate">{vehicleModel} | {vehicleNumber}</span>
          </div>
        </div>
      </aside>

      {/* 2. CENTER INTERACTIVE MAP AREA */}
      <div className="grow flex flex-col h-full overflow-hidden relative z-10">
        
        {/* TOP COMPACT HUD NAVIGATION BAR */}
        <div className="h-16 border-b border-[#1a1c23] bg-[#0b0c10]/95 px-4 flex items-center justify-between gap-4 select-none shrink-0 shadow-md relative z-20">
          <div className="flex items-center gap-2">
            {/* Sidebar toggle buttons */}
            <button
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="p-2 bg-neutral-900 border border-[#1a1c23] rounded hover:border-brandOrange text-white shadow-xl animate-fade-in"
              title="Toggle Sidebar"
            >
              <Users size={14} />
            </button>
            
            {/* Ride Replay Mode entry button */}
            {isJoined && replayCoordsHistory.length > 1 && (
              <button
                onClick={() => {
                  setIsReplayMode((prev) => {
                    const next = !prev;
                    if (next) {
                      setReplayCurrentIndex(0);
                      setCurrentPosition(replayCoordsHistory[0]);
                    } else {
                      setIsPlayingReplay(false);
                    }
                    return next;
                  });
                }}
                className={`py-1.5 px-3 rounded border text-[9px] font-black uppercase tracking-widest transition-all ${
                  isReplayMode 
                    ? 'bg-brandOrange border-brandOrange text-white shadow shadow-brandOrange/25 animate-pulse-orange' 
                    : 'bg-neutral-900 border-[#1a1c23] hover:border-brandOrange text-neutral-300'
                }`}
              >
                {isReplayMode ? 'Exit Replay' : 'Replay Ride'}
              </button>
            )}
          </div>

          {/* Core HUD values */}
          <div className="flex items-center gap-4 md:gap-7 shrink-0 text-center select-none font-bold">
            <div className="flex flex-col">
              <span className="text-[7.5px] text-neutral-500 font-black uppercase tracking-widest">Group speed</span>
              <span className="text-xs font-black text-white tracking-wide">{isJoined ? `${speed} km/h` : '0 km/h'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[7.5px] text-neutral-500 font-black uppercase tracking-widest">Avg speed</span>
              <span className="text-xs font-black text-white tracking-wide">{isJoined ? `${averageSpeed} km/h` : '0 km/h'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[7.5px] text-neutral-500 font-black uppercase tracking-widest">Max speed</span>
              <span className="text-xs font-black text-white tracking-wide">{isJoined ? `${maxSpeed} km/h` : '0 km/h'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[7.5px] text-neutral-500 font-black uppercase tracking-widest">Distance remaining</span>
              <span className="text-xs font-black text-white tracking-wide">{isJoined ? metrics.distanceLeft : '0.0 km'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[7.5px] text-neutral-500 font-black uppercase tracking-widest">Active stopwatch</span>
              <span className="text-xs font-black text-white tracking-wide font-mono">{formatDuration(rideDurationSeconds)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[7.5px] text-neutral-500 font-black uppercase tracking-widest">Weather status</span>
              <span className="text-xs font-black text-white tracking-wide">{weatherData.temp}°C | {weatherData.rainChance}% Rain</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRightDrawerOpen((prev) => !prev)}
              className="p-2 bg-neutral-900 border border-[#1a1c23] rounded hover:border-brandOrange text-white shadow-xl animate-fade-in"
              title="Toggle Group Chat"
            >
              <MessageSquare size={14} />
            </button>
          </div>
        </div>

        {/* Weather Alerts warning banner */}
        {weatherWarningBanner && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-4 animate-bounce">
            <div className="py-2 px-3 bg-red-955 border border-red-500/30 text-white font-extrabold text-[8.5px] uppercase tracking-wider text-center rounded-lg shadow-2xl backdrop-blur-md">
              {weatherWarningBanner}
            </div>
          </div>
        )}

        {/* Turn-by-Turn GPS voice instructions HUD overlay card */}
        {isJoined && nextManeuver && destination && !isReplayMode && (
          <div className="absolute top-20 left-4 z-20 w-64 bg-[#0b0c10]/95 border border-white/[0.06] rounded-xl p-3.5 shadow-2xl backdrop-blur-xl flex flex-col gap-2.5 select-none animate-fade-in animate-pulse-orange">
            <div className="flex items-center gap-2.5 border-b border-[#1a1c23] pb-2">
              <div className="w-8 h-8 rounded bg-brandOrange/15 border border-brandOrange/30 text-brandOrange flex items-center justify-center shadow-inner">
                <Navigation size={16} className="rotate-45 animate-pulse" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[7.5px] text-neutral-500 font-black uppercase tracking-widest">NEXT MANEUVER</span>
                <span className="text-[10px] font-black text-white uppercase tracking-wide truncate max-w-[160px]">{nextManeuver.instruction}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[9px] uppercase font-bold tracking-wider">
              <span className="text-neutral-400">Distance to Turn</span>
              <span className="text-brandOrange font-black text-[10px]">{nextManeuver.distance < 1000 ? `${nextManeuver.distance.toFixed(0)}m` : `${(nextManeuver.distance / 1000).toFixed(1)} km`}</span>
            </div>
            <div className="flex items-center justify-between text-[9px] uppercase font-bold tracking-wider border-t border-[#1a1c23] pt-2">
              <span className="text-neutral-400">Total Run ETA</span>
              <span className="text-white font-black">{metrics.eta}</span>
            </div>
          </div>
        )}

        {/* Plan checkpoint modal or guideline notifications */}
        {isJoined && isCreator && !destination && (
          <div className="absolute top-20 left-4 z-20 bg-brandOrange/15 border border-brandOrange/30 rounded-lg p-2.5 text-[9px] text-brandOrange font-black uppercase tracking-widest animate-pulse shadow-xl flex items-center gap-2 max-w-sm">
            <MapPin size={12} className="shrink-0" />
            <span>Click roads to lay down target route Destination endpoint</span>
          </div>
        )}

        {/* MAP CONTAINER LAYER */}
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

            <MapController center={
              followingRiderId
                ? (() => {
                    const followed = riders.find((r) => r.socketId === followingRiderId);
                    return followed ? [followed.lat, followed.lng] : null;
                  })()
                : autoCenter 
                  ? [currentPosition.lat, currentPosition.lng] 
                  : null
            } />
            <MapClickHandler onClick={handleMapClick} />

            {/* Winding road routes polyline */}
            {route.length > 0 && (
              <Polyline
                positions={route}
                color="#fc6100"
                weight={4}
                opacity={0.85}
              />
            )}

            {/* Checkpoint milestone pins */}
            {checkpoints.map((cp, idx) => (
              <Marker
                key={idx}
                position={[cp.lat, cp.lng]}
                icon={createCheckpointIcon(cp.order, cp.name)}
              >
                <Popup>
                  <div className="text-xs p-1 font-sans">
                    <h4 className="font-extrabold text-[#fc6100] uppercase text-[10px]">Checkpoint {cp.order}</h4>
                    <p className="text-white mt-0.5 font-bold uppercase text-[9px]">{cp.name}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Target Destination finish pin */}
            {destination && (
              <Marker
                position={[destination.lat, destination.lng]}
                icon={createFinishIcon()}
              >
                <Popup>
                  <div className="text-xs p-1 font-sans text-center">
                    <span className="font-black text-white text-[9.5px] uppercase">🏁 Target Endpoint</span>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Live safety hazards markers */}
            {hazards.map((haz) => (
              <Marker
                key={haz.id}
                position={[haz.lat, haz.lng]}
                icon={createHazardIcon(haz.type)}
              >
                <Popup>
                  <div className="text-xs p-2.5 min-w-[155px] font-sans bg-[#0c0d12]/95 border border-[#242424] rounded-lg">
                    <h4 className="font-extrabold text-red-500 uppercase text-[9.5px] tracking-wide">⚠️ Safety Hazard</h4>
                    <p className="text-white mt-0.5 font-bold uppercase text-[9px]">{haz.type}</p>
                    <p className="text-neutral-500 font-semibold text-[8px] mt-1 border-t border-neutral-800 pt-1">Reported by: {haz.reporter}</p>
                    {isCreator && (
                      <button
                        onClick={() => {
                          socketRef.current.emit('removeHazard', { rideCode, hazardId: haz.id });
                          triggerNotification('Removing hazard flag...');
                        }}
                        className="w-full mt-2 py-1 bg-red-950 border border-red-500/20 text-red-500 text-[8px] font-black uppercase tracking-widest rounded transition-all"
                      >
                        Clear Hazard
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Joined active riders markers */}
            {riders.map((loc) => {
              const isMe = loc.socketId === socketRef.current?.id;
              return (
                <Marker
                  key={loc.socketId}
                  position={[loc.lat, loc.lng]}
                  icon={createRiderIcon(loc.color, isMe, loc.isSOS)}
                >
                  <Popup>
                    <div className="text-xs p-2.5 min-w-[180px] font-sans bg-[#0c0d12]/95 border border-[#242424] rounded-lg select-none">
                      <div className="flex items-center justify-between border-b border-[#242424] pb-1.5 mb-1.5">
                        <span className="font-black text-white text-xs uppercase tracking-wider">{loc.nickname}</span>
                        {isMe ? (
                          <span className="text-[8px] bg-brandOrange/25 text-brandOrange border border-brandOrange/30 px-1.5 rounded uppercase font-black">Me</span>
                        ) : (
                          <span className={`text-[8px] px-1.5 rounded uppercase font-black border ${
                            loc.isSOS 
                              ? 'bg-red-950 border-red-500/30 text-red-500 animate-pulse' 
                              : 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400'
                          }`}>
                            {loc.isSOS ? 'SOS' : 'Active'}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 font-extrabold text-neutral-400 uppercase text-[9px] mb-2 select-text">
                        <p className="flex justify-between gap-2">Model: <span className="text-white truncate max-w-[100px]">{loc.vehicleModel || 'N/A'}</span></p>
                        <p className="flex justify-between gap-2">Plate: <span className="text-white">{loc.vehicleNumber || 'N/A'}</span></p>
                        <p className="flex justify-between gap-2">Speed: <span className="text-white">{isMe ? speed : loc.speed || 0} km/h</span></p>
                        <p className="flex justify-between gap-2">Distance: <span className="text-white">{
                          isMe 
                            ? '0m' 
                            : calculateDistance(currentPosition.lat, currentPosition.lng, loc.lat, loc.lng) < 1
                              ? `${(calculateDistance(currentPosition.lat, currentPosition.lng, loc.lat, loc.lng) * 1000).toFixed(0)}m`
                              : `${calculateDistance(currentPosition.lat, currentPosition.lng, loc.lat, loc.lng).toFixed(1)} km`
                        }</span></p>
                        <p className="flex justify-between gap-2">Battery: <span className="text-white">{isMe ? battery : loc.batteryPercentage || 100}%</span></p>
                      </div>

                      <div className="flex flex-col gap-1 mt-2">
                        {!isMe && (
                          <button
                            onClick={() => {
                              if (followingRiderId === loc.socketId) {
                                setFollowingRiderId(null);
                                triggerNotification('Stopped following rider.');
                              } else {
                                setFollowingRiderId(loc.socketId);
                                setAutoCenter(false);
                                triggerNotification(`Following ${loc.nickname}...`);
                              }
                            }}
                            className={`w-full py-1 text-[8px] font-black uppercase tracking-widest rounded border transition-all ${
                              followingRiderId === loc.socketId 
                                ? 'bg-brandOrange border-brandOrange text-white' 
                                : 'bg-neutral-900 border-[#242424] hover:bg-neutral-800 text-neutral-300'
                            }`}
                          >
                            {followingRiderId === loc.socketId ? '✓ Following' : 'Follow Rider'}
                          </button>
                        )}
                        {!isMe && (
                          <button
                            onClick={() => {
                              setActiveRightTab('chat');
                              setChatInput(`@${loc.nickname} `);
                              setIsRightDrawerOpen(true);
                              triggerNotification(`Pinging @${loc.nickname}...`);
                            }}
                            className="w-full py-1 bg-neutral-900 border border-[#242424] hover:bg-neutral-800 text-neutral-300 text-[8px] font-black uppercase tracking-widest rounded transition-all"
                          >
                            Send Message
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setAutoCenter(false);
                            setFollowingRiderId(null);
                            setCurrentPosition({ lat: loc.lat, lng: loc.lng });
                            triggerNotification(`Viewed location of ${loc.nickname}`);
                          }}
                          className="w-full py-1 bg-neutral-900 border border-[#242424] hover:bg-neutral-800 text-neutral-300 text-[8px] font-black uppercase tracking-widest rounded transition-all"
                        >
                          View Location
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* FLOATING ACTIONS CONTROL DECK OVER MAP */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 shadow-2xl">
            <button
              onClick={() => setAutoCenter((prev) => !prev)}
              className={`p-2.5 rounded-lg border transition-all ${
                autoCenter ? 'bg-brandOrange/25 border-brandOrange/45 text-brandOrange shadow-brandOrange/5' : 'bg-[#0b0c10]/95 border-[#1a1c23] text-neutral-400'
              }`}
              title="Toggle Autocenter"
            >
              <Compass size={15} />
            </button>
            <button
              onClick={() => {
                setAutoCenter(true);
                setFollowingRiderId(null);
                setCurrentPosition({ ...currentPosition });
                triggerNotification('Centered map on your GPS coords.');
              }}
              className="p-2.5 bg-[#0b0c10]/95 border border-[#1a1c23] hover:border-brandOrange text-white rounded-lg transition-all"
              title="Locate GPS Position"
            >
              <Navigation size={15} />
            </button>

            {isJoined && (
              <button
                onClick={() => setFollowingRiderId((prev) => (prev ? null : creatorId))}
                className={`p-2.5 rounded-lg border transition-all ${
                  followingRiderId === creatorId ? 'bg-brandOrange/25 border-brandOrange/45 text-brandOrange shadow shadow-brandOrange/25' : 'bg-[#0b0c10]/95 border-[#1a1c23] text-white'
                }`}
                title="Follow Group Leader"
              >
                👤
              </button>
            )}

            {isJoined && (
              <button
                onClick={() => setShowWeatherOnRoute((prev) => !prev)}
                className={`p-2.5 rounded-lg border transition-all ${
                  showWeatherOnRoute ? 'bg-brandOrange/25 border-brandOrange/45 text-brandOrange shadow-brandOrange/5' : 'bg-[#0b0c10]/95 border-[#1a1c23] text-white'
                }`}
                title="Toggle Route Weather Warnings"
              >
                <CloudSun size={15} />
              </button>
            )}

            {isJoined && (
              <button
                onClick={() => setShowHazardModal(true)}
                className="p-2.5 bg-[#0b0c10]/95 border border-[#1a1c23] hover:border-brandOrange text-red-500 rounded-lg transition-all"
                title="Report Safety Hazard"
              >
                ⚠️
              </button>
            )}
          </div>

          {/* LEADER PANEL: Route Management Controls */}
          {isJoined && isCreator && destination && (
            <div className="absolute top-4 right-4 z-20 flex gap-2 select-none">
              {checkpoints.length > 0 && (
                <button
                  onClick={handleUndoCheckpoint}
                  className="px-3 py-1.5 bg-neutral-900 border border-brandOrange/35 hover:border-brandOrange/75 text-brandOrange rounded-lg font-black text-[9px] uppercase tracking-wider transition-all shadow-xl"
                >
                  Undo CP
                </button>
              )}
              <button
                onClick={handleClearRoute}
                className="px-3 py-1.5 bg-neutral-900 border border-[#1a1c23] hover:border-brandOrange text-neutral-400 hover:text-white rounded-lg font-black text-[9px] uppercase tracking-wider transition-all flex items-center gap-1 shadow-xl"
              >
                <Trash2 size={11} /> Clear Route
              </button>
            </div>
          )}

          {/* LEADER PANEL: Geofence Limit Slider controls */}
          {isJoined && isCreator && (
            <div className="absolute bottom-20 left-4 z-20 bg-[#0b0c10]/95 border border-white/[0.06] rounded-xl p-3 shadow-2xl backdrop-blur-xl flex flex-col gap-1.5 select-none w-56">
              <span className="text-[7.5px] text-neutral-500 font-black uppercase tracking-widest flex items-center gap-1">🛡️ GROUP GEOFENCE RADIUS</span>
              <div className="flex items-center justify-between text-[9px] font-black text-brandOrange">
                <span>Current Limit:</span>
                <span>{geofenceLimit}m</span>
              </div>
              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-neutral-900">
                {[500, 1000, 2000].map((radius) => (
                  <button
                    key={radius}
                    onClick={() => handleUpdateGeofence(radius)}
                    className={`py-1 rounded font-black text-[8px] transition-all border ${
                      geofenceLimit === radius 
                        ? 'bg-brandOrange/25 border-brandOrange/45 text-brandOrange shadow' 
                        : 'bg-[#111218] border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {radius >= 1000 ? `${radius / 1000}km` : `${radius}m`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* FLOATING PLAYBACK CONTROLS DECKS: Replay mode cockpit */}
          {isReplayMode && (
            <div className="absolute bottom-20 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-20 bg-[#0b0c10]/95 border border-white/[0.06] rounded-xl p-3.5 shadow-2xl backdrop-blur-xl flex flex-col gap-2.5 select-none w-full max-w-md animate-fade-in">
              <div className="flex items-center justify-between border-b border-neutral-850 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brandOrange animate-pulse"></span>
                  <span className="text-[9px] font-black text-white uppercase tracking-wider">Ride Replay Cockpit</span>
                </div>
                <span className="text-[8.5px] font-mono text-neutral-500 font-extrabold">Step: {replayCurrentIndex + 1}/{replayCoordsHistory.length}</span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsPlayingReplay((prev) => !prev)}
                    className="p-2 bg-brandOrange hover:bg-[#e25700] text-white rounded-lg transition-all shadow"
                    title={isPlayingReplay ? 'Pause Simulation' : 'Play Simulation'}
                  >
                    {isPlayingReplay ? <Square size={13} /> : <Play size={13} />}
                  </button>

                  <button
                    onClick={() => {
                      setReplayCurrentIndex(0);
                      setCurrentPosition(replayCoordsHistory[0]);
                      setIsPlayingReplay(false);
                      triggerNotification('Reset Replay player index.');
                    }}
                    className="p-2 bg-neutral-900 border border-[#1a1c23] text-neutral-400 hover:text-white rounded-lg transition-all"
                    title="Reset Simulator"
                  >
                    🔄
                  </button>
                </div>

                {/* Progress trackbar slider */}
                <input
                  type="range"
                  min={0}
                  max={replayCoordsHistory.length - 1}
                  value={replayCurrentIndex}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value);
                    setReplayCurrentIndex(idx);
                    setCurrentPosition(replayCoordsHistory[idx]);
                  }}
                  className="grow accent-brandOrange bg-neutral-900 border border-neutral-800 rounded-lg h-1"
                />

                {/* Speed Multiplier selectors */}
                <div className="flex border border-neutral-850 rounded overflow-hidden divide-x divide-neutral-850 text-[8px] font-black shrink-0">
                  {[1, 2, 4].map((mult) => (
                    <button
                      key={mult}
                      onClick={() => setReplaySpeedMultiplier(mult)}
                      className={`px-2.5 py-1.5 transition-all ${
                        replaySpeedMultiplier === mult 
                          ? 'bg-brandOrange text-white' 
                          : 'bg-[#111218] text-neutral-400 hover:text-white'
                      }`}
                    >
                      x{mult}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* FLOATING ACTION BOTTOM DECKS: Quick Actions Pings & Alerts */}
          {isJoined && !isReplayMode && (
            <div className="absolute bottom-6 left-4 right-24 z-20 flex items-center justify-between md:justify-end gap-2.5 select-none">
              {/* Quick status alerts deck */}
              <div className="flex border border-[#1a1c23] bg-[#0b0c10]/95 p-1 rounded-lg shadow-2xl divide-x divide-[#1a1c23] select-none text-[8.5px] font-black uppercase tracking-wider backdrop-blur">
                <button
                  onClick={() => handleQuickAction('📍 Reached Location')}
                  className="px-2.5 py-1.5 hover:text-brandOrange transition-all flex items-center gap-1.5"
                >
                  📍 Reached
                </button>
                <button
                  onClick={() => handleQuickAction('⛽ Need Fuel')}
                  className="px-2.5 py-1.5 hover:text-brandOrange transition-all flex items-center gap-1.5"
                >
                  ⛽ Fuel
                </button>
                <button
                  onClick={() => handleQuickAction('☕ Break Needed')}
                  className="px-2.5 py-1.5 hover:text-brandOrange transition-all flex items-center gap-1.5"
                >
                  ☕ Break
                </button>
                <button
                  onClick={() => handleQuickAction('🚨 Hazard Ahead')}
                  className="px-2.5 py-1.5 hover:text-brandOrange transition-all flex items-center gap-1.5 text-brandCrimson font-black"
                >
                  🚨 Danger
                </button>
              </div>
            </div>
          )}

          {/* DEDICATED LARGE FLOATING SOS BUTTON OVERMAP */}
          <button
            onClick={() => {
              if (!isJoined) {
                triggerNotification('You must create or join a group ride room to broadcast an SOS alert!');
                playAlertSound();
                return;
              }
              handleToggleSOS();
            }}
            className={`absolute bottom-6 right-6 z-30 w-14 h-14 rounded-full flex flex-col items-center justify-center font-black tracking-widest text-[9px] uppercase shadow-2xl transition-all duration-300 ${
              isJoined && riders.find((r) => r.socketId === socketRef.current?.id)?.isSOS
                ? 'bg-red-600 border-2 border-white text-white animate-pulse shadow-red-500/50 shadow-lg'
                : 'bg-[#121212] border-2 border-red-500/50 text-red-500 hover:bg-red-950/20 hover:border-red-500 shadow'
            }`}
            title="Trigger SOS Distress Alert"
          >
            <ShieldAlert size={20} className={isJoined && riders.find((r) => r.socketId === socketRef.current?.id)?.isSOS ? 'animate-bounce' : ''} />
            <span className="text-[7.5px] mt-0.5 font-black">SOS</span>
          </button>
        </div>
      </div>

      {/* 3. RIGHT PANEL: CHAT & SYSTEM ALERTS (Slide Drawer / Collapsible) */}
      <aside className={`w-80 h-full bg-[#0b0c10]/95 border-l border-[#1a1c23] flex flex-col p-5 z-20 shrink-0 select-none shadow-2xl transition-all duration-300 ${
        isRightDrawerOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0 font-medium'
      } fixed md:static inset-y-0 right-0`}>
        {/* Toggle drawer panels controls */}
        <div className="flex bg-[#0c0d12] p-1 rounded-lg border border-[#1a1c23] select-none shrink-0 mb-4 gap-1">
          <button
            onClick={() => setActiveRightTab('chat')}
            className={`grow py-2 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              activeRightTab === 'chat' ? 'bg-[#1a1c23] text-brandOrange font-black border border-[#2b2d38]' : 'text-neutral-500 hover:text-neutral-300 font-bold'
            }`}
          >
            <MessageSquare size={12} /> Chat
          </button>
          <button
            onClick={() => setActiveRightTab('logs')}
            className={`grow py-2 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              activeRightTab === 'logs' ? 'bg-[#1a1c23] text-brandOrange font-black border border-[#2b2d38]' : 'text-neutral-500 hover:text-neutral-300 font-bold'
            }`}
          >
            <Bell size={12} /> Run Logs
          </button>
          {isJoined && (
            <button
              onClick={() => setActiveRightTab('manifest')}
              className={`grow py-2 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                activeRightTab === 'manifest' ? 'bg-[#1a1c23] text-brandOrange font-black border border-[#2b2d38]' : 'text-neutral-500 hover:text-neutral-300 font-bold'
              }`}
            >
              <Compass size={12} /> Manifest
            </button>
          )}
          {/* Mobile drawer closer */}
          <button
            onClick={() => setIsRightDrawerOpen(false)}
            className="md:hidden px-2 py-1 bg-neutral-900 border border-[#1a1c23] rounded hover:border-brandOrange text-neutral-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Tab 1: Group Chat Panel */}
        {activeRightTab === 'chat' && (
          <div className="grow flex flex-col overflow-hidden">
            <div className="grow overflow-y-auto mb-4 space-y-3.5 pr-1 select-text">
              {!isJoined ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-600 gap-2 text-center select-none font-bold uppercase tracking-wider">
                  <MessageSquare size={20} className="text-neutral-700" />
                  <span className="text-[9px]">Chat is locked until you create or join a ride.</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-600 gap-2 text-center select-none font-bold uppercase tracking-wider">
                  <Compass size={20} className="text-neutral-700 animate-spin" style={{ animationDuration: '6s' }} />
                  <span className="text-[9px]">No chat pings received yet</span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.nickname === nickname;
                  return (
                    <div
                      key={msg._id}
                      className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end animate-fade-in' : 'mr-auto items-start'}`}
                    >
                      <span className="text-[7.5px] text-neutral-500 font-black mb-0.5 px-1 uppercase tracking-wider">
                        {isMe ? 'Me' : msg.nickname}
                      </span>
                      <div
                        className={`p-2.5 rounded-lg text-xs ${
                          isMe
                            ? 'bg-brandOrange text-white rounded-tr-none font-semibold shadow shadow-brandOrange/20'
                            : 'bg-[#1c1c1e] text-neutral-200 border border-[#2c2c2e] rounded-tl-none font-medium'
                        }`}
                      >
                        {msg.message}
                      </div>
                      <span className="text-[7.5px] text-neutral-600 font-extrabold mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Submission bar */}
            {isJoined && (
              <form onSubmit={handleSendChat} className="mt-auto flex flex-col gap-2 shrink-0">
                {isCreator && (
                  <div className="flex justify-between items-center px-1 text-[7.5px] font-black uppercase tracking-widest">
                    <span className={isAnnouncementMode ? 'text-brandOrange' : 'text-neutral-500'}>
                      {isAnnouncementMode ? '📢 Announcement Mode Active' : '💬 Chat Mode'}
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isAnnouncementMode}
                        onChange={(e) => setIsAnnouncementMode(e.target.checked)}
                        className="rounded border-neutral-800 bg-[#111218] text-brandOrange focus:ring-0 w-3 h-3 cursor-pointer"
                      />
                      <span className="text-neutral-400 hover:text-white transition-all text-[7px]">LOUD BROADCAST</span>
                    </label>
                  </div>
                )}
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={isAnnouncementMode ? "BROADCAST ANNOUNCEMENT..." : "SEND MESSAGE..."}
                    required
                    className="grow py-2 px-3 rounded-lg bg-[#111218] border border-[#1f2029] text-xs text-white placeholder-neutral-700 focus:border-brandOrange focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="p-2.5 bg-brandOrange hover:bg-[#e25700] disabled:opacity-40 text-white rounded-lg transition-all shadow flex items-center justify-center shrink-0 animate-fade-in"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
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
                <span className="text-[9px]">No system logs generated yet</span>
              </div>
            ) : (
              <div className="space-y-2.5 select-text">
                {systemLogs.map((log, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-white/[0.04] bg-[#0c0d12] flex flex-col gap-1">
                    <span className="text-[9px] text-neutral-300 font-extrabold tracking-wide uppercase leading-relaxed">{log.text}</span>
                    <span className="text-[7.5px] text-neutral-500 font-black self-end">{log.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Group Manifest Panel */}
        {isJoined && activeRightTab === 'manifest' && (
          <div className="grow overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-[#1a1c23] pb-2 mb-2 shrink-0">
              <span className="text-[9px] text-neutral-450 font-black uppercase tracking-wider flex items-center gap-1.5">
                📋 Pilot Manifest ({riders.length})
              </span>
            </div>

            <div className="space-y-2.5 overflow-y-auto pr-1 flex-grow">
              {riders.map((r, idx) => {
                const isRiderLeader = r.socketId === creatorId;
                return (
                  <div key={r.socketId} className="p-2.5 bg-[#0c0d12] border border-white/[0.04] rounded-lg flex flex-col gap-1 text-[9px] tracking-wide relative">
                    <div className="flex items-center justify-between border-b border-[#15171f] pb-1.5 mb-1">
                      <div className="flex items-center gap-1">
                        <span className="text-neutral-500 font-black">{idx + 1}.</span>
                        <span className="text-white font-extrabold uppercase">{r.nickname}</span>
                      </div>
                      <span className={`text-[7.5px] px-1 py-0.5 rounded font-black uppercase shrink-0 ${
                        isRiderLeader 
                          ? 'bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/20' 
                          : 'bg-neutral-800 text-neutral-450'
                      }`}>
                        {isRiderLeader ? 'LEADER' : 'PILOT'}
                      </span>
                    </div>

                    <div className="space-y-0.5 font-extrabold text-neutral-450 uppercase text-[8.5px] select-text">
                      <p className="flex justify-between">Vehicle: <span className="text-white truncate max-w-[125px]">{r.vehicleModel || 'N/A'}</span></p>
                      <p className="flex justify-between">Plate No: <span className="text-white">{r.vehicleNumber || 'N/A'}</span></p>
                      <p className="flex justify-between">Location: <span className="text-brandOrange font-bold">{r.lat.toFixed(5)}, {r.lng.toFixed(5)}</span></p>
                      {r.emergencyContact && (
                        <p className="flex justify-between">SOS Phone: <span className="text-[#00f0ff]">{r.emergencyContact}</span></p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* FULL SCREEN EMERGENCY SOS BROADCAST OVERLAY */}
      {activeSOS && (
        <div className="absolute inset-0 bg-red-950/90 z-40 flex flex-col items-center justify-center p-6 select-none animate-pulse-red">
          <div className="w-14 h-14 rounded-full bg-red-600 border border-white flex items-center justify-center text-white mb-4 animate-bounce shadow-2xl">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-xl font-black text-white tracking-widest uppercase">
            🚨 EMERGENCY BROADCAST 🚨
          </h2>
          <p className="text-white/80 text-[10px] font-bold mt-2 uppercase tracking-widest text-center max-w-xs leading-relaxed">
            Rider <span className="text-white font-black underline">{activeSOS.nickname}</span> triggered an emergency SOS distress alert.
          </p>
          <div className="flex gap-3 mt-8 animate-fade-in">
            <button
              onClick={() => {
                setAutoCenter(false);
                setFollowingRiderId(null);
                setCurrentPosition({ lat: activeSOS.lat, lng: activeSOS.lng });
                setActiveSOS(null);
                triggerNotification(`Centering map on ${activeSOS.nickname}...`);
              }}
              className="px-5 py-2.5 bg-white text-red-700 font-black text-[9px] uppercase tracking-widest rounded-lg shadow-lg hover:bg-neutral-100 transition-all"
            >
              Locate Pilot
            </button>
            <button
              onClick={() => setActiveSOS(null)}
              className="px-5 py-2.5 bg-transparent border border-white/20 text-white/70 hover:text-white font-bold text-[9px] uppercase tracking-widest rounded-lg transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* SAFETY HAZARD DROP REPORT SELECTION MODAL */}
      {showHazardModal && (
        <div className="absolute inset-0 bg-[#060608]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-fade-in">
          <div className="w-full max-w-sm p-5 rounded-xl bg-[#0b0c10] border border-white/[0.06] shadow-2xl relative flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#1a1c23]">
              <div className="w-6 h-6 rounded bg-red-950 border border-red-500 flex items-center justify-center font-black text-[10px] text-red-500 shadow-inner">
                <span>⚠️</span>
              </div>
              <div className="flex flex-col text-left">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Report safety hazard</h3>
                <span className="text-[7.5px] text-neutral-500 font-black uppercase tracking-widest">Mark caution warning point</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-neutral-400 text-[8.5px] font-black uppercase tracking-wider text-left">
                Select Hazard Type
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: '⚠ Dangerous Road', label: 'Dangerous Road' },
                  { type: '🚧 Construction', label: 'Construction' },
                  { type: '⛔ Road Closed', label: 'Road Closed' },
                  { type: '🐄 Animal Crossing', label: 'Animal Crossing' }
                ].map((haz) => (
                  <button
                    key={haz.type}
                    type="button"
                    onClick={() => handleAddHazard(haz.type)}
                    className="py-2.5 px-3 rounded-lg border border-[#1f2029] bg-[#111218] hover:border-red-500/50 hover:bg-red-950/15 text-white font-extrabold text-[9.5px] text-left uppercase transition-all tracking-wide flex items-center gap-1.5 shadow"
                  >
                    {haz.type}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 border-t border-neutral-900 pt-3 mt-1">
              <button
                type="button"
                onClick={() => setShowHazardModal(false)}
                className="w-full py-2 bg-neutral-900 border border-[#1a1c23] hover:bg-neutral-800 text-neutral-400 font-extrabold text-[9px] tracking-widest uppercase rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAN CHECKPOINT milestone naming popup modal */}
      {pendingCPCoords && (
        <div className="absolute inset-0 bg-[#060608]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-fade-in">
          <div className="w-full max-w-sm p-5 rounded-xl bg-[#0b0c10] border border-white/[0.06] shadow-2xl relative flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#1a1c23]">
              <div className="w-6 h-6 rounded bg-brandOrange/25 border border-brandOrange flex items-center justify-center font-black text-[10px] text-brandOrange rotate-45 shadow-inner">
                <span className="-rotate-45">🏁</span>
              </div>
              <div className="flex flex-col text-left">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Plan checkpoint</h3>
                <span className="text-[7.5px] text-neutral-500 font-black uppercase tracking-widest">Checkpoint #{checkpoints.length + 1}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-neutral-400 text-[8.5px] font-black uppercase tracking-wider text-left">
                Select Presets
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: '☕ Tea Break' },
                  { name: '⛽ Fuel Stop' },
                  { name: '🍴 Food Stop' },
                  { name: '🏨 Hotel Stop' },
                  { name: '⚠ Warning Point' }
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleConfirmCheckpoint(preset.name)}
                    className="py-2 px-3 rounded-lg border border-[#1f2029] bg-[#111218] hover:border-brandOrange/50 hover:bg-brandOrange/10 text-white font-extrabold text-[9.5px] text-left uppercase transition-all tracking-wide flex items-center gap-2 shadow"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleConfirmCheckpoint(customCPName.trim() || `Stop ${checkpoints.length + 1}`);
            }} className="flex flex-col gap-3 border-t border-neutral-900 pt-3.5 mt-1">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-neutral-400 text-[8.5px] font-black uppercase tracking-wider">
                  Or Custom Name
                </label>
                <input
                  type="text"
                  value={customCPName}
                  onChange={(e) => setCustomCPName(e.target.value)}
                  placeholder="e.g. SCENIC OVERLOOK"
                  maxLength={20}
                  className="w-full py-2 px-3 bg-[#111218] border border-[#1f2029] focus:border-brandOrange rounded text-xs font-extrabold tracking-wider uppercase text-white placeholder-neutral-700 text-center focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingCPCoords(null);
                    setCustomCPName('');
                  }}
                  className="grow py-2 bg-neutral-900 border border-[#1a1c23] hover:bg-neutral-800 text-neutral-400 font-extrabold text-[9px] tracking-widest uppercase rounded-lg transition-all shadow"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="grow py-2 bg-brandOrange hover:bg-[#e25700] text-white font-black text-[9px] tracking-widest uppercase rounded-lg transition-all shadow-md shadow-brandOrange/10"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOAT ALERTS NOTIFICATION TOAST POPUP */}
      {toast && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 bg-neutral-900/95 border border-[#1a1c23] py-2.5 px-4 rounded-lg text-white font-black text-[9px] uppercase tracking-widest shadow-2xl backdrop-blur-md fade-in flex items-center gap-2 select-none border-brandOrange/30 animate-pulse-orange">
          <Award size={13} className="text-brandOrange animate-bounce" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

export default App;
