import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useActiveTrip } from '../../context/ActiveTripContext';
import { LayoutDashboard, Compass, LogOut, Bike, User } from 'lucide-react';

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
    <aside className="w-60 bg-[#0d0d0d] border-r border-[#242424] flex flex-col justify-between h-screen sticky top-0 shrink-0">
      {/* Brand Header */}
      <div>
        <div className="p-6 border-b border-[#242424] flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-brandOrange flex items-center justify-center text-white font-black text-base shadow-sm">
            🧭
          </div>
          <span className="text-lg font-black tracking-tighter text-white">
            EASY<span className="text-brandOrange">TRIP</span>
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
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded text-xs font-black uppercase tracking-wider transition-all ${
                  isActive
                    ? 'bg-brandOrange/10 text-brandOrange border border-brandOrange/25'
                    : 'text-neutral-500 hover:text-white hover:bg-neutral-900 border border-transparent'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-brandOrange' : 'text-neutral-500'} />
                {item.name}
                {item.id === 'trip' && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-brandOrange animate-pulse-orange"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User profile details at the bottom */}
      <div className="p-4 border-t border-[#242424] space-y-4 bg-black/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-brandOrange flex items-center justify-center font-black text-white uppercase text-xs">
            {user.username.substring(0, 2)}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-black text-white truncate uppercase">{user.username}</h4>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[9px] bg-brandOrange/15 text-brandOrange font-black px-1.5 py-0.5 rounded border border-brandOrange/20 uppercase">
                {user.riderDetails?.experienceLevel || 'Beginner'}
              </span>
            </div>
          </div>
        </div>

        {user.riderDetails?.bikeModel && (
          <div className="bg-[#1c1c1e] p-2 rounded border border-[#2c2c2e] flex items-center gap-2 text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
            <Bike size={12} className="text-brandOrange shrink-0" />
            <span className="truncate">{user.riderDetails.bikeModel}</span>
          </div>
        )}

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-brandCrimson text-[10px] font-black uppercase tracking-wider transition-all"
        >
          <LogOut size={12} />
          Leave Session
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
