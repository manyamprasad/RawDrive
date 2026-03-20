import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, ChevronRight, Mail, Lock, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { signInWithGoogle, loginWithEmail, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginWithEmail(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden text-white font-sans bg-[#030406]">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[#030406]" />
        <div className="absolute -top-[10%] left-[20%] w-[60vw] h-[60vw] bg-blue-900/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-[20%] right-[10%] w-[50vw] h-[50vw] bg-blue-800/10 rounded-full blur-[100px]" />
      </div>

      <header className="absolute top-8 left-8 right-8 flex items-center justify-between z-10">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Camera className="text-white w-4 h-4" />
          </div>
          <span className="font-bold text-lg tracking-tight">RawDrive</span>
        </Link>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <GlassCard intensity="high" className="p-8 bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-light tracking-tighter mb-2">Welcome Back</h1>
            <p className="text-zinc-400 text-sm">Sign in to your RawDrive dashboard.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  required
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-zinc-600"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Password</label>
                <Link to="#" className="text-xs text-blue-400 hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  required
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-zinc-600"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full mt-6 bg-white text-black hover:bg-zinc-200">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sign In <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#030406] px-2 text-zinc-500">Or continue with</span>
            </div>
          </div>

          <Button onClick={handleGoogleLogin} disabled={loading} variant="secondary" className="w-full bg-white/5 border border-white/10 hover:bg-white/10">
            Sign In with Google
          </Button>

          <p className="text-center text-sm text-zinc-400 mt-6">
            Don't have an account? <Link to="/register" className="text-blue-400 font-medium hover:underline">Register</Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
