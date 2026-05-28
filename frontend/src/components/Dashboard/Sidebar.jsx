import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useActiveTrip } from '../../context/ActiveTripContext';
import { LayoutDashboard, Compass, LogOut, ShieldAlert, Settings, Bike, Zap, User } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const { activeTrip } = useActiveTrip();

  if (!user) return null;

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    ...(activeTrip
      ? [
          { id: 'trip', name: 'Live Coordinates', icon: Compass },
        ]
      : []),
    { id: 'profile', name: 'Rider Details', icon: User },
  ];

  return (
    <aside className="w-64 bg-darkCard border-r border-white/5 flex flex-col justify-between h-screen sticky top-0 shrink-0">
      {/* Brand Header */}
      <div>
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center text-white font-extrabold select-none">
            E
          </div>
          <span className="text-lg font-black tracking-wider text-white">
            EASY<span className="text-brandCyan">TRIP</span>
          </span>
        </div>

        {/* Navigation list */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/10 to-violet-600/10 text-brandCyan border border-cyan-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-brandCyan' : 'text-gray-400'} />
                {item.name}
                {item.id === 'trip' && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-brandCyan animate-pulse-cyan"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User profile details at the bottom */}
      <div className="p-4 border-t border-white/5 space-y-4 bg-black/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center font-bold text-white uppercase select-none border border-white/10">
            {user.username.substring(0, 2)}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-bold text-white truncate">{user.username}</h4>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] bg-cyan-500/15 text-brandCyan font-semibold px-1.5 py-0.5 rounded border border-cyan-500/10">
                {user.riderDetails?.experienceLevel || 'Beginner'}
              </span>
            </div>
          </div>
        </div>

        {user.riderDetails?.bikeModel && (
          <div className="glass-panel-light p-2.5 rounded-lg flex items-center gap-2 text-xs text-gray-400">
            <Bike size={14} className="text-brandCyan shrink-0" />
            <span className="truncate">{user.riderDetails.bikeModel}</span>
          </div>
        )}

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold tracking-wide transition-all"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
