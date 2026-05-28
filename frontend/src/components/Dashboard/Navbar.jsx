import React, { useState } from 'react';
import { useActiveTrip } from '../../context/ActiveTripContext';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, Key, ChevronRight, Play } from 'lucide-react';
import api from '../../utils/api';

const Navbar = ({ onCreateTripClick }) => {
  const { user } = useAuth();
  const { activeTrip, joinTrip } = useActiveTrip();
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinTrip = async (e) => {
    e.preventDefault();
    if (!inviteCode || isJoining) return;

    setIsJoining(true);
    // API endpoint validation
    try {
      const res = await api.post('/trips/join', { inviteCode });
      if (res.data.trip) {
        await joinTrip(res.data.trip._id);
        setInviteCode('');
      }
    } catch (err) {
      console.error('API Join error:', err);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <header className="h-16 bg-darkCard border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-30 select-none">
      {/* Search and Join bar */}
      <div className="flex items-center gap-6">
        <form onSubmit={handleJoinTrip} className="flex items-center gap-2">
          <div className="relative">
            <Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter Ride Invite Code..."
              className="pl-9 pr-3 py-1.5 w-48 rounded-xl glass-input text-xs uppercase tracking-wider font-bold"
              maxLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={!inviteCode || isJoining}
            className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 disabled:from-slate-700 disabled:to-slate-800 disabled:opacity-40 text-white font-bold text-xs tracking-wider rounded-xl transition-all shadow-lg shadow-cyan-500/10 flex items-center gap-1"
          >
            {isJoining ? 'Joining...' : 'Join Ride'}
            <ChevronRight size={12} />
          </button>
        </form>
      </div>

      {/* Quick controls */}
      <div className="flex items-center gap-4">
        {activeTrip && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-brandCyan text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-brandCyan animate-pulse-cyan"></span>
            Live: {activeTrip.name}
          </div>
        )}

        <button
          onClick={onCreateTripClick}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-extrabold text-xs tracking-wider rounded-xl transition-all shadow-lg hover:shadow-violet-600/20"
        >
          <Plus size={16} />
          Create Trip
        </button>
      </div>
    </header>
  );
};

export default Navbar;
