import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestService, swipeService } from '../services/api';
import { UserCheck, Check, X, Sparkles, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';

const Github = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
    {...props}
  >
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

export default function Requests() {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Celebration state
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState(null);

  const loadRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await requestService.getRequests(user.id);
      setRequests(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch pending requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [user]);

  const handleAction = async (targetUserId, isAccept) => {
    try {
      const result = await swipeService.submitSwipe(user.id, targetUserId, isAccept);
      
      // If we accepted them, they already swiped right on us, so it is 100% a match!
      if (isAccept) {
        const matchingProfile = requests.find(r => r.userId === targetUserId);
        setMatchedProfile(matchingProfile);
        setShowMatchModal(true);
      }

      // Remove from UI list
      setRequests(prevRequests => prevRequests.filter(r => r.userId !== targetUserId));
    } catch (err) {
      console.error('Action failed', err);
      alert('Could not submit response. Try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 text-sm">Loading requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4 max-w-4xl mx-auto">
      {/* Celebration Modal */}
      {showMatchModal && matchedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
          <div className="relative max-w-md w-full text-center space-y-8 p-8 glass-panel border border-violet-500/30 rounded-3xl shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[6px] bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600"></div>

            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-violet-600/10 border border-violet-500/20">
                <Flame className="w-12 h-12 text-violet-400 fill-violet-400 animate-bounce" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent tracking-tight">
                It's a Match!
              </h2>
              <p className="text-slate-300 text-sm">
                You and <span className="font-semibold text-white">{matchedProfile.fullName}</span> are now connected!
              </p>
            </div>

            {/* Avatars */}
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

            <div className="flex flex-col gap-3.5 pt-4">
              <Link
                to="/connections"
                className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm transition-all"
              >
                Go to Connections
              </Link>
              <button
                onClick={() => setShowMatchModal(false)}
                className="w-full py-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-sm font-semibold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-violet-600/10 border border-violet-500/20">
          <UserCheck className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Match Requests</h1>
          <p className="text-slate-400 text-xs sm:text-sm">These developers swiped right on your profile. Swipe back to match!</p>
        </div>
      </div>

      {requests.length === 0 ? (
        /* Empty State Panel */
        <div className="p-8 text-center glass-panel border border-slate-800 rounded-2xl space-y-4 shadow-xl mt-12 animate-fade-in">
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl inline-block text-slate-500">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white">All Caught Up!</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
              No pending requests. Keep swiping in the Feed and optimizing your portfolio details to attract colleagues!
            </p>
          </div>
        </div>
      ) : (
        /* Requests List */
        <div className="space-y-4">
          {requests.map((req) => (
            <div
              key={req.swipeId || req.userId}
              className="glass-panel border border-slate-800 hover:border-slate-800/80 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 transition-all duration-300 hover:shadow-lg"
            >
              {/* Profile Meta Left */}
              <div className="flex items-start gap-4">
                <img
                  src={req.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120&h=120'}
                  alt={req.fullName}
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-violet-500/25 shrink-0"
                />
                
                <div className="space-y-1.5">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-base font-bold text-white leading-none">{req.fullName}</h3>
                    {req.age && <span className="text-slate-400 text-xs font-semibold">{req.age}</span>}
                    <span className="text-[10px] text-violet-400 bg-violet-950/50 border border-violet-800/30 px-2 py-0.5 rounded-full font-semibold">
                      {req.yearsOfExperience} YOE
                    </span>
                  </div>
                  
                  {req.bio && (
                    <p className="text-slate-400 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                      {req.bio}
                    </p>
                  )}

                  {/* Skills tags */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {req.skills?.slice(0, 5).map((skill, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-900 text-slate-300 border border-slate-800"
                      >
                        {skill}
                      </span>
                    ))}
                    {req.skills?.length > 5 && (
                      <span className="text-[10px] text-slate-500">+{req.skills.length - 5} more</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons Right */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto border-t sm:border-0 border-slate-800/60 pt-4 sm:pt-0 justify-end">
                {req.githubUrl && (
                  <a
                    href={req.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200 transition-all"
                    title="Check GitHub"
                  >
                    <Github className="w-4 h-4" />
                  </a>
                )}

                {/* Decline Button */}
                <button
                  onClick={() => handleAction(req.userId, false)}
                  className="p-2.5 rounded-xl border border-slate-800 hover:border-rose-500/25 bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-all cursor-pointer active:scale-95"
                  title="Decline Request"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>

                {/* Accept Button */}
                <button
                  onClick={() => handleAction(req.userId, true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold active:scale-95 transition-all cursor-pointer"
                  title="Accept Request"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Accept</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
