import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useActiveTrip } from '../context/ActiveTripContext';
import Sidebar from '../components/Dashboard/Sidebar';
import Navbar from '../components/Dashboard/Navbar';
import TripList from '../components/Dashboard/TripList';
import { Compass, Bike, FileText, User, ShieldCheck, Award } from 'lucide-react';
import api from '../utils/api';
import { MOCK_ROUTE_COORDINATES, MOCK_CHECKPOINTS } from '../utils/geoUtils';

const DashboardPage = ({ onActiveRoomSelected }) => {
  const { user, updateProfile } = useAuth();
  const { joinTrip, joinLocalTrip, notifications } = useActiveTrip();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Profile Edit fields
  const [bikeModel, setBikeModel] = useState(user?.riderDetails?.bikeModel || '');
  const [licensePlate, setLicensePlate] = useState(user?.riderDetails?.licensePlate || '');
  const [experienceLevel, setExperienceLevel] = useState(user?.riderDetails?.experienceLevel || 'Beginner');
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Create Trip fields
  const [tripName, setTripName] = useState('Chai Break');
  const [tripDesc, setTripDesc] = useState('GST Road Chennai travel coordination run');
  const [startPoint, setStartPoint] = useState('Kattankulathur, Chennai');
  const [endPoint, setEndPoint] = useState('Mahindra World City, Chennai');
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileSuccessMsg('');
    const success = await updateProfile({
      bikeModel,
      licensePlate,
      experienceLevel,
      profileImage,
    });
    setIsUpdatingProfile(false);
    if (success) {
      setProfileSuccessMsg('Rider profile synchronized successfully!');
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    }
  };

  const handleCreateTripSubmit = async (e) => {
    e.preventDefault();
    if (!tripName) return;

    setIsCreatingTrip(true);
    
    // Proactively request browser location permission!
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => console.log('Location access granted.'),
        (err) => console.warn('Location access denied:', err.message)
      );
    }

    try {
      const res = await api.post('/trips/create', {
        name: tripName,
        description: tripDesc,
        startPoint,
        endPoint,
        polyline: MOCK_ROUTE_COORDINATES, //Scenic Headlands Loop coordinates
        checkpoints: MOCK_CHECKPOINTS,
        visibility: 'public',
      });

      if (res.data) {
        setShowCreateModal(false);
        setTripName('');
        setTripDesc('');
        await joinTrip(res.data._id);
        onActiveRoomSelected();
      }
    } catch (err) {
      console.warn('Backend failed or cold-starting, entering offline fallback mode:', err);
      // Client-side fallback: guarantees Launch Trip works instantly under all environments!
      const mockTripId = 'local_trip_' + Math.random().toString(36).substring(2, 9);
      const mockCreatedTrip = {
        _id: mockTripId,
        name: tripName,
        description: tripDesc,
        inviteCode: 'LOCAL1',
        creator: user || { username: 'Guest' },
        status: 'active',
        route: {
          startPoint: startPoint || 'Kattankulathur, Chennai',
          endPoint: endPoint || 'Mahindra World City, Chennai',
          polyline: MOCK_ROUTE_COORDINATES,
        },
        checkpoints: MOCK_CHECKPOINTS,
        participants: [
          {
            user: user || { username: 'Guest' },
            role: 'leader',
          },
        ],
        visibility: 'public',
      };

      setShowCreateModal(false);
      setTripName('');
      setTripDesc('');
      joinLocalTrip(mockCreatedTrip);
      onActiveRoomSelected();
    } finally {
      setIsCreatingTrip(false);
    }
  };

  return (
    <div className="flex h-screen bg-darkBg overflow-hidden font-sans">
      {/* Left Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Frame */}
      <div className="grow flex flex-col h-screen overflow-y-auto">
        <Navbar onCreateTripClick={() => setShowCreateModal(true)} />

        <main className="p-8 grow max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Premium Athletic Strava Banner */}
              <div className="glass-panel p-6 rounded-lg border border-[#242424] bg-[#121212]">
                <div className="relative z-10 max-w-2xl">
                  <span className="text-[9px] bg-brandOrange/15 text-brandOrange font-black px-2.5 py-1 rounded uppercase tracking-wider border border-brandOrange/25 flex items-center gap-1.5 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-brandOrange"></span> Ready To Ride
                  </span>
                  <h1 className="text-2xl font-black text-white tracking-tight mt-3 uppercase">
                    Coordinate Your Travel Group in Real-Time
                  </h1>
                  <p className="text-neutral-400 text-xs mt-1.5 leading-relaxed font-medium">
                    EasyTrip connects live GPS mapping coordinates with separation alerts, high-priority SOS emergency alarms, checkpoint trackers, and group chat.
                  </p>
                </div>
              </div>

              {/* Ride Directory */}
              <TripList onActiveTripSelected={onActiveRoomSelected} />
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-xl mx-auto space-y-6 fade-in">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <User size={20} className="text-brandOrange" /> Rider Profile Settings
                </h2>
                <p className="text-neutral-400 text-xs mt-0.5 font-medium">Manage your vehicle profiles and proficiency levels</p>
              </div>

              {profileSuccessMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md text-xs flex items-center gap-2 font-bold">
                  <ShieldCheck size={14} />
                  {profileSuccessMsg}
                </div>
              )}

              <form onSubmit={handleProfileUpdate} className="glass-panel p-5 rounded-lg border border-[#242424] space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Username</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded glass-input text-xs opacity-50 cursor-not-allowed"
                      value={user?.username}
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Rider ID</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded glass-input text-xs opacity-50 cursor-not-allowed"
                      value={user?.id}
                      disabled
                    />
                  </div>
                </div>

                <div className="border-t border-[#242424] pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Vehicle / Bike Model</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                        <Bike size={14} />
                      </div>
                      <input
                        type="text"
                        className="w-full pl-8 pr-3 py-2.5 rounded glass-input text-xs"
                        value={bikeModel}
                        onChange={(e) => setBikeModel(e.target.value)}
                        placeholder="e.g. Specialized Tarmac SL8"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">License Plate</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                        <FileText size={14} />
                      </div>
                      <input
                        type="text"
                        className="w-full pl-8 pr-3 py-2.5 rounded glass-input text-xs"
                        value={licensePlate}
                        onChange={(e) => setLicensePlate(e.target.value)}
                        placeholder="e.g. CA 98765"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Riding Proficiency Badge</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                      <Award size={14} />
                    </div>
                    <select
                      className="w-full pl-8 pr-3 py-2.5 rounded glass-input text-xs appearance-none font-medium"
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                    >
                      <option value="Beginner" className="bg-darkBg text-white">Beginner Level</option>
                      <option value="Intermediate" className="bg-darkBg text-white">Intermediate Level</option>
                      <option value="Expert" className="bg-darkBg text-white">Expert Level</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="w-full py-2.5 px-4 rounded bg-brandOrange hover:bg-[#e25700] text-white font-extrabold text-xs tracking-wider uppercase transition-all shadow-md"
                >
                  {isUpdatingProfile ? 'Syncing updates...' : 'Save Settings'}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Create Trip Pop-Up Modal - Strava style */}
      {showCreateModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-darkCard border border-[#242424] rounded-lg p-5 relative shadow-2xl">
            <h3 className="text-base font-black text-white uppercase tracking-wider mb-1">Create Road Trip</h3>
            <p className="text-neutral-400 text-xs mb-4 font-medium">Set up your start/end points, checkpoints, and route.</p>

            <form onSubmit={handleCreateTripSubmit} className="space-y-4">
              <div>
                <label className="block text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Trip Name *</label>
                <input
                  type="text"
                  required
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  placeholder="e.g. Marin Scenic Weekend Run"
                  className="w-full px-3 py-2 rounded glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  value={tripDesc}
                  onChange={(e) => setTripDesc(e.target.value)}
                  placeholder="Details about meeting spots, gear, speeds..."
                  className="w-full px-3 py-2 rounded glass-input text-xs h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Start Landmark</label>
                  <input
                    type="text"
                    value={startPoint}
                    onChange={(e) => setStartPoint(e.target.value)}
                    className="w-full px-3 py-2 rounded glass-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">End Destination</label>
                  <input
                    type="text"
                    value={endPoint}
                    onChange={(e) => setEndPoint(e.target.value)}
                    className="w-full px-3 py-2 rounded glass-input text-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#1c1c1e] rounded border border-[#2c2c2e] text-[9px] text-neutral-400 leading-relaxed font-semibold">
                📢 <span className="text-brandOrange">Preset Active Defaults</span>: Creating this trip will pre-configure 4 coastal scenic checkpoints and route polyline coordinates so you can immediately experience live tracking and ETAs.
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 py-2 px-3 rounded border border-[#242424] text-neutral-400 hover:text-white font-bold text-xs tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTrip || !tripName}
                  className="w-1/2 py-2 px-3 rounded bg-brandOrange hover:bg-[#e25700] text-white font-extrabold text-xs tracking-wider uppercase transition-all shadow-md"
                >
                  {isCreatingTrip ? 'Configuring...' : 'Launch Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full font-sans">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-3 rounded border shadow-xl flex items-center gap-3 text-xs font-bold text-white ${
              n.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/20'
                : n.type === 'error'
                ? 'bg-red-950/90 border-red-500/20 animate-pulse'
                : n.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/20'
                : 'bg-neutral-900/95 border-[#242424]'
            }`}
          >
            <span>{n.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;
