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
import { ArrowLeft, MessageSquare, Compass, ShieldAlert, Settings, Users, Trash2, Radio } from 'lucide-react';

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
    <div className="flex h-screen bg-darkBg overflow-hidden font-sans">
      {/* 1. Sidebar Nav */}
      <Sidebar activeTab="trip" setActiveTab={() => {}} />

      {/* 2. Main Room Cockpit */}
      <div className="grow flex flex-col h-screen overflow-y-auto">
        {/* Navbar */}
        <header className="h-16 bg-darkCard border-b border-[#242424] flex items-center justify-between px-8 sticky top-0 z-30 select-none">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToDashboard}
              className="p-2 hover:bg-neutral-800 rounded border border-transparent hover:border-[#242424] text-neutral-400 hover:text-white transition-all shrink-0"
              title="Return to Dashboard"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-tight truncate max-w-xs">{activeTrip.name}</h2>
              <span className="text-[10px] text-neutral-400 font-bold flex items-center gap-1 mt-0.5">
                Invite Code: <span className="text-brandOrange font-black select-all tracking-wider">{activeTrip.inviteCode}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isLeader && (
              <button
                onClick={endTrip}
                className="px-3.5 py-1.5 bg-brandCrimson/10 hover:bg-brandCrimson/20 border border-brandCrimson/20 text-brandCrimson font-bold text-xs tracking-wider rounded transition-all flex items-center gap-1.5"
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
              {/* Tab Selector Headers - Strava Flat style */}
              <div className="flex bg-darkCard p-1 rounded border border-[#242424] select-none shrink-0">
                <button
                  onClick={() => setActiveSideTab('chat')}
                  className={`grow py-2 px-2 rounded text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    activeSideTab === 'chat' ? 'bg-[#1c1c1e] text-brandOrange font-black border border-[#2c2c2e]' : 'text-neutral-500 hover:text-neutral-300 font-bold'
                  }`}
                >
                  <MessageSquare size={12} />
                  Chat
                </button>
                <button
                  onClick={() => setActiveSideTab('checkpoints')}
                  className={`grow py-2 px-2 rounded text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    activeSideTab === 'checkpoints' ? 'bg-[#1c1c1e] text-brandOrange font-black border border-[#2c2c2e]' : 'text-neutral-500 hover:text-neutral-300 font-bold'
                  }`}
                >
                  <Compass size={12} />
                  Milestones
                </button>
                <button
                  onClick={() => setActiveSideTab('sos')}
                  className={`grow py-2 px-2 rounded text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    activeSideTab === 'sos' ? 'bg-[#1c1c1e] text-brandOrange font-black border border-[#2c2c2e]' : 'text-neutral-500 hover:text-neutral-300 font-bold'
                  }`}
                >
                  <ShieldAlert size={12} />
                  Safety
                </button>
                {isLeader && (
                  <button
                    onClick={() => setActiveSideTab('admin')}
                    className={`grow py-2 px-2 rounded text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      activeSideTab === 'admin' ? 'bg-[#1c1c1e] text-brandOrange font-black border border-[#2c2c2e]' : 'text-neutral-500 hover:text-neutral-300 font-bold'
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
                  <div className="glass-panel p-5 rounded border border-[#242424] flex flex-col h-[520px] overflow-y-auto space-y-6">
                    <div>
                      <h3 className="text-white font-extrabold text-xs uppercase tracking-wider">Group Administration</h3>
                      <p className="text-neutral-400 text-[10px] mt-0.5 font-medium">Leader permission commands console</p>
                    </div>

                    {/* Participant kicker */}
                    <div className="space-y-3">
                      <h4 className="text-neutral-300 text-xs font-bold flex items-center gap-1.5"><Users size={14} className="text-brandOrange" /> Riders List</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {activeTrip.participants.map((p) => {
                          const rider = p.user;
                          const isParticipantMe = rider._id === user?.id;

                          return (
                            <div
                              key={rider._id}
                              className="p-2.5 rounded border border-[#242424] bg-[#1c1c1e] flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-brandOrange flex items-center justify-center font-bold text-white uppercase text-[9px]">
                                  {rider.username.substring(0, 2)}
                                </div>
                                <div>
                                  <span className="text-white font-bold block">{rider.username}</span>
                                  <span className="text-[8px] text-neutral-500 block uppercase font-black">{p.role}</span>
                                </div>
                              </div>

                              {!isParticipantMe && (
                                <button
                                  onClick={() => removeParticipant(rider._id, rider.username)}
                                  className="p-2 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-neutral-400 hover:text-brandCrimson rounded transition-all"
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
                    <div className="space-y-3 border-t border-[#242424] pt-4">
                      <h4 className="text-neutral-300 text-xs font-bold flex items-center gap-1.5"><Radio size={14} className="text-brandOrange shrink-0" /> Broadcast Alarm</h4>
                      <p className="text-neutral-400 text-[9px] leading-relaxed font-medium">
                        Emit a group-wide broadcast that immediately interrupts screens and triggers notification toasts.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          id="broadcast-announcement-input"
                          placeholder="e.g. Group pull over in 2 miles..."
                          className="grow px-3 py-2 rounded glass-input text-[11px]"
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
                          className="px-3 py-2 bg-brandOrange hover:bg-[#e25700] text-white font-extrabold text-[10px] rounded tracking-wider uppercase transition-all shadow-md"
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
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full font-sans">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-3.5 rounded border shadow-xl flex items-center gap-3 text-xs font-bold text-white ${
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

export default TripRoomPage;
