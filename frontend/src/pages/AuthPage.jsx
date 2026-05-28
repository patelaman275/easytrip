import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Compass, Bike, Award, User, Loader2 } from 'lucide-react';

const AuthPage = () => {
  const { enterAsGuest, error, setError } = useAuth();
  const [username, setUsername] = useState('');
  const [bikeModel, setBikeModel] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Beginner');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Rider Nickname is required to join the map.');
      return;
    }

    setIsSubmitting(true);
    enterAsGuest(username.trim(), bikeModel.trim(), experienceLevel);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-darkBg flex flex-col items-center justify-center p-4 relative font-sans">
      {/* Brand Header - Strava Style */}
      <div className="mb-6 flex items-center gap-2 relative z-10 select-none">
        <div className="w-8 h-8 rounded bg-brandOrange flex items-center justify-center text-white font-black text-lg shadow-md">
          🧭
        </div>
        <span className="text-xl font-black tracking-tighter text-white">
          EASY<span className="text-brandOrange">TRIP</span>
        </span>
      </div>

      {/* Frictionless Entry Form Card - Black-and-White sharp grid */}
      <div className="w-full max-w-sm p-6 rounded-lg glass-panel shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-6 relative z-10">
          <h2 className="text-lg font-black text-white uppercase tracking-tight">Rider Account</h2>
          <p className="text-neutral-400 text-xs mt-1 text-center font-medium">
            Enter nickname to access dynamic GPS map telemetry
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-neutral-300 text-[10px] font-bold uppercase tracking-wider mb-1.5">
              Rider Nickname *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <User size={14} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 rounded glass-input text-xs"
                placeholder="Enter nickname (e.g. Aman)"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-neutral-300 text-[10px] font-bold uppercase tracking-wider mb-1.5">
              Vehicle Model (Optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <Bike size={14} />
              </div>
              <input
                type="text"
                value={bikeModel}
                onChange={(e) => setBikeModel(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 rounded glass-input text-xs"
                placeholder="e.g. Yamaha Ray ZR"
              />
            </div>
          </div>

          <div>
            <label className="block text-neutral-300 text-[10px] font-bold uppercase tracking-wider mb-1.5">
              Proficiency Level
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <Award size={14} />
              </div>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 rounded glass-input text-xs appearance-none font-medium"
              >
                <option value="Beginner" className="bg-darkBg text-white">Beginner Level</option>
                <option value="Intermediate" className="bg-darkBg text-white">Intermediate Level</option>
                <option value="Expert" className="bg-darkBg text-white">Expert Level</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !username.trim()}
            className="w-full py-2.5 px-4 mt-4 rounded bg-brandOrange hover:bg-[#e25700] text-white font-extrabold text-xs tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                Instantiating...
              </>
            ) : (
              'Hit The Road'
            )}
          </button>
        </form>
      </div>

      {/* Floating Footer details */}
      <div className="mt-8 text-center text-[10px] text-neutral-600 relative z-10 pointer-events-none">
        Strava Athletics style &bull; Apple San Francisco Typography stack &bull; 🧭
      </div>
    </div>
  );
};

export default AuthPage;
