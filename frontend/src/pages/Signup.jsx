import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame, Mail, Lock, User, Briefcase, ChevronRight, Check, AlertTriangle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

const GithubSVG = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={props.className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

export default function Signup() {
  const { register, updateProfile, loginGoogle, loginGithub, isAuthenticated, profile } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated and profile is complete, or jump to step 2 if incomplete
  useEffect(() => {
    if (isAuthenticated) {
      if (profile && profile.fullName && profile.fullName.trim() !== '') {
        navigate('/');
      } else {
        setStep(2);
      }
    }
  }, [isAuthenticated, profile, navigate]);

  // Handle incoming GitHub Redirect Callback on Signup page
  const location = useLocation();
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const githubCode = searchParams.get('code');
    if (githubCode) {
      setError('');
      setLoading(true);
      loginGithub(githubCode)
        .then((result) => {
          if (result.profile && result.profile.fullName && result.profile.fullName.trim() !== '') {
            navigate('/');
          } else {
            setStep(2);
          }
        })
        .catch((err) => {
          console.error(err);
          setError(err.message || 'GitHub OAuth registration verification failed.');
          setLoading(false);
        });
    }
  }, [location.search]);

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    try {
      const result = await loginGoogle(credentialResponse.credential);
      if (result.profile && result.profile.fullName && result.profile.fullName.trim() !== '') {
        navigate('/');
      } else {
        setStep(2);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Google registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google authentication failed. Please try again.');
  };

  const handleGithubSignup = () => {
    setError('');
    const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    
    if (!githubClientId || githubClientId.includes('placeholder') || githubClientId.includes('here')) {
      console.warn('[Vite Client] Placeholder GitHub Client ID. Simulating OAuth registration.');
      const simulatedCode = "simulated-github-auth-code-" + Math.random().toString(36).substring(7);
      setLoading(true);
      loginGithub(simulatedCode)
        .then(() => setStep(2))
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
      return;
    }

    const redirectUri = window.location.origin + '/signup';
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}&scope=read:user,user:email`;
  };

  // Wizard state
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form Fields
  // Step 1: Account
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step 2: Profile
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState(23);
  const [gender, setGender] = useState('Male');
  const [yearsOfExperience, setYearsOfExperience] = useState(1);
  const [bio, setBio] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');

  const handleNextStep = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError('Please fill in all account fields.');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      // Create user account and login
      await register(username, email, password);
      // Advance to profile step
      setStep(2);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Registration failed. Try a different username/email.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    if (!fullName) {
      setError('Full Name is required.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      // Parse skills input
      const skillsArray = skillsInput
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      // Save user profile details
      await updateProfile({
        fullName,
        bio,
        githubUrl,
        resumeUrl,
        skills: skillsArray,
        interests: ['Coding', 'Networking'],
        yearsOfExperience: parseInt(yearsOfExperience, 10),
        age: parseInt(age, 10),
        gender
      });

      // On completion, redirect to feed!
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to complete profile creation. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-violet-600/15 blur-[80px] rounded-full -z-10"></div>
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-blue-600/10 blur-[90px] rounded-full -z-10"></div>

      <div className="w-full max-w-lg">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-violet-600/20 to-blue-600/20 border border-violet-500/30 mb-4">
            <Flame className="w-10 h-10 text-violet-500 fill-violet-500" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Create your account
          </h1>
          {/* Progress Tracker dots */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className={`h-2.5 rounded-full transition-all duration-300 ${step === 1 ? 'w-8 bg-violet-500' : 'w-2.5 bg-slate-700'}`}></span>
            <span className={`h-2.5 rounded-full transition-all duration-300 ${step === 2 ? 'w-8 bg-violet-500' : 'w-2.5 bg-slate-700'}`}></span>
          </div>
        </div>

        {/* Wizard Container */}
        <div className="glass-panel border border-slate-800 p-8 rounded-2xl shadow-xl">
          {error && (
            <div className="flex items-center gap-2.5 p-3 mb-6 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <>
              /* STEP 1: ACCOUNT DETAILS */
              <form className="space-y-6" onSubmit={handleNextStep}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-800 focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/35 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none transition-all"
                      placeholder="dev_coder"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-800 focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/35 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none transition-all"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-800 focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/35 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none transition-all"
                      placeholder="•••••••• (Min 6 chars)"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Next: Profile Details</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Social Registration Divider */}
              <div className="flex items-center my-5">
                <div className="flex-1 border-t border-slate-800/80"></div>
                <span className="px-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Or register with</span>
                <div className="flex-1 border-t border-slate-800/80"></div>
              </div>

              {/* Social Buttons */}
              <div className="flex flex-col gap-3.5 mb-2">
                <div className="w-full flex justify-center border border-slate-800 rounded-xl py-2 bg-slate-900/40 hover:bg-slate-900 transition-all overflow-hidden relative">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="filled_dark"
                    shape="pill"
                    size="medium"
                    width="100%"
                    text="signup_with"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGithubSignup}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                >
                  <GithubSVG className="w-4.5 h-4.5 shrink-0 text-slate-300" />
                  <span>Sign up with GitHub</span>
                </button>
              </div>
            </>
          ) : (
            /* STEP 2: PROFILE DETAILS */
            <form className="space-y-5" onSubmit={handleCompleteRegistration}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800 focus:border-violet-500 rounded-xl text-slate-100 text-sm focus:outline-none transition-all"
                    placeholder="Jane Doe"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Age
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="100"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800 focus:border-violet-500 rounded-xl text-slate-100 text-sm focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800 focus:border-violet-500 rounded-xl text-slate-300 text-sm focus:outline-none transition-all"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800 focus:border-violet-500 rounded-xl text-slate-100 text-sm focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  About Me / Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows="3"
                  className="block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800 focus:border-violet-500 rounded-xl text-slate-100 text-sm focus:outline-none transition-all resize-none"
                  placeholder="Tell other developers about your projects, stack, and interests..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Skills (comma separated)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    className="block w-full pl-11 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 focus:border-violet-500 rounded-xl text-slate-100 text-sm focus:outline-none transition-all"
                    placeholder="React, TypeScript, Java, Spring Boot"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    GitHub URL (optional)
                  </label>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800 focus:border-violet-500 rounded-xl text-slate-100 text-sm focus:outline-none transition-all"
                    placeholder="https://github.com/..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Resume URL (optional)
                  </label>
                  <input
                    type="url"
                    value={resumeUrl}
                    onChange={(e) => setResumeUrl(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800 focus:border-violet-500 rounded-xl text-slate-100 text-sm focus:outline-none transition-all"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Complete Onboarding</span>
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Prompt Sign In */}
          {step === 1 && (
            <div className="mt-6 text-center border-t border-slate-800/80 pt-5">
              <span className="text-slate-400 text-xs sm:text-sm">Already have an account? </span>
              <Link
                to="/login"
                className="text-violet-400 hover:text-violet-300 font-semibold text-xs sm:text-sm hover:underline transition-all"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
