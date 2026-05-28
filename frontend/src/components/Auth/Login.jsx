import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Mail, Lock, Loader2 } from 'lucide-react';

const Login = ({ toggleAuthMode }) => {
  const { login, error, setError } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailOrUsername || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    const success = await login(emailOrUsername, password);
    setIsSubmitting(false);
  };

  return (
    <div className="w-full max-w-md p-8 rounded-2xl glass-panel relative overflow-hidden fade-in shadow-2xl border border-white/10">
      {/* Decorative background glows */}
      <div className="absolute top-[-50px] right-[-50px] w-36 h-36 bg-cyan-500/20 rounded-full blur-2xl"></div>
      <div className="absolute bottom-[-50px] left-[-50px] w-36 h-36 bg-violet-600/20 rounded-full blur-2xl"></div>

      <div className="flex flex-col items-center mb-8 relative z-10">
        <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 text-brandCyan mb-3 animate-pulse-cyan">
          <Shield size={36} />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Welcome Back</h2>
        <p className="text-gray-400 text-sm mt-1">Sign in to coordinate your next trip</p>
      </div>

      {error && (
        <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm fade-in text-center font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
        <div>
          <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">Username or Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
              <Mail size={18} />
            </div>
            <input
              type="text"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm"
              placeholder="rider123 or email@example.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
              <Lock size={18} />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm"
              placeholder="••••••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold text-sm tracking-wide transition-all shadow-lg hover:shadow-cyan-500/20 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Authenticating...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <div className="mt-8 text-center text-sm relative z-10">
        <span className="text-gray-400">New to EasyTrip? </span>
        <button
          onClick={toggleAuthMode}
          className="text-brandCyan hover:text-cyan-400 font-semibold underline decoration-2 transition-all"
        >
          Create an Account
        </button>
      </div>
    </div>
  );
};

export default Login;
