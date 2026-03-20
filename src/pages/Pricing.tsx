import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Camera, ArrowLeft, Check, Zap } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';

const PLANS = [
  { id: 'free', name: "Free", storage: "1 GB", price: "₹0", desc: "Perfect for trying out the platform.", features: ["1 GB Storage", "Basic Gallery Sharing", "Standard Support"] },
  { id: 'basic', name: "Basic", storage: "10 GB", price: "₹499", desc: "For part-time photographers.", features: ["10 GB Storage", "Custom Watermarks", "Face ID Search (Limited)", "Priority Support"] },
  { id: 'pro', name: "Pro", storage: "1 TB", price: "₹1,999", desc: "For professional studios.", popular: true, features: ["1 TB Storage", "Unlimited Face ID Search", "Custom Domain", "Client Proofing", "24/7 Phone Support"] },
  { id: 'business', name: "Business", storage: "10 TB", price: "₹4,999", desc: "For large agencies and teams.", features: ["10 TB Storage", "Team Management", "API Access", "White-label Solution", "Dedicated Account Manager"] },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleUpgrade = (planId: string) => {
    setSelectedPlan(planId);
    // Simulate payment process
    setTimeout(() => {
      setSuccess(`Successfully upgraded to ${planId.toUpperCase()} plan!`);
      setTimeout(() => navigate('/dashboard'), 2000);
    }, 1500);
  };

  return (
    <div className="min-h-screen text-zinc-900 dark:text-zinc-50 font-sans pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-2xl border-b border-white/20 dark:border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            <ArrowLeft className="w-5 h-5" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Camera className="text-white w-4 h-4" />
              </div>
              <span className="font-bold text-lg hidden sm:block">RawDrive</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-16">
        {success && (
          <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm text-center max-w-2xl mx-auto">
            {success}
          </div>
        )}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Upgrade Your Storage</h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Choose the perfect plan for your photography business. Upgrades are applied instantly.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <GlassCard 
                intensity={plan.popular ? "high" : "low"}
                className={cn(
                  "p-8 relative h-full flex flex-col",
                  plan.popular ? "border-indigo-500/50 dark:border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-900/10 shadow-xl shadow-indigo-500/10" : "bg-white/60 dark:bg-zinc-900/40"
                )}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Most Popular
                  </span>
                )}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold mb-2">{plan.storage}</div>
                  <div className="text-2xl font-medium text-zinc-500 mb-4">{plan.price}<span className="text-sm font-normal">/mo</span></div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 h-10">{plan.desc}</p>
                </div>

                <div className="flex-1">
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <Check className="w-5 h-5 text-indigo-500 shrink-0" />
                        <span className="text-zinc-600 dark:text-zinc-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button 
                  variant={plan.popular ? "primary" : "outline"} 
                  className="w-full rounded-xl"
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={selectedPlan === plan.id}
                >
                  {selectedPlan === plan.id ? (
                    <span className="flex items-center"><Zap className="w-4 h-4 mr-2 animate-pulse" /> Upgrading...</span>
                  ) : (
                    `Upgrade to ${plan.name}`
                  )}
                </Button>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
