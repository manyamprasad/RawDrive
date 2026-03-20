import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { signInWithGoogle, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    await signInWithGoogle();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden text-zinc-900 dark:text-zinc-50 font-sans">
      <header className="absolute top-8 left-8 right-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Camera className="text-white w-4 h-4" />
          </div>
          <span className="font-bold text-lg">RawDrive</span>
        </Link>
        <ThemeToggle />
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <GlassCard intensity="high" className="p-8 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl border-white/40 dark:border-zinc-800/50 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome Back</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Sign in to your RawDrive dashboard.</p>
          </div>

          <Button onClick={handleGoogleLogin} className="w-full mt-6 shadow-lg shadow-indigo-500/20">
            Sign In with Google <ChevronRight className="w-4 h-4 ml-1" />
          </Button>

          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-6">
            Don't have an account? <Link to="/register" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Register</Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
