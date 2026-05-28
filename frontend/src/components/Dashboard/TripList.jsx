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
      <div className="flex flex-col items-center justify-center py-20 text-neutral-500 gap-3 font-sans">
        <Loader2 className="animate-spin text-brandOrange" size={24} />
        <span className="text-xs font-semibold tracking-wider uppercase">Syncing live rides directory...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
            🧭 Active Road Trips
          </h2>
          <p className="text-neutral-400 text-xs mt-0.5 font-medium">Select a live trip to monitor coordinates or insert an invite code above.</p>
        </div>
        <button
          onClick={fetchTrips}
          className="text-xs text-brandOrange hover:text-[#e25700] font-black transition-all px-3 py-1.5 rounded border border-brandOrange/10 hover:bg-brandOrange/5 uppercase tracking-wider"
        >
          Force Refresh
        </button>
      </div>

      {trips.length === 0 ? (
        <div className="glass-panel p-8 rounded border border-[#242424] text-center space-y-4 bg-darkCard">
          <Sparkles className="mx-auto text-brandOrange" size={32} />
          <div>
            <h3 className="text-white font-black text-sm uppercase">No Active Rides Found</h3>
            <p className="text-neutral-400 text-xs mt-1 font-medium">Create a new trip to recruit participants or check with your group leader for an invite code.</p>
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
                className={`glass-panel p-5 rounded relative overflow-hidden transition-all duration-200 border bg-darkCard ${
                  isCurrentlyActiveRoom
                    ? 'border-brandOrange shadow-md shadow-brandOrange/5'
                    : 'border-[#242424] hover:border-neutral-700'
                }`}
              >
                {/* Header Tag */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5">
                    {trip.status === 'active' ? (
                      <span className="text-[9px] bg-brandOrange/15 text-brandOrange font-black px-2 py-0.5 rounded uppercase tracking-wider border border-brandOrange/25 flex items-center gap-1 animate-pulse-orange">
                        <span className="w-1.5 h-1.5 rounded-full bg-brandOrange"></span> Live Now
                      </span>
                    ) : (
                      <span className="text-[9px] bg-neutral-800 text-neutral-400 font-black px-2 py-0.5 rounded uppercase tracking-wider border border-neutral-700">
                        Planned
                      </span>
                    )}
                    {isCreator && (
                      <span className="text-[9px] bg-neutral-800 text-white font-black px-2 py-0.5 rounded uppercase tracking-wider border border-neutral-700">
                        Leader
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-neutral-400 font-black bg-[#1c1c1e] px-2 py-0.5 rounded border border-[#2c2c2e] uppercase tracking-wider">
                    KEY: {trip.inviteCode}
                  </div>
                </div>

                {/* Body Details */}
                <div className="space-y-3">
                  <div>
                    <h3 className="font-black text-white text-base truncate uppercase tracking-tight">{trip.name}</h3>
                    <p className="text-neutral-400 text-xs line-clamp-2 mt-1 min-h-[32px] font-medium">{trip.description || 'No description provided.'}</p>
                  </div>

                  <div className="border-t border-[#242424] pt-3 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-neutral-400 font-semibold uppercase text-[10px]">
                      <MapPin size={12} className="text-brandOrange shrink-0" />
                      <span className="truncate">
                        {trip.route?.startPoint || 'Start'} <ArrowRight size={10} className="inline mx-1" /> {trip.route?.endPoint || 'Destination'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-400 font-semibold uppercase text-[10px]">
                      <Users size={12} className="text-neutral-500 shrink-0" />
                      <span>{trip.participants?.length || 1} Riders Signed Up</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-400 font-semibold uppercase text-[10px]">
                      <Calendar size={12} className="text-neutral-500 shrink-0" />
                      <span>{new Date(trip.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-5">
                  <button
                    onClick={() => handleOpenRoom(trip._id)}
                    disabled={joiningId !== null}
                    className={`w-full py-2 px-4 rounded text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      isCurrentlyActiveRoom
                        ? 'bg-brandOrange/10 hover:bg-brandOrange/20 text-brandOrange border border-brandOrange/25'
                        : isJoined
                        ? 'bg-neutral-800 hover:bg-neutral-700 text-white border border-[#242424]'
                        : 'bg-brandOrange hover:bg-[#e25700] text-white shadow-md'
                    }`}
                  >
                    {joiningId === trip._id ? (
                      <>
                        <Loader2 className="animate-spin" size={12} />
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
