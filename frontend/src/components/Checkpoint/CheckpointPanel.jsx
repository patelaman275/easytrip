import React from 'react';
import { useActiveTrip } from '../../context/ActiveTripContext';
import { CheckCircle2, Clock, XCircle, Compass, HelpCircle } from 'lucide-react';
import { calculateDistance, calculateETA } from '../../utils/geoUtils';

const CheckpointPanel = () => {
  const { activeTrip, checkpointsProgress, ridersLocations } = useActiveTrip();

  if (!activeTrip) return null;

  return (
    <div className="glass-panel p-5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[520px] select-none">
      <div>
        <h3 className="text-white font-extrabold text-sm uppercase tracking-wider">Checkpoint Progress</h3>
        <p className="text-gray-400 text-[10px] mt-0.5 mb-4">Real-time rider progression monitor</p>
      </div>

      <div className="grow overflow-y-auto pr-1 space-y-4">
        {activeTrip.checkpoints?.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
            <Compass size={24} className="text-slate-600" />
            <span className="text-[11px] font-bold">No checkpoints configured for this ride.</span>
          </div>
        ) : (
          activeTrip.checkpoints.map((cp, cpIdx) => {
            return (
              <div
                key={cp._id || cpIdx}
                className="p-4 rounded-xl border border-white/5 bg-white/5 flex flex-col gap-3"
              >
                {/* Checkpoint details */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-brandCyan/20 text-brandCyan flex items-center justify-center text-[10px]">
                      {cp.order}
                    </span>
                    {cp.name}
                  </span>
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                    Mile marker
                  </span>
                </div>

                {/* Riders status for this checkpoint */}
                <div className="grid grid-cols-1 gap-2.5">
                  {activeTrip.participants.map((p) => {
                    const rider = p.user;
                    const riderLoc = ridersLocations.find((loc) => loc.userId === rider._id);

                    // Find if rider has checked in at this checkpoint
                    const progress = checkpointsProgress.find(
                      (prog) =>
                        prog.user?._id === rider._id ||
                        prog.user?.username === rider.username
                    );

                    const isReached = progress?.status === 'reached';

                    // Compute dynamic ETA to checkpoint if not reached yet
                    let etaText = 'N/A';
                    if (!isReached && riderLoc) {
                      const dist = calculateDistance(
                        riderLoc.lat,
                        riderLoc.lng,
                        cp.coords.lat,
                        cp.coords.lng
                      );
                      etaText = calculateETA(dist, riderLoc.speed);
                    } else if (isReached) {
                      etaText = 'Completed';
                    }

                    return (
                      <div
                        key={rider._id}
                        className="flex items-center justify-between text-xs py-1"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center font-bold text-white uppercase text-[9px]">
                            {rider.username.substring(0, 2)}
                          </div>
                          <span className="text-gray-300 font-medium">{rider.username}</span>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Dynamic ETA */}
                          {!isReached && (
                            <span className="text-[10px] text-brandCyan font-semibold bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/10">
                              ETA: {etaText}
                            </span>
                          )}

                          {/* Checkpoint Status Indicator */}
                          {isReached ? (
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                              Reached
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-500 font-bold flex items-center gap-1">
                              <Clock size={12} className="text-gray-500 shrink-0" />
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CheckpointPanel;
