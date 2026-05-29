import { useState } from 'react';
import { Mail, Lock, User, LogIn, Sparkles, AlertCircle, Loader } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function AuthView() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Please add your credentials in settings.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        });
        if (signUpErr) throw signUpErr;
        
        if (data.session) {
          setMessage('Account created and logged in successfully!');
        } else {
          setMessage('Check your email for the confirmation link to complete registration!');
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInErr) throw signInErr;
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      setError(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Please add your credentials in settings.');
      setLoading(false);
      return;
    }

    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (err) throw err;
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      setError(err.message || 'An error occurred during Google Sign-in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden theme-bg-primary">
      {/* Left side panel (hidden on mobile) */}
      <div className="relative hidden md:flex md:w-[45%] lg:w-[50%] flex-col justify-between p-12 overflow-hidden border-r theme-border theme-bg-secondary select-none">
        {/* Animated background drift orbs */}
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px] animate-float pointer-events-none" style={{ animationDuration: '8s' }} />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-teal-500/10 blur-[120px] animate-float pointer-events-none" style={{ animationDuration: '12s', animationDelay: '2s' }} />
        
        {/* Top brand */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/25 shadow-lg shadow-emerald-500/5">
            <Sparkles className="h-4.5 w-4.5 text-emerald-400" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider theme-text-main">LetsChat</span>
          <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[8px] font-bold text-emerald-400 uppercase tracking-wider">Pro</span>
        </div>

        {/* Brand content */}
        <div className="my-auto max-w-md relative z-10 space-y-6">
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight theme-text-main leading-tight">
            The Modern WhatsApp <br />
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 bg-clip-text text-transparent">Support & Ticketing</span> Platform
          </h2>
          <p className="text-xs theme-text-secondary leading-relaxed">
            Unify your customer chats, automate common inquiries with AI active agents, and coordinate your support team in a single, minimal dashboard.
          </p>
          <div className="flex items-center gap-6 pt-4">
            <div>
              <p className="text-xl font-bold theme-text-main">99.9%</p>
              <p className="text-[9px] uppercase tracking-wider theme-text-muted font-bold mt-0.5">Uptime SLA</p>
            </div>
            <div className="h-8 w-px theme-border" />
            <div>
              <p className="text-xl font-bold theme-text-main">&lt; 1 min</p>
              <p className="text-[9px] uppercase tracking-wider theme-text-muted font-bold mt-0.5">AI Response Time</p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-[9px] theme-text-muted relative z-10 uppercase tracking-wider font-semibold">
          © {new Date().getFullYear()} LetsChat Inc.
        </div>
      </div>

      {/* Right side form */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">
        {/* Background gradient orbs for mobile/right side */}
        <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none md:hidden" />
        <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-teal-500/10 blur-[120px] pointer-events-none md:hidden" />
        
        {/* Glassmorphic Form Card */}
        <div className="relative w-full max-w-[400px] rounded-2xl border theme-border theme-bg-secondary p-8 shadow-2xl shadow-black/10 dark:shadow-black/30 backdrop-blur-md animate-scale-in overflow-hidden">
          {/* Top colored accent line */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-400 to-teal-500" />

          {/* Logo (shown only on mobile since left side is hidden) */}
          <div className="flex flex-col items-center mb-8 text-center md:hidden">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
              <Sparkles className="h-5 w-5 text-emerald-400" />
            </div>
            <h1 className="text-lg font-bold theme-text-main uppercase tracking-wider">LetsChat</h1>
            <p className="text-[9px] theme-text-muted mt-1 uppercase tracking-widest font-semibold">Support Workspace</p>
          </div>

          <div className="hidden md:block mb-8">
            <h3 className="text-lg font-bold theme-text-main">Welcome to LetsChat</h3>
            <p className="text-xs theme-text-muted mt-1">Sign in to manage your customer conversations.</p>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 dark:bg-white/[0.08] p-1 border theme-border mb-6">
            <button 
              type="button"
              onClick={() => { setIsSignUp(false); setError(null); setMessage(null); }}
              className={`rounded-lg py-2 text-xs font-bold transition-all duration-150 ${!isSignUp ? 'bg-white dark:bg-zinc-700 theme-text-main shadow-sm border border-zinc-200/50 dark:border-zinc-600' : 'theme-text-muted hover:theme-text-secondary'}`}
            >
              Log In
            </button>
            <button 
              type="button"
              onClick={() => { setIsSignUp(true); setError(null); setMessage(null); }}
              className={`rounded-lg py-2 text-xs font-bold transition-all duration-150 ${isSignUp ? 'bg-white dark:bg-zinc-700 theme-text-main shadow-sm border border-zinc-200/50 dark:border-zinc-600' : 'theme-text-muted hover:theme-text-secondary'}`}
            >
              Create Account
            </button>
          </div>

          {/* Feedback alerts */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/10 bg-red-500/[0.04] p-3.5 mb-5 text-xs text-red-650 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          {message && (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-3.5 mb-5 text-xs text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{message}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-[9px] font-bold theme-text-muted mb-1.5 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 theme-text-muted">
                    <User className="h-3.5 w-3.5" />
                  </span>
                  <input 
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Priya Sharma"
                    className="input-field pl-10!" 
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[9px] font-bold theme-text-muted mb-1.5 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 theme-text-muted">
                  <Mail className="h-3.5 w-3.5" />
                </span>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="priya.sharma@letschat.com"
                  className="input-field pl-10!" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold theme-text-muted mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 theme-text-muted">
                  <Lock className="h-3.5 w-3.5" />
                </span>
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input-field pl-10!" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? (
                <><Loader className="h-3.5 w-3.5 animate-spin" />Processing...</>
              ) : isSignUp ? (
                <>Create Account</>
              ) : (
                <><LogIn className="h-3.5 w-3.5" />Sign In</>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t theme-border"></div>
            </div>
            <div className="relative flex justify-center text-[9px] uppercase">
              <span className="theme-bg-primary md:theme-bg-secondary px-3 theme-text-muted font-bold tracking-wider">Or continue with</span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl border theme-border bg-white/[0.01] hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] px-4 py-2.5 text-xs font-semibold theme-text-secondary transition-all duration-150 disabled:opacity-50 select-none hover:border-zinc-300 dark:hover:border-zinc-700"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Google
          </button>

          {/* Disclaimers / Info */}
          <p className="text-[10px] theme-text-muted text-center mt-6">
            Powered by Supabase Auth and Database.
          </p>

        </div>
      </div>
    </div>
  );
}
