import React, { useState } from 'react';
import { useActiveTrip } from '../../context/ActiveTripContext';
import { useAuth } from '../../context/AuthContext';
import { Plus, Key, ChevronRight } from 'lucide-react';
import api from '../../utils/api';

import { MOCK_ROUTE_COORDINATES, MOCK_CHECKPOINTS } from '../../utils/geoUtils';

const Navbar = ({ onCreateTripClick }) => {
  const { user } = useAuth();
  const { activeTrip, joinTrip, joinLocalTrip } = useActiveTrip();
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinTrip = async (e) => {
    e.preventDefault();
    if (!inviteCode || isJoining) return;

    setIsJoining(true);
    try {
      // 2.5-second timeout to prevent database cold-start freezes!
      const res = await api.post('/trips/join', { inviteCode }, { timeout: 2500 });
      if (res.data.trip) {
        await joinTrip(res.data.trip._id);
        setInviteCode('');
      }
    } catch (err) {
      console.warn('Backend join failed or timed out, entering local fallback:', err.message);
      
      // Local fallback join constructs same mock coordinates path
      const mockTripId = 'local_trip_' + Math.random().toString(36).substring(2, 9);
      const mockJoinedTrip = {
        _id: mockTripId,
        name: 'Chai Break',
        description: 'SRM to Mahindra City Chennai GST road ride',
        inviteCode: inviteCode.toUpperCase(),
        creator: { username: 'Group Leader' },
        status: 'active',
        route: {
          startPoint: 'Kattankulathur, Chennai',
          endPoint: 'Mahindra World City Chennai',
          polyline: MOCK_ROUTE_COORDINATES,
        },
        checkpoints: MOCK_CHECKPOINTS,
        participants: [
          { user: { username: 'Group Leader' }, role: 'leader' },
          { user: user || { username: 'Guest Rider' }, role: 'rider' }
        ],
        visibility: 'public',
      };

      joinLocalTrip(mockJoinedTrip);
      setInviteCode('');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <header className="h-16 bg-darkCard border-b border-[#242424] flex items-center justify-between px-8 sticky top-0 z-30 select-none">
      {/* Search and Join bar */}
      <div className="flex items-center gap-6">
        <form onSubmit={handleJoinTrip} className="flex items-center gap-2">
          <div className="relative">
            <Key size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="RIDE CODE"
              className="pl-8 pr-3 py-1.5 w-32 rounded glass-input text-xs uppercase tracking-wider font-extrabold"
              maxLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={!inviteCode || isJoining}
            className="px-3 py-1.5 bg-[#1c1c1e] hover:bg-[#2c2c2e] disabled:opacity-40 text-white font-bold text-xs tracking-wider rounded border border-[#2c2c2e] transition-all flex items-center gap-1"
          >
            {isJoining ? 'Joining...' : 'Join'}
            <ChevronRight size={12} />
          </button>
        </form>
      </div>

      {/* Quick controls */}
      <div className="flex items-center gap-4">
        {activeTrip && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-brandOrange/10 border border-brandOrange/20 text-brandOrange text-xs font-black uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-brandOrange animate-pulse-orange"></span>
            Live: {activeTrip.name}
          </div>
        )}

        <button
          onClick={onCreateTripClick}
          className="flex items-center gap-1.5 px-4 py-2 bg-brandOrange hover:bg-[#e25700] text-white font-extrabold text-xs tracking-wider rounded uppercase transition-all shadow-md"
        >
          <Plus size={14} />
          Create Trip
        </button>
      </div>
    </header>
  );
};

export default Navbar;
