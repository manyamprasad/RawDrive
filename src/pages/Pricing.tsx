import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SEOManager } from '../components/SEOManager';

const PLANS = [
  { id: 'starter', name: "Starter", storage: "500GB", price: "₹24", desc: "Perfect for solo photographers beginning their spatial journey.", features: ["5 Active Spatial Galleries", "500GB SSD Storage", "4K Resolution Playback", "Standard CDN Delivery"] },
  { id: 'pro', name: "Pro", storage: "2TB", price: "₹59", desc: "Advanced delivery for professional studios and high-volume artists.", popular: true, features: ["Unlimited Active Galleries", "2TB Lossless Storage", "8K Spatial Rendering", "Custom Domain & Branding", "Priority 10Gbps CDN"] },
  { id: 'studio', name: "Studio", storage: "10TB", price: "₹149", desc: "Enterprise-grade infrastructure for large teams and agencies.", features: ["10TB Unified Storage", "Multi-Seat Management", "API for Workflow Integration", "Dedicated Success Manager"] },
];

export default function Pricing() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');

  return (
    <div className="min-h-screen bg-[#030406] text-white font-sans pb-24">
      <SEOManager 
        title="Pricing - RawDrive"
        description="Plans for every stage of your craft. Choose the scale that fits your studio."
        schema={{}}
      />
      
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2940&auto=format&fit=crop')] bg-cover bg-center">
        <div className="absolute inset-0 bg-[#030406]/85 backdrop-blur-[120px]" />
      </div>

      <nav className="relative z-10 w-full p-6 flex justify-between items-center">
        <Link to="/" className="text-xl font-semibold flex items-center gap-3">
          <div className="w-7 h-7 bg-white rounded-lg" /> RawDrive
        </Link>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-light tracking-tighter mb-6 bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">Plans for every stage of your craft</h1>
          <p className="text-xl text-gray-400 max-w-xl mx-auto">Uncompromising quality for visual storytellers. Choose the scale that fits your studio.</p>
        </div>

        <div className="flex justify-center mb-16">
          <div className="flex bg-white/5 p-1.5 rounded-full border border-white/10">
            {['monthly', 'yearly'].map((b) => (
              <button 
                key={b}
                onClick={() => setBilling(b as any)}
                className={cn("px-8 py-3 rounded-full text-sm font-semibold transition-all", billing === b ? "bg-white/10 text-white" : "text-gray-500")}
              >
                {b.charAt(0).toUpperCase() + b.slice(1)} {b === 'yearly' && <span className="bg-blue-200 text-black px-2 py-0.5 rounded text-xs ml-1">-20%</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-10 flex flex-col relative overflow-hidden transition-transform hover:scale-[1.02]",
                plan.popular ? "border-white/20 bg-white/10" : ""
              )}
            >
              {plan.popular && (
                <div className="absolute top-6 right-0 bg-white text-black text-[10px] font-extrabold px-6 py-1 rotate-45 translate-x-6">MOST POPULAR</div>
              )}
              <div className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-2">{plan.name}</div>
              <div className="text-5xl font-light mb-6">{plan.price}<span className="text-base text-gray-500">/mo</span></div>
              <p className="text-gray-400 mb-8 h-12">{plan.desc}</p>
              <ul className="space-y-4 mb-10 flex-grow">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-gray-200">
                    <Check className="w-5 h-5 text-blue-300 shrink-0" /> {feature}
                  </li>
                ))}
              </ul>
              <button className={cn("w-full py-4 rounded-full font-semibold transition-all", plan.popular ? "bg-white text-black hover:bg-white/90" : "bg-white/5 border border-white/10 hover:bg-white/10")}>
                {plan.id === 'studio' ? 'Contact Sales' : 'Get Started'}
              </button>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
