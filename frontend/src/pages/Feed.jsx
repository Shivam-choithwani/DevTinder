import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { feedService, swipeService, profileService } from '../services/api';
import DevCard from '../components/DevCard';
import { X, Heart, RefreshCw, Flame, Sparkles, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Feed() {
  const { user, profile, updateProfile } = useAuth();
  const { showNotification } = useNotifications();
  
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Swiper animation states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(null); // 'left' or 'right'
  const [animating, setAnimating] = useState(false);

  // Match celebration state
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState(null);

  // Upgrade prompt state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  // Fetch candidate feed
  const loadFeed = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const feed = await feedService.getFeed(user.id);
      setCandidates(feed);
      setCurrentIndex(0);
    } catch (err) {
      console.error('Error loading feed', err);
      setError('Could not load developer feed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [user]);

  // Handle swipes (left/right)
  const handleSwipe = async (direction) => {
    if (animating || currentIndex >= candidates.length) return;
    
    setSwipeDirection(direction);
    setAnimating(true);
    
    const targetProfile = candidates[currentIndex];
    const isRightSwipe = direction === 'right';

    // Submit swipe to API in background
    try {
      const result = await swipeService.submitSwipe(user.id, targetProfile.userId, isRightSwipe);
      
      if (isRightSwipe && result.isMatch) {
        // We have a mutual match! Trigger celebration modal
        setMatchedProfile(targetProfile);
        setShowMatchModal(true);

        showNotification({
          type: 'match',
          title: "It's a Match! 🎉",
          message: `You and ${targetProfile.fullName} matched! Send them a message now.`,
          photoUrl: targetProfile.photoUrl,
          actionText: 'Chat Now',
          onActionClick: () => {
            window.location.href = '/connections';
          }
        });
      }
    } catch (err) {
      console.error('Swipe action failed', err);
      // Check if it's the daily limit error (429 status or limit message)
      if (err.message?.includes('limit') || err.message?.includes('Limit') || err.status === 429) {
        setShowUpgradeModal(true);
        setAnimating(false);
        setSwipeDirection(null);
        return; // Halt card advance
      }
    }

    // Wait for CSS animation to finish (400ms matching index.css class definitions)
    setTimeout(() => {
      setCurrentIndex(prevIndex => prevIndex + 1);
      setSwipeDirection(null);
      setAnimating(false);
    }, 400);
  };

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showMatchModal || showUpgradeModal || loading || candidates.length === 0 || currentIndex >= candidates.length) return;
      if (e.key === 'ArrowLeft') {
        handleSwipe('left');
      } else if (e.key === 'ArrowRight') {
        handleSwipe('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, candidates, animating, showMatchModal, showUpgradeModal, loading]);

  // Simulate upgrade to PRO tier to bypass daily limit
  const handleSimulateUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      // Upgrades profile tier locally/mock or backend-linked
      if (profile) {
        // Upgrade current session
        localStorage.setItem('dt_user_tier_' + user.id, 'PRO');
        
        // Simulating the user upgrade
        alert('🎉 Congratulations! You have successfully upgraded to PRO. Swiping limit removed!');
        setShowUpgradeModal(false);
        
        // Reload page or re-enable swipes
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      alert('Upgrade simulation failed.');
    } finally {
      setUpgradeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
          <Flame className="w-6 h-6 text-violet-500 fill-violet-500 absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="mt-4 text-slate-400 text-sm font-medium animate-pulse">Scanning developer stack...</p>
      </div>
    );
  }

  const currentProfile = candidates[currentIndex];
  const isDeckEmpty = !currentProfile;

  return (
    <div className="flex-grow flex flex-col items-center justify-center py-4 relative">
      
      {/* 1. MATCH CELEBRATION MODAL OVERLAY */}
      {showMatchModal && matchedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
          {/* Confetti particles glowing in background */}
          <div className="absolute inset-0 bg-radial-gradient opacity-40"></div>
          
          <div className="relative max-w-md w-full text-center space-y-8 p-8 glass-panel border border-violet-500/30 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[6px] bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600"></div>

            <div className="flex justify-center relative">
              <div className="relative p-4 rounded-full bg-violet-600/10 border border-violet-500/20 shadow-inner">
                <Flame className="w-12 h-12 text-violet-400 fill-violet-400 animate-bounce" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent tracking-tight">
                It's a Match!
              </h2>
              <p className="text-slate-300 text-sm">
                You and <span className="font-semibold text-white">{matchedProfile.fullName}</span> have liked each other's tech stack.
              </p>
            </div>

            {/* Avatars side-by-side */}
            <div className="flex items-center justify-center gap-6 py-4">
              <div className="relative">
                <img
                  src={profile?.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150&h=150'}
                  alt="You"
                  className="w-24 h-24 rounded-full object-cover border-4 border-violet-600 shadow-xl"
                />
                <span className="absolute -bottom-2 -right-1 bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">YOU</span>
              </div>
              
              <div className="w-10 h-[2px] bg-gradient-to-r from-violet-600 to-blue-600"></div>

              <div className="relative">
                <img
                  src={matchedProfile.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150&h=150'}
                  alt={matchedProfile.fullName}
                  className="w-24 h-24 rounded-full object-cover border-4 border-blue-600 shadow-xl"
                />
                <span className="absolute -bottom-2 -right-1 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">MATCH</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3.5 pt-4">
              <Link
                to="/connections"
                className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 active:scale-[0.98] text-white text-sm transition-all"
              >
                Send a Message
              </Link>
              <button
                onClick={() => setShowMatchModal(false)}
                className="w-full py-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 active:scale-[0.98] text-slate-300 text-sm font-semibold transition-all cursor-pointer"
              >
                Keep Swiping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. SWIPE LIMIT UPGRADE MODAL */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-sm w-full p-6 text-center glass-panel border border-violet-500/20 rounded-2xl shadow-xl space-y-6 relative">
            <div className="w-14 h-14 bg-violet-600/10 rounded-full flex items-center justify-center mx-auto text-violet-400">
              <Award className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Swipe Limit Reached</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Free tier accounts are limited to 20 swipes a day. Upgrade to PRO for unlimited matching.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleSimulateUpgrade}
                disabled={upgradeLoading}
                className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-sm transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
              >
                {upgradeLoading ? 'Upgrading...' : 'Simulate Pro Upgrade (Free)'}
              </button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-full py-3 rounded-xl text-slate-400 hover:text-slate-200 text-sm font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CARDS DECK & CONTROLS */}
      {isDeckEmpty ? (
        /* Empty State Panel */
        <div className="max-w-sm w-full p-8 text-center glass-panel border border-slate-800 rounded-3xl space-y-6 shadow-xl animate-fade-in">
          <div className="relative inline-flex p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <Sparkles className="w-10 h-10 text-violet-400/80" />
            <div className="absolute inset-0 bg-violet-500/10 blur-md rounded-full -z-10 animate-pulse"></div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-100">Deck Cleared!</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              No more profiles in your area matching your tech interests. Try updating your skills or check back in a bit!
            </p>
          </div>

          <button
            onClick={loadFeed}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900 hover:bg-slate-800/80 text-sm font-semibold text-slate-300 transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Feed
          </button>
        </div>
      ) : (
        /* Active Swiper Panel */
        <div className="w-full flex flex-col items-center gap-6">
          
          {/* Deck Container */}
          <div className="relative w-full flex justify-center">
            {/* Card animation wrapper */}
            <div
              className={`transition-all duration-300 ${
                swipeDirection === 'left' ? 'swipe-left' : ''
              } ${swipeDirection === 'right' ? 'swipe-right' : ''}`}
            >
              <DevCard profile={currentProfile} swipeDirection={swipeDirection} />
            </div>
          </div>

          {/* Swipe Trigger Buttons */}
          <div className="flex items-center justify-center gap-6 mt-2">
            {/* Ignore (Pass) */}
            <button
              onClick={() => handleSwipe('left')}
              disabled={animating}
              className="p-4 rounded-full bg-slate-900 border border-slate-800 hover:border-rose-500/30 text-rose-500 hover:text-rose-400 shadow-lg hover:shadow-rose-950/20 active:scale-90 hover:scale-105 transition-all duration-200 cursor-pointer disabled:opacity-50"
              title="Ignore Profile (Left Arrow)"
            >
              <X className="w-6 h-6 stroke-[2.5]" />
            </button>

            {/* Interested (Like) */}
            <button
              onClick={() => handleSwipe('right')}
              disabled={animating}
              className="p-5 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-xl shadow-violet-900/10 hover:shadow-violet-600/20 active:scale-90 hover:scale-105 transition-all duration-200 cursor-pointer disabled:opacity-50"
              title="Interested (Right Arrow)"
            >
              <Heart className="w-7 h-7 fill-white stroke-[2.5]" />
            </button>
          </div>

          {/* Keyboard tip indicator */}
          <p className="text-[11px] text-slate-500 text-center tracking-wide mt-1 select-none hidden sm:block">
            Pro Tip: Use <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[9px] font-mono">←</kbd> and <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[9px] font-mono">→</kbd> arrow keys to swipe!
          </p>
        </div>
      )}
    </div>
  );
}
