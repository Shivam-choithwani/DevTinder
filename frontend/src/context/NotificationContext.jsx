import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { X, Flame, MessageSquare, Coffee, Bell } from 'lucide-react';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [toasts, setToasts] = useState([]);
  const hasTriggeredCheckinRef = useRef(false);

  // Ask for native notification permissions
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Web Audio API Sound Synthesizer
  const playChime = (type) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      if (type === 'match') {
        // High-quality rising chord for matches
        osc.type = 'triangle';
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
        
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc.start();
        osc.stop(now + 0.75);
      } else if (type === 'message') {
        // Dual bright pings for chat messages
        osc.type = 'sine';
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.setValueAtTime(1174.66, now + 0.08); // D6
        
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.setValueAtTime(0.08, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start();
        osc.stop(now + 0.4);
      } else {
        // Subtle bell ping for other alerts (like check-in)
        osc.type = 'sine';
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(659.25, now); // E5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start();
        osc.stop(now + 0.3);
      }
    } catch (err) {
      console.warn('Synthesizer audio blocked by browser context:', err);
    }
  };

  // Trigger Native Browser Notification
  const triggerNativeNotification = (title, body, photoUrl) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: photoUrl || '/favicon.ico',
        });
      } catch (err) {
        console.warn('Native notification failed to render:', err);
      }
    }
  };

  // Show dynamic notification toast
  const showNotification = ({ type = 'info', title, message, photoUrl = null, actionText = null, onActionClick = null, duration = 6000 }) => {
    const id = Math.random().toString(36).substring(2, 9);
    
    // Play chime sound
    playChime(type);

    // Fire native banner if window/document is out of focus
    if (document.hidden) {
      triggerNativeNotification(title, message, photoUrl);
    }

    // Add toast to stack
    setToasts((prev) => [...prev, { id, type, title, message, photoUrl, actionText, onActionClick }]);

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        dismissNotification(id);
      }, duration);
    }
  };

  const dismissNotification = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check and run daily check-in prompt on login
  useEffect(() => {
    if (!user || hasTriggeredCheckinRef.current) return;
    
    const checkDailyCheckin = () => {
      const today = new Date().toISOString().split('T')[0];
      const key = `dt_last_checkin_${user.id}`;
      const lastCheckin = localStorage.getItem(key);

      if (lastCheckin !== today) {
        // Trigger check-in toast
        setTimeout(() => {
          showNotification({
            type: 'checkin',
            title: 'Daily Check-in ☕️',
            message: 'Check in today to find new developer matches and explore fresh code stacks!',
            actionText: 'Check In Now',
            onActionClick: () => {
              localStorage.setItem(key, today);
              showNotification({
                type: 'info',
                title: 'Check-in Completed!',
                message: 'Daily check-in successful. Happy matching!',
                duration: 3000
              });
              // Redirect to feed if not already there
              if (window.location.pathname !== '/') {
                window.location.href = '/';
              }
            },
            duration: 12000
          });
        }, 2000);
        hasTriggeredCheckinRef.current = true;
      }
    };

    checkDailyCheckin();
  }, [user]);

  return (
    <NotificationContext.Provider value={{ showNotification, dismissNotification, playChime }}>
      {children}
      
      {/* Toast Overlay Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl glass-panel border shadow-2xl transition-all duration-300 animate-slide-in-right ${
              toast.type === 'match'
                ? 'border-violet-500/40 bg-slate-950/90 shadow-violet-500/10'
                : toast.type === 'message'
                ? 'border-blue-500/40 bg-slate-950/90 shadow-blue-500/10'
                : toast.type === 'checkin'
                ? 'border-amber-500/40 bg-slate-950/90 shadow-amber-500/10'
                : 'border-slate-800/80 bg-slate-950/90 shadow-slate-900/40'
            }`}
          >
            {/* Left side avatar / icon */}
            <div className="shrink-0">
              {toast.photoUrl ? (
                <img
                  src={toast.photoUrl}
                  alt={toast.title}
                  className={`w-11 h-11 rounded-full object-cover border-2 ${
                    toast.type === 'match'
                      ? 'border-violet-500'
                      : toast.type === 'message'
                      ? 'border-blue-500'
                      : 'border-slate-700'
                  }`}
                />
              ) : (
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                    toast.type === 'match'
                      ? 'bg-violet-600/10 border-violet-500/20 text-violet-400'
                      : toast.type === 'message'
                      ? 'bg-blue-600/10 border-blue-500/20 text-blue-400'
                      : toast.type === 'checkin'
                      ? 'bg-amber-600/10 border-amber-500/20 text-amber-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {toast.type === 'match' ? (
                    <Flame className="w-5 h-5 fill-violet-500/20" />
                  ) : toast.type === 'message' ? (
                    <MessageSquare className="w-5 h-5" />
                  ) : toast.type === 'checkin' ? (
                    <Coffee className="w-5 h-5" />
                  ) : (
                    <Bell className="w-5 h-5" />
                  )}
                </div>
              )}
            </div>

            {/* Middle body info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-white tracking-tight">{toast.title}</h4>
              <p className="text-slate-400 text-xs mt-0.5 leading-relaxed break-words">{toast.message}</p>
              
              {/* Optional clickable action button */}
              {toast.actionText && (
                <button
                  onClick={() => {
                    if (toast.onActionClick) toast.onActionClick();
                    dismissNotification(toast.id);
                  }}
                  className={`mt-2.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold tracking-wide uppercase transition-all duration-200 active:scale-95 cursor-pointer ${
                    toast.type === 'match'
                      ? 'bg-violet-600 hover:bg-violet-500 text-white'
                      : toast.type === 'message'
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : toast.type === 'checkin'
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  {toast.actionText}
                </button>
              )}
            </div>

            {/* Right side dismiss button */}
            <button
              onClick={() => dismissNotification(toast.id)}
              className="shrink-0 p-1 text-slate-500 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
