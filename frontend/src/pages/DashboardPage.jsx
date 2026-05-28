import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useActiveTrip } from '../context/ActiveTripContext';
import Sidebar from '../components/Dashboard/Sidebar';
import Navbar from '../components/Dashboard/Navbar';
import TripList from '../components/Dashboard/TripList';
import { Compass, Bike, FileText, ChevronRight, CheckCircle2, User, Key, ArrowRight, ShieldCheck, Award } from 'lucide-react';
import api from '../utils/api';
import { MOCK_ROUTE_COORDINATES, MOCK_CHECKPOINTS } from '../utils/geoUtils';

const DashboardPage = ({ onActiveRoomSelected }) => {
  const { user, updateProfile } = useAuth();
  const { joinTrip, notifications } = useActiveTrip();

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
  const [tripName, setTripName] = useState('');
  const [tripDesc, setTripDesc] = useState('');
  const [startPoint, setStartPoint] = useState('San Francisco');
  const [endPoint, setEndPoint] = useState('Sausalito Marina');
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
        // Automatically join the newly created trip room
        await joinTrip(res.data._id);
        onActiveRoomSelected();
      }
    } catch (err) {
      console.error('Trip create API error:', err);
    } finally {
      setIsCreatingTrip(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#070b13] overflow-hidden select-none">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. Main Content Frame */}
      <div className="grow flex flex-col h-screen overflow-y-auto">
        <Navbar onCreateTripClick={() => setShowCreateModal(true)} />

        <main className="p-8 grow max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Decorative Banner */}
              <div className="glass-panel p-8 rounded-3xl relative overflow-hidden border border-cyan-500/10 bg-gradient-to-r from-cyan-950/20 via-slate-900/40 to-violet-950/20">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-tr from-cyan-500/10 to-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10 max-w-2xl">
                  <span className="text-[10px] bg-brandCyan/20 text-brandCyan font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-cyan-500/10 flex items-center gap-1.5 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-brandCyan"></span> Ready To Ride
                  </span>
                  <h1 className="text-3xl font-black text-white tracking-tight mt-4">
                    Coordinate Your Travel Group in Real-Time
                  </h1>
                  <p className="text-gray-400 text-xs mt-2 leading-relaxed">
                    EasyTrip links live GPS mapping telemetry with active separation warning radars, instant high-priority SOS alarms, checkpoint monitoring trackers, and direct chat logs.
                  </p>
                </div>
              </div>

              {/* Ride Directory */}
              <TripList onActiveTripSelected={onActiveRoomSelected} />
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto space-y-8 fade-in">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <User size={22} className="text-brandCyan" /> Rider Account Settings
                </h2>
                <p className="text-gray-400 text-xs mt-0.5">Manage your vehicle profiles and details</p>
              </div>

              {profileSuccessMsg && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2 font-bold animate-pulse">
                  <ShieldCheck size={16} />
                  {profileSuccessMsg}
                </div>
              )}

              <form onSubmit={handleProfileUpdate} className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-300 text-[10px] font-bold uppercase tracking-wider mb-2">Username</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-xs opacity-50 cursor-not-allowed"
                      value={user?.username}
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-[10px] font-bold uppercase tracking-wider mb-2">Email Address</label>
                    <input
                      type="email"
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-xs opacity-50 cursor-not-allowed"
                      value={user?.email}
                      disabled
                    />
                  </div>
                </div>

                <div className="border-t border-white/5 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-300 text-[10px] font-bold uppercase tracking-wider mb-2">Vehicle / Bike Model</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                        <Bike size={16} />
                      </div>
                      <input
                        type="text"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
                        value={bikeModel}
                        onChange={(e) => setBikeModel(e.target.value)}
                        placeholder="e.g. BMW R 1250 GS"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-300 text-[10px] font-bold uppercase tracking-wider mb-2">License Plate</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                        <FileText size={16} />
                      </div>
                      <input
                        type="text"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
                        value={licensePlate}
                        onChange={(e) => setLicensePlate(e.target.value)}
                        placeholder="e.g. CA 98765"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-[10px] font-bold uppercase tracking-wider mb-2">Riding Proficiency Badge</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                      <Award size={16} />
                    </div>
                    <select
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
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
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-extrabold text-xs tracking-wider uppercase transition-all shadow-lg hover:shadow-cyan-500/10"
                >
                  {isUpdatingProfile ? 'Saving updates...' : 'Save Settings'}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* 3. Create Trip Pop-Up Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-darkCard border border-white/10 rounded-2xl p-6 relative shadow-2xl">
            <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">Configure Road Trip</h3>
            <p className="text-gray-400 text-xs mb-6">Set up your start/end points, checkpoints, and route.</p>

            <form onSubmit={handleCreateTripSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-[10px] font-bold uppercase tracking-wider mb-2">Trip Name *</label>
                <input
                  type="text"
                  required
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  placeholder="e.g. Marin Scenic Weekend Run"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-[10px] font-bold uppercase tracking-wider mb-2">Short Description</label>
                <textarea
                  value={tripDesc}
                  onChange={(e) => setTripDesc(e.target.value)}
                  placeholder="Details about meeting spots, gear, speeds..."
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs h-20"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-[10px] font-bold uppercase tracking-wider mb-2">Start Landmark</label>
                  <input
                    type="text"
                    value={startPoint}
                    onChange={(e) => setStartPoint(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-[10px] font-bold uppercase tracking-wider mb-2">End Destination</label>
                  <input
                    type="text"
                    value={endPoint}
                    onChange={(e) => setEndPoint(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-[10px] text-gray-400 leading-relaxed">
                📢 <span className="text-brandCyan font-bold">Smart Defaults Installed</span>: Creating this trip will pre-configure 4 coastal scenic checkpoints and route polyline arrays so you can immediately experience real-time tracking, separation warners, and progress dashboard metrics.
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 py-2.5 px-4 rounded-xl border border-white/10 text-gray-400 hover:text-white font-bold text-xs tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTrip || !tripName}
                  className="w-1/2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-extrabold text-xs tracking-wider uppercase transition-all shadow-lg hover:shadow-violet-600/20"
                >
                  {isCreatingTrip ? 'Configuring...' : 'Launch Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Active Float Toast Notifications Panel */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-3.5 rounded-xl border shadow-xl flex items-center gap-3 text-xs font-bold font-sans fade-in text-white ${
              n.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/20'
                : n.type === 'error'
                ? 'bg-red-950/90 border-red-500/20 animate-pulse'
                : n.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/20'
                : 'bg-slate-900/90 border-white/10'
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
