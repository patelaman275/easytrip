import React from 'react';
import { useActiveTrip } from '../../context/ActiveTripContext';
import { CheckCircle2, Clock, Compass } from 'lucide-react';
import { calculateDistance, calculateETA } from '../../utils/geoUtils';

const CheckpointPanel = () => {
  const { activeTrip, checkpointsProgress, ridersLocations } = useActiveTrip();

  if (!activeTrip) return null;

  return (
    <div className="glass-panel p-5 rounded border border-[#242424] shadow-2xl overflow-hidden flex flex-col h-[520px] select-none font-sans bg-darkCard">
      <div>
        <h3 className="text-white font-black text-xs uppercase tracking-wider">Checkpoint Progress</h3>
        <p className="text-neutral-400 text-[10px] mt-0.5 mb-4 font-medium">Real-time rider progression monitor</p>
      </div>

      <div className="grow overflow-y-auto pr-1 space-y-3">
        {activeTrip.checkpoints?.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-neutral-600 gap-2 font-sans">
            <Compass size={20} className="text-neutral-700" />
            <span className="text-[10px] font-bold uppercase tracking-wider">No checkpoints configured</span>
          </div>
        ) : (
          activeTrip.checkpoints.map((cp, cpIdx) => {
            return (
              <div
                key={cp._id || cpIdx}
                className="p-3 rounded border border-[#242424] bg-darkBg/20 flex flex-col gap-3 font-sans"
              >
                {/* Checkpoint details */}
                <div className="flex items-center justify-between border-b border-[#242424] pb-2">
                  <span className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-tight">
                    <span className="w-5 h-5 rounded bg-brandOrange/15 text-brandOrange border border-brandOrange/20 flex items-center justify-center text-[10px] font-black">
                      {cp.order}
                    </span>
                    {cp.name}
                  </span>
                </div>

                {/* Riders status for this checkpoint */}
                <div className="grid grid-cols-1 gap-2">
                  {activeTrip.participants.map((p) => {
                    const rider = p.user;
                    const riderLoc = ridersLocations.find((loc) => loc.userId === rider._id);

                    const progress = checkpointsProgress.find(
                      (prog) =>
                        prog.user?._id === rider._id ||
                        prog.user?.username === rider.username
                    );

                    const isReached = progress?.status === 'reached';

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
                      etaText = 'Done';
                    }

                    return (
                      <div
                        key={rider._id}
                        className="flex items-center justify-between text-[11px] py-0.5"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-brandOrange flex items-center justify-center font-black text-white uppercase text-[8px]">
                            {rider.username.substring(0, 2)}
                          </div>
                          <span className="text-neutral-300 font-bold uppercase tracking-tight text-[10px]">{rider.username}</span>
                        </div>

                        <div className="flex items-center gap-3 font-bold uppercase text-[9px] tracking-wider">
                          {!isReached && (
                            <span className="text-brandOrange bg-brandOrange/10 border border-brandOrange/20 px-1.5 py-0.5 rounded">
                              ETA: {etaText}
                            </span>
                          )}

                          {isReached ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
                              Reached
                            </span>
                          ) : (
                            <span className="text-neutral-500 flex items-center gap-1">
                              <Clock size={10} className="text-neutral-500 shrink-0" />
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
