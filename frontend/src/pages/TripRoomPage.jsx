import React, { useState, useEffect } from 'react';
import { useActiveTrip } from '../context/ActiveTripContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Dashboard/Navbar';
import Sidebar from '../components/Dashboard/Sidebar';
import StatsBar from '../components/Dashboard/StatsBar';
import LeafletMap from '../components/LiveMap/LeafletMap';
import ChatWindow from '../components/Chat/ChatWindow';
import SOSButton from '../components/SOS/SOSButton';
import CheckpointPanel from '../components/Checkpoint/CheckpointPanel';
import { ArrowLeft, MessageSquare, Compass, ShieldAlert, Settings, LogOut, Users, Trash2, Key, Radio } from 'lucide-react';

const TripRoomPage = ({ onExitRoom }) => {
  const { user } = useAuth();
  const {
    activeTrip,
    leaveTrip,
    endTrip,
    removeParticipant,
    addNotification,
    notifications,
    onlineRiders,
    kicked,
  } = useActiveTrip();

  const [activeSideTab, setActiveSideTab] = useState('chat');

  // Handle redirect if rider is kicked or trip ended
  useEffect(() => {
    if (kicked || !activeTrip) {
      onExitRoom();
    }
  }, [kicked, activeTrip, onExitRoom]);

  const handleBackToDashboard = () => {
    leaveTrip();
    onExitRoom();
  };

  if (!activeTrip) return null;

  const isLeader = activeTrip.creator?._id === user?.id || activeTrip.creator === user?.id;

  return (
    <div className="flex h-screen bg-[#070b13] overflow-hidden select-none">
      {/* 1. Sidebar Nav */}
      <Sidebar activeTab="trip" setActiveTab={() => {}} />

      {/* 2. Main Room Cockpit */}
      <div className="grow flex flex-col h-screen overflow-y-auto">
        {/* Navbar */}
        <header className="h-16 bg-darkCard border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-30 select-none">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToDashboard}
              className="p-2 hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 text-gray-400 hover:text-white transition-all shrink-0"
              title="Return to Dashboard"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="text-sm font-extrabold text-white truncate max-w-xs">{activeTrip.name}</h2>
              <span className="text-[10px] text-gray-500 font-bold flex items-center gap-1 mt-0.5">
                Invite Code: <span className="text-brandCyan font-black select-all">{activeTrip.inviteCode}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isLeader && (
              <button
                onClick={endTrip}
                className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-brandCrimson font-bold text-xs tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-1.5"
              >
                End Ride Session
              </button>
            )}
          </div>
        </header>

        {/* Cockpit grids */}
        <main className="p-8 grow max-w-7xl mx-auto w-full space-y-6">
          {/* Statistics telemetry widgets */}
          <StatsBar />

          {/* Core tracking and telemetry panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Live interactive tracking map (Takes 2 grid sizes) */}
            <div className="lg:col-span-2">
              <LeafletMap />
            </div>

            {/* Right Column: Tabbed utility decks (Chat, Checkpoints, SOS, settings) */}
            <div className="flex flex-col gap-4">
              {/* Tab Selector Headers */}
              <div className="flex bg-darkCard p-1 rounded-xl border border-white/5 select-none shrink-0">
                <button
                  onClick={() => setActiveSideTab('chat')}
                  className={`grow py-2 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    activeSideTab === 'chat' ? 'bg-white/5 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <MessageSquare size={12} />
                  Chat
                </button>
                <button
                  onClick={() => setActiveSideTab('checkpoints')}
                  className={`grow py-2 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    activeSideTab === 'checkpoints' ? 'bg-white/5 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Compass size={12} />
                  Milestones
                </button>
                <button
                  onClick={() => setActiveSideTab('sos')}
                  className={`grow py-2 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    activeSideTab === 'sos' ? 'bg-white/5 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <ShieldAlert size={12} />
                  Safety
                </button>
                {isLeader && (
                  <button
                    onClick={() => setActiveSideTab('admin')}
                    className={`grow py-2 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      activeSideTab === 'admin' ? 'bg-white/5 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <Settings size={12} />
                    Controls
                  </button>
                )}
              </div>

              {/* Utility Deck Body Rendering */}
              <div className="grow">
                {activeSideTab === 'chat' && <ChatWindow />}
                {activeSideTab === 'checkpoints' && <CheckpointPanel />}
                {activeSideTab === 'sos' && <SOSButton />}

                {activeSideTab === 'admin' && isLeader && (
                  <div className="glass-panel p-5 rounded-2xl border border-white/10 shadow-2xl flex flex-col h-[520px] overflow-y-auto space-y-6">
                    <div>
                      <h3 className="text-white font-extrabold text-sm uppercase tracking-wider">Group Administration</h3>
                      <p className="text-gray-400 text-[10px] mt-0.5">Leader permission commands console</p>
                    </div>

                    {/* Participant kicker */}
                    <div className="space-y-3">
                      <h4 className="text-gray-300 text-xs font-bold flex items-center gap-1.5"><Users size={14} className="text-brandCyan" /> Riders List</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {activeTrip.participants.map((p) => {
                          const rider = p.user;
                          const isParticipantMe = rider._id === user?.id;

                          return (
                            <div
                              key={rider._id}
                              className="p-2.5 rounded-xl border border-white/5 bg-white/5 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center font-bold text-white uppercase text-[9px]">
                                  {rider.username.substring(0, 2)}
                                </div>
                                <div>
                                  <span className="text-white font-bold block">{rider.username}</span>
                                  <span className="text-[8px] text-gray-500 block uppercase font-bold">{p.role}</span>
                                </div>
                              </div>

                              {!isParticipantMe && (
                                <button
                                  onClick={() => removeParticipant(rider._id, rider.username)}
                                  className="p-2 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-gray-500 hover:text-brandCrimson rounded-lg transition-all"
                                  title={`Remove ${rider.username}`}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Announcement broadcaster */}
                    <div className="space-y-3 border-t border-white/5 pt-4">
                      <h4 className="text-gray-300 text-xs font-bold flex items-center gap-1.5"><Radio size={14} className="text-brandPurple shrink-0" /> Broadcast Alarm</h4>
                      <p className="text-gray-400 text-[9px] leading-relaxed">
                        Emit a group-wide broadcast that immediately interrupts screens and triggers notification toasts.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          id="broadcast-announcement-input"
                          placeholder="e.g. Group pull over in 2 miles..."
                          className="grow px-3 py-2 rounded-xl glass-input text-[11px]"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.target.value.trim()) {
                              addNotification(`📢 LEADER ALARM: ${e.target.value.trim()}`, 'warning');
                              e.target.value = '';
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            const input = document.getElementById('broadcast-announcement-input');
                            if (input && input.value.trim()) {
                              addNotification(`📢 LEADER ALARM: ${input.value.trim()}`, 'warning');
                              input.value = '';
                            }
                          }}
                          className="px-3 py-2 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-extrabold text-[10px] rounded-xl tracking-wider uppercase transition-all shadow-lg"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Toast Overlay notifications */}
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

export default TripRoomPage;
