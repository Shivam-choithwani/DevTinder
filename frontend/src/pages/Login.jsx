import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame, Mail, Lock, AlertTriangle, ArrowRight } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

const GithubSVG = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={props.className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

export default function Login() {
  const { login, loginGoogle, loginGithub } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSuccessRedirect = (result, replace = false) => {
    // If user profile doesn't exist, has no fullName, or is empty, redirect to profile wizard
    if (!result.profile || !result.profile.fullName || result.profile.fullName.trim() === '' || result.profile.fullName === result.user.username) {
      console.log('New user detected or profile incomplete. Redirecting to Profile Wizard.');
      navigate('/profile', { replace, state: { isNewUser: true } });
    } else {
      navigate('/', { replace });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      handleLoginSuccessRedirect(result);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle incoming GitHub Redirect Callback
  const location = useLocation();
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const githubCode = searchParams.get('code');
    if (githubCode) {
      setError('');
      setLoading(true);
      loginGithub(githubCode)
        .then((result) => {
          handleLoginSuccessRedirect(result, true);
        })
        .catch((err) => {
          console.error(err);
          setError(err.message || 'GitHub OAuth verification failed.');
          setLoading(false);
        });
    }
  }, [location.search]);

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    try {
      const result = await loginGoogle(credentialResponse.credential);
      handleLoginSuccessRedirect(result);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google authentication failed. Please try again.');
  };

  const handleGithubLogin = () => {
    setError('');
    const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    
    // Fallback to mock simulation if placeholder client ID is active
    if (!githubClientId || githubClientId.includes('placeholder') || githubClientId.includes('here')) {
      console.warn('[Vite Client] Placeholder GitHub Client ID. Simulating OAuth callback.');
      const simulatedCode = "simulated-github-auth-code-" + Math.random().toString(36).substring(7);
      setLoading(true);
      loginGithub(simulatedCode)
        .then((result) => {
          handleLoginSuccessRedirect(result);
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
      return;
    }

    const redirectUri = window.location.origin + '/login';
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}&scope=read:user,user:email`;
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Decorative backdrop glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-violet-600/15 blur-[80px] rounded-full -z-10"></div>
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-blue-600/10 blur-[90px] rounded-full -z-10"></div>

      <div className="w-full max-w-md">
        {/* Header Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-violet-600/20 to-blue-600/20 border border-violet-500/30 mb-4 shadow-inner relative group">
            <Flame className="w-10 h-10 text-violet-500 fill-violet-500 group-hover:scale-110 transition-transform duration-300" />
            <div className="absolute inset-0 bg-violet-500/20 blur-md rounded-full -z-10"></div>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Welcome to <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">DevTinder</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Swipe, Match, and Collaborate with developers worldwide.
          </p>
        </div>

        {/* Card Panel */}
        <div className="glass-panel border border-slate-800 p-8 rounded-2xl shadow-xl relative overflow-hidden">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-slate-900/95 border-2 border-rose-500/60 text-slate-200 text-sm shadow-xl shadow-rose-950/20 backdrop-blur-md animate-fade-in">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-rose-400 text-sm">Sign In Error</p>
                    <p className="mt-0.5 text-slate-300 text-xs sm:text-sm leading-relaxed">{error}</p>
                  </div>
                </div>
                {error.toLowerCase().includes('not registered') && (
                  <div className="pl-8 mt-1">
                    <Link
                      to="/signup"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg hover:shadow-violet-600/20 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <span>Sign Up Here</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-800 focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/35 rounded-xl text-slate-100 placeholder-slate-500 text-sm transition-all focus:outline-none"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-800 focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/35 rounded-xl text-slate-100 placeholder-slate-500 text-sm transition-all focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-transparent text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-lg hover:shadow-violet-600/10 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Social Sign-In Divider */}
          <div className="flex items-center my-5">
            <div className="flex-1 border-t border-slate-800/80"></div>
            <span className="px-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Or connect with</span>
            <div className="flex-1 border-t border-slate-800/80"></div>
          </div>

          {/* Social OAuth Buttons */}
          <div className="flex flex-col gap-3.5 mb-2">
            {/* Google official button wrapped in glassmorphic overlay for dark styling alignment */}
            <div className="w-full flex justify-center border border-slate-800 rounded-xl py-2 bg-slate-900/40 hover:bg-slate-900 transition-all overflow-hidden relative">
              <div className="absolute inset-0 opacity-0 pointer-events-none"></div>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="filled_dark"
                shape="pill"
                size="medium"
                width="100%"
                text="signin_with"
              />
            </div>

            <button
              type="button"
              onClick={handleGithubLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              <GithubSVG className="w-4.5 h-4.5 shrink-0 text-slate-300" />
              <span>Continue with GitHub</span>
            </button>
          </div>

          {/* Prompt Sign up */}
          <div className="mt-6 text-center border-t border-slate-800/80 pt-5">
            <span className="text-slate-400 text-xs sm:text-sm">Don't have an account? </span>
            <Link
              to="/signup"
              className="text-violet-400 hover:text-violet-300 font-semibold text-xs sm:text-sm hover:underline transition-all"
            >
              Register Here
            </Link>
          </div>
        </div>

        {/* Demo Credentials Alert */}
        <div className="mt-6 p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-slate-400 text-xs space-y-1.5 text-center">
          <p className="font-semibold text-slate-300">💡 Demo Testing Account Credentials:</p>
          <p>Email: <code className="text-violet-400">sarahchen@devtinder.com</code> / Password: <code className="text-violet-400">password123</code></p>
          <p>Email: <code className="text-violet-400">alexrivera@devtinder.com</code> / Password: <code className="text-violet-400">password123</code></p>
        </div>
      </div>
    </div>
  );
}
