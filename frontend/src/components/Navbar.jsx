import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requestService, connectionService } from '../services/api';
import { Flame, Sparkles, Users, UserCheck, User, LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [requestCount, setRequestCount] = useState(0);

  // Poll or fetch request count periodically to update badges
  const fetchCounts = async () => {
    if (user?.id) {
      try {
        const requests = await requestService.getRequests(user.id);
        setRequestCount(requests.length);
      } catch (err) {
        console.error('Error fetching request count', err);
      }
    }
  };

  useEffect(() => {
    fetchCounts();
    // Refresh count on location changes (e.g. user swiped or visited pages)
    const interval = setInterval(fetchCounts, 5000);
    return () => clearInterval(interval);
  }, [location.pathname, user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const linkClass = (path) => `
    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
    ${isActive(path) 
      ? 'bg-gradient-to-r from-violet-600/20 to-blue-600/20 text-violet-400 border border-violet-500/30' 
      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'}
  `;

  const mobileLinkClass = (path) => `
    flex flex-col items-center justify-center w-full py-2 text-xs transition-all duration-300
    ${isActive(path) ? 'text-violet-400 font-semibold' : 'text-slate-500 hover:text-slate-300'}
  `;

  if (!user) return null;

  return (
    <>
      {/* Desktop Top Navbar (hidden on mobile) */}
      <header className="hidden md:block sticky top-0 z-50 w-full glass-panel border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="relative">
                <Flame className="w-8 h-8 text-violet-500 fill-violet-500 group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-violet-500/30 blur-md rounded-full -z-10 group-hover:bg-blue-500/40 transition-all"></div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent tracking-wide">
                DevTinder
              </span>
            </Link>

            {/* Nav Links */}
            <nav className="flex items-center gap-2">
              <Link to="/" className={linkClass('/')}>
                <Sparkles className="w-4 h-4" />
                <span>Feed</span>
              </Link>
              
              <Link to="/connections" className={linkClass('/connections')}>
                <Users className="w-4 h-4" />
                <span>Connections</span>
              </Link>

              <Link to="/requests" className={linkClass('/requests')}>
                <div className="relative">
                  <UserCheck className="w-4 h-4" />
                  {requestCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold animate-pulse">
                      {requestCount}
                    </span>
                  )}
                </div>
                <span>Requests</span>
              </Link>
            </nav>

            {/* Profile & Logout */}
            <div className="flex items-center gap-4">
              <Link 
                to="/profile" 
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all ${
                  isActive('/profile') 
                    ? 'border-violet-500 bg-violet-500/10 text-violet-400' 
                    : 'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700'
                }`}
              >
                <img 
                  src={profile?.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100&h=100'} 
                  alt="Profile" 
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-violet-500/30"
                />
                <span className="text-sm font-semibold max-w-[120px] truncate">
                  {profile?.fullName || user.username}
                </span>
              </Link>

              <button 
                onClick={handleLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-300 cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-50 w-full glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="w-7 h-7 text-violet-500 fill-violet-500" />
          <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            DevTinder
          </span>
        </div>
        <button 
          onClick={handleLogout}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile Bottom Tab Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-lg flex items-center justify-around h-16 pb-safe">
        <Link to="/" className={mobileLinkClass('/')}>
          <Sparkles className="w-5 h-5 mb-0.5" />
          <span>Feed</span>
        </Link>
        
        <Link to="/connections" className={mobileLinkClass('/connections')}>
          <Users className="w-5 h-5 mb-0.5" />
          <span>Matches</span>
        </Link>

        <Link to="/requests" className={mobileLinkClass('/requests')}>
          <div className="relative">
            <UserCheck className="w-5 h-5 mb-0.5" />
            {requestCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-gradient-to-r from-violet-600 to-blue-600 text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                {requestCount}
              </span>
            )}
          </div>
          <span>Requests</span>
        </Link>

        <Link to="/profile" className={mobileLinkClass('/profile')}>
          <User className="w-5 h-5 mb-0.5" />
          <span>Profile</span>
        </Link>
      </nav>
    </>
  );
}
