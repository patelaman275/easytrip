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
    // Directly instantiate a guest session, bypassing complex database registrations!
    enterAsGuest(username.trim(), bikeModel.trim(), experienceLevel);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Grid and Blobs */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      <div className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[40rem] h-[40rem] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Brand Header */}
      <div className="mb-8 flex items-center gap-3 relative z-10 select-none">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/10 text-white font-extrabold text-xl animate-pulse-cyan">
          E
        </div>
        <span className="text-2xl font-black tracking-wider text-white">
          EASY<span className="text-brandCyan">TRIP</span>
        </span>
      </div>

      {/* Frictionless Entry Form Card */}
      <div className="w-full max-w-md p-8 rounded-2xl glass-panel relative overflow-hidden fade-in shadow-2xl border border-white/10 z-10">
        <div className="absolute top-[-50px] right-[-50px] w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-[-50px] left-[-50px] w-36 h-36 bg-violet-600/10 rounded-full blur-2xl"></div>

        <div className="flex flex-col items-center mb-6 relative z-10">
          <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 text-brandCyan mb-2">
            <Compass size={32} />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Rider Entrance</h2>
          <p className="text-gray-400 text-xs mt-1 text-center">
            Specify your nickname to instantly access maps and sync live telemetry
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs fade-in text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-gray-300 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
              Rider Nickname *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <User size={16} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-xs"
                placeholder="Enter nickname (e.g. Aman)"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
              Vehicle / Bike Model (Optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <Bike size={16} />
              </div>
              <input
                type="text"
                value={bikeModel}
                onChange={(e) => setBikeModel(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-xs"
                placeholder="e.g. Kawasaki Ninja 650"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
              Riding Experience Level
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <Award size={16} />
              </div>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-xs"
              >
                <option value="Beginner" className="bg-darkBg text-white">Beginner</option>
                <option value="Intermediate" className="bg-darkBg text-white">Intermediate</option>
                <option value="Expert" className="bg-darkBg text-white">Expert</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !username.trim()}
            className="w-full py-3 px-4 mt-6 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-extrabold text-xs tracking-wider uppercase transition-all shadow-lg hover:shadow-cyan-500/20 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Launching Radar...
              </>
            ) : (
              'Enter Platform'
            )}
          </button>
        </form>
      </div>

      {/* Floating Footer details */}
      <div className="mt-8 text-center text-xs text-gray-500 relative z-10 pointer-events-none">
        EasyTrip Coordination Engine &copy; 2026. Guest Session Enabled.
      </div>
    </div>
  );
};

export default AuthPage;
