import React, { useEffect, useState } from 'react';
import { useActiveTrip } from '../../context/ActiveTripContext';
import { useAuth } from '../../context/AuthContext';
import { Compass, Users, MapPin, Key, Calendar, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import api from '../../utils/api';

const TripList = ({ onActiveTripSelected }) => {
  const { user } = useAuth();
  const { joinTrip, activeTrip } = useActiveTrip();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);

  // Fetch all active/public trips from API
  const fetchTrips = async () => {
    try {
      const res = await api.get('/trips');
      setTrips(res.data);
    } catch (err) {
      console.error('Error fetching trips list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
    // Poll for new trips list every 15s to keep dashboard reactive
    const interval = setInterval(fetchTrips, 15000);
    return () => clearInterval(interval);
  }, [activeTrip]);

  const handleOpenRoom = async (tripId) => {
    setJoiningId(tripId);
    const success = await joinTrip(tripId);
    setJoiningId(null);
    if (success) {
      onActiveTripSelected();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
        <Loader2 className="animate-spin text-brandCyan" size={32} />
        <span className="text-sm font-semibold tracking-wide">Syncing local trip directories...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Compass size={22} className="text-brandCyan animate-spin" style={{ animationDuration: '6s' }} /> Active Road Trips
          </h2>
          <p className="text-gray-400 text-xs mt-0.5">Select a live trip to monitor coordinates or insert an invite code above.</p>
        </div>
        <button
          onClick={fetchTrips}
          className="text-xs text-brandCyan hover:text-cyan-400 font-bold transition-all px-3 py-1.5 rounded-lg border border-cyan-500/10 hover:bg-cyan-500/5"
        >
          Force Refresh
        </button>
      </div>

      {trips.length === 0 ? (
        <div className="glass-panel p-10 rounded-2xl text-center space-y-4 border border-white/5">
          <Sparkles className="mx-auto text-violet-400" size={36} />
          <div>
            <h3 className="text-white font-bold">No Active Rides Found</h3>
            <p className="text-gray-400 text-xs mt-1">Create a new trip to recruit participants or check with your group leader for an invite code.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => {
            const isJoined = trip.participants.some((p) => p.user._id === user?.id);
            const isCreator = trip.creator._id === user?.id;
            const isCurrentlyActiveRoom = activeTrip?._id === trip._id;

            return (
              <div
                key={trip._id}
                className={`glass-panel p-5 rounded-2xl relative overflow-hidden transition-all duration-300 hover:translate-y-[-4px] border ${
                  isCurrentlyActiveRoom
                    ? 'border-brandCyan shadow-cyan-500/5'
                    : 'border-white/5 hover:border-white/10'
                }`}
              >
                {/* Visual glow indicator for live rooms */}
                {trip.status === 'active' && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none"></div>
                )}

                {/* Header Tag */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5">
                    {trip.status === 'active' ? (
                      <span className="text-[9px] bg-cyan-500/15 text-brandCyan font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-cyan-500/20 flex items-center gap-1 animate-pulse-cyan">
                        <span className="w-1.5 h-1.5 rounded-full bg-brandCyan"></span> Live Now
                      </span>
                    ) : (
                      <span className="text-[9px] bg-amber-500/15 text-amber-400 font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-500/20">
                        Planned
                      </span>
                    )}
                    {isCreator && (
                      <span className="text-[9px] bg-violet-500/15 text-brandPurple font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-violet-500/20">
                        Leader
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase">
                    <Key size={10} className="text-gray-500 shrink-0" />
                    {trip.inviteCode}
                  </div>
                </div>

                {/* Body Details */}
                <div className="space-y-3">
                  <div>
                    <h3 className="font-extrabold text-white text-base truncate">{trip.name}</h3>
                    <p className="text-gray-400 text-xs line-clamp-2 mt-1 min-h-[32px]">{trip.description || 'No description provided.'}</p>
                  </div>

                  <div className="border-t border-white/5 pt-3 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-gray-400">
                      <MapPin size={14} className="text-brandCyan shrink-0" />
                      <span className="truncate">
                        {trip.route?.startPoint || 'Unknown start'} <ArrowRight size={10} className="inline mx-1" /> {trip.route?.endPoint || 'Destination'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Users size={14} className="text-brandPurple shrink-0" />
                      <span>{trip.participants?.length || 1} Riders Signed Up</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar size={14} className="text-gray-500 shrink-0" />
                      <span>{new Date(trip.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-5">
                  <button
                    onClick={() => handleOpenRoom(trip._id)}
                    disabled={joiningId !== null}
                    className={`w-full py-2 px-4 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center justify-center gap-2 ${
                      isCurrentlyActiveRoom
                        ? 'bg-brandCyan/10 hover:bg-brandCyan/20 text-brandCyan border border-brandCyan/20'
                        : isJoined
                        ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                        : 'bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white shadow-lg shadow-cyan-500/10'
                    }`}
                  >
                    {joiningId === trip._id ? (
                      <>
                        <Loader2 className="animate-spin" size={14} />
                        Syncing Room...
                      </>
                    ) : isCurrentlyActiveRoom ? (
                      'Resume Live Session'
                    ) : isJoined ? (
                      'Enter Room'
                    ) : (
                      'Join & Launch'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TripList;
