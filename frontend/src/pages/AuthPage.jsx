import React, { useState } from 'react';
import Login from '../components/Auth/Login';
import Signup from '../components/Auth/Signup';
import { Compass } from 'lucide-react';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  const toggleAuthMode = () => {
    setIsLogin((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Grid and Blobs */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      <div className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[40rem] h-[40rem] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Brand Header */}
      <div className="mb-8 flex items-center gap-3 relative z-10 select-none">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/10 text-white font-extrabold text-xl">
          E
        </div>
        <span className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400">
          EASY<span className="text-brandCyan">TRIP</span>
        </span>
      </div>

      {/* Main Card Grid */}
      <div className="w-full flex justify-center items-center z-10">
        {isLogin ? (
          <Login toggleAuthMode={toggleAuthMode} />
        ) : (
          <Signup toggleAuthMode={toggleAuthMode} />
        )}
      </div>

      {/* Floating Footer details */}
      <div className="mt-8 text-center text-xs text-gray-500 relative z-10 pointer-events-none">
        EasyTrip Coordination Engine &copy; 2026. Made with Google DeepMind Antigravity.
      </div>
    </div>
  );
};

export default AuthPage;
