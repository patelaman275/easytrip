import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, User, Mail, Lock, Bike, FileText, Compass, Loader2 } from 'lucide-react';

const Signup = ({ toggleAuthMode }) => {
  const { signup, error, setError } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bikeModel, setBikeModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Beginner');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError('Username, email, and password are required.');
      return;
    }

    setIsSubmitting(true);
    const success = await signup(username, email, password, bikeModel, licensePlate, experienceLevel);
    setIsSubmitting(false);
  };

  return (
    <div className="w-full max-w-lg p-8 rounded-2xl glass-panel relative overflow-hidden fade-in shadow-2xl border border-white/10">
      {/* Decorative background glows */}
      <div className="absolute top-[-50px] left-[-50px] w-36 h-36 bg-violet-600/20 rounded-full blur-2xl"></div>
      <div className="absolute bottom-[-50px] right-[-50px] w-36 h-36 bg-cyan-500/20 rounded-full blur-2xl"></div>

      <div className="flex flex-col items-center mb-6 relative z-10">
        <div className="p-3 bg-violet-500/10 rounded-2xl border border-violet-500/20 text-brandPurple mb-2">
          <Compass size={32} />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Join EasyTrip</h2>
        <p className="text-gray-400 text-xs mt-1">Create your rider account to hit the road together</p>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs fade-in text-center font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-300 text-[10px] font-semibold uppercase tracking-wider mb-1">Username *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <User size={16} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs"
                placeholder="rider_pro"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-[10px] font-semibold uppercase tracking-wider mb-1">Email *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <Mail size={16} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs"
                placeholder="rider@example.com"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-gray-300 text-[10px] font-semibold uppercase tracking-wider mb-1">Password *</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
              <Lock size={16} />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs"
              placeholder="••••••••••••"
              required
            />
          </div>
        </div>

        <div className="border-t border-white/5 pt-4 my-2">
          <h3 className="text-gray-400 text-xs font-bold mb-3 flex items-center gap-1.5"><Bike size={16} className="text-brandCyan" /> Rider Profile (Optional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-[10px] font-semibold uppercase tracking-wider mb-1">Bike/Vehicle Model</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Bike size={16} />
                </div>
                <input
                  type="text"
                  value={bikeModel}
                  onChange={(e) => setBikeModel(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs"
                  placeholder="e.g. BMW R 1250 GS"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-[10px] font-semibold uppercase tracking-wider mb-1">License Plate</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <FileText size={16} />
                </div>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs"
                  placeholder="e.g. CA 98765"
                />
              </div>
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-gray-300 text-[10px] font-semibold uppercase tracking-wider mb-1">Riding Experience Level</label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs"
            >
              <option value="Beginner" className="bg-darkBg text-white">Beginner</option>
              <option value="Intermediate" className="bg-darkBg text-white">Intermediate</option>
              <option value="Expert" className="bg-darkBg text-white">Expert</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 mt-4 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold text-xs tracking-wide transition-all shadow-lg hover:shadow-violet-600/20 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Registering Account...
            </>
          ) : (
            'Complete Registration'
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-xs relative z-10">
        <span className="text-gray-400">Already have an account? </span>
        <button
          onClick={toggleAuthMode}
          className="text-brandCyan hover:text-cyan-400 font-semibold underline decoration-2 transition-all"
        >
          Sign In
        </button>
      </div>
    </div>
  );
};

export default Signup;
