import Hero from '@/components/Hero';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Camera, Cloud, Shield, Zap, ChevronRight, Image as ImageIcon, Users, Smartphone, Star, CheckCircle2, ArrowRight, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import React from 'react';

export default function Landing() {
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate CRM Webhook integration (e.g., GoHighLevel)
    console.log('Lead captured:', { name: leadName, email: leadEmail });
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen text-zinc-900 dark:text-zinc-50 overflow-hidden font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4">
        <GlassCard intensity="high" className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between rounded-full">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center rotate-3 shadow-lg shadow-indigo-500/30">
              <Camera className="text-white w-6 h-6 -rotate-3" />
            </div>
            <span className="text-xl font-bold tracking-tight">RawDrive</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Features</a>
            <a href="#testimonials" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Reviews</a>
            <a href="#pricing" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/login" className="text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors hidden sm:block">Sign In</Link>
            <Link to="/register">
              <Button size="sm" className="rounded-full shadow-lg">Get Started</Button>
            </Link>
          </div>
        </GlassCard>
      </nav>

      {/* Hero Section */}
      <Hero />


      {/* Data Section (3 Core Value Props addressing Pain Points) */}
      <section id="features" className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 drop-shadow-sm">Solve Your Biggest Headaches</h2>
            <p className="text-lg text-zinc-700 dark:text-zinc-300 max-w-2xl mx-auto font-medium drop-shadow-sm">
              We built RawDrive to fix the exact problems that cost photographers time, money, and sanity.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Value Prop 1 */}
            <motion.div whileHover={{ y: -5 }}>
              <GlassCard intensity="low" className="p-10 h-full flex flex-col">
                <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mb-8 shadow-inner border border-rose-200 dark:border-rose-800/50">
                  <Smartphone className="w-7 h-7 text-rose-600 dark:text-rose-400" />
                </div>
                <h3 className="text-2xl font-bold mb-4">End the "Which Photo is Mine?" Nightmare</h3>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium mb-6 flex-grow">
                  Stop manually sorting photos for guests. Our AI Face ID Search lets clients instantly find all their photos just by taking a selfie.
                </p>
                <ul className="space-y-3">
                  {['Instant client gratification', 'Zero manual sorting', 'Higher print sales'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {item}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </motion.div>

            {/* Value Prop 2 */}
            <motion.div whileHover={{ y: -5 }}>
              <GlassCard intensity="low" className="p-10 h-full flex flex-col">
                <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-8 shadow-inner border border-indigo-200 dark:border-indigo-800/50">
                  <ImageIcon className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Look Like a Premium Studio, Not an Amateur</h3>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium mb-6 flex-grow">
                  Generic file sharing links devalue your work. Deliver stunning, liquid glassmorphism galleries with your own custom branding.
                </p>
                <ul className="space-y-3">
                  {['iOS-grade aesthetic', 'Custom domain support', 'Built-in watermarking'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {item}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </motion.div>

            {/* Value Prop 3 */}
            <motion.div whileHover={{ y: -5 }}>
              <GlassCard intensity="low" className="p-10 h-full flex flex-col">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-8 shadow-inner border border-emerald-200 dark:border-emerald-800/50">
                  <Cloud className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Never Delete an Old Shoot Again</h3>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium mb-6 flex-grow">
                  Running out of space? Upgrade instantly from 1GB to 10TB. Our lightning-fast Indian CDN ensures photos load instantly, anywhere.
                </p>
                <ul className="space-y-3">
                  {['Scalable up to 10TB', 'Lightning-fast delivery', 'No hidden bandwidth fees'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {item}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof (Testimonials) */}
      <section id="testimonials" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 drop-shadow-sm">Loved by Top Photographers</h2>
            <p className="text-lg text-zinc-700 dark:text-zinc-300 max-w-2xl mx-auto font-medium drop-shadow-sm">
              Don't just take our word for it. See how RawDrive is transforming photography businesses.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "RawDrive saved me 10 hours a week. The Face ID feature alone is worth 10x the price. My wedding clients are obsessed.",
                author: "Rahul Sharma",
                role: "Wedding Photographer",
                image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=100&auto=format&fit=crop"
              },
              {
                quote: "Finally, a platform that understands Indian photographers' storage needs. The galleries look incredibly premium and load instantly.",
                author: "Priya Patel",
                role: "Portrait & Fashion",
                image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop"
              },
              {
                quote: "Moving away from Google Drive was the best decision. My brand perception skyrocketed, and I'm booking higher-paying clients.",
                author: "Vikram Singh",
                role: "Event Photographer",
                image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop"
              }
            ].map((testimonial, i) => (
              <GlassCard key={i} intensity="medium" className="p-8">
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-5 h-5 text-amber-500 fill-current" />
                  ))}
                </div>
                <p className="text-lg text-zinc-800 dark:text-zinc-200 font-medium mb-8 italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-4">
                  <img src={testimonial.image} alt={testimonial.author} className="w-12 h-12 rounded-full object-cover shadow-md" />
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{testimonial.author}</h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">{testimonial.role}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Lead Capture (CRM Integration) */}
      <section className="py-24 px-6 relative">
        <div className="max-w-4xl mx-auto">
          <GlassCard intensity="high" className="p-12 text-center relative overflow-hidden">
            {/* Decorative background elements inside the card */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <h2 className="text-4xl font-bold tracking-tight mb-4 drop-shadow-sm">Want to Double Your Bookings?</h2>
              <p className="text-lg text-zinc-700 dark:text-zinc-300 max-w-2xl mx-auto font-medium mb-10 drop-shadow-sm">
                Download our free "Ultimate Pricing Guide for Indian Photographers" and learn how to charge what you're actually worth.
              </p>

              {isSubmitted ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-6 inline-flex items-center gap-4 shadow-inner"
                >
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  <div className="text-left">
                    <h4 className="font-bold text-emerald-900 dark:text-emerald-100">Success! Check your inbox.</h4>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">We've sent the guide to {leadEmail}</p>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleLeadSubmit} className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
                  <div className="relative flex-1">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input 
                      type="text" 
                      required
                      placeholder="First Name" 
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 rounded-xl bg-white/50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium placeholder:text-zinc-500"
                    />
                  </div>
                  <div className="relative flex-1">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input 
                      type="email" 
                      required
                      placeholder="Email Address" 
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 rounded-xl bg-white/50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium placeholder:text-zinc-500"
                    />
                  </div>
                  <Button type="submit" size="lg" className="h-14 px-8 rounded-xl shadow-lg shadow-indigo-500/20 whitespace-nowrap">
                    Send Me The Guide <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </form>
              )}
              <p className="text-xs text-zinc-500 mt-6 font-medium">We respect your privacy. Unsubscribe at any time.</p>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 drop-shadow-sm">Simple, Transparent Pricing</h2>
            <p className="text-lg text-zinc-700 dark:text-zinc-300 max-w-2xl mx-auto font-medium drop-shadow-sm">
              Upgrade in real-time. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { name: "Free", storage: "1 GB", price: "₹0", desc: "Perfect for trying out the platform." },
              { name: "Basic", storage: "10 GB", price: "₹499", desc: "For part-time photographers." },
              { name: "Pro", storage: "1 TB", price: "₹1,999", desc: "For professional studios.", popular: true },
              { name: "Business", storage: "10 TB", price: "₹4,999", desc: "For large agencies and teams." },
            ].map((plan, i) => (
              <GlassCard 
                key={i} 
                intensity={plan.popular ? "high" : "low"}
                className={cn(
                  "p-8 relative flex flex-col h-full",
                  plan.popular ? "border-indigo-500/50 dark:border-indigo-400/50 shadow-xl shadow-indigo-500/20" : ""
                )}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                    Most Popular
                  </span>
                )}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold mb-2 text-indigo-600 dark:text-indigo-400">{plan.storage}</div>
                  <div className="text-2xl font-medium text-zinc-600 dark:text-zinc-300 mb-6">{plan.price}<span className="text-sm font-normal">/mo</span></div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 h-10 font-medium">{plan.desc}</p>
                </div>
                <div className="mt-auto">
                  <Link to="/register">
                    <Button variant={plan.popular ? "primary" : "glass"} className="w-full rounded-xl">
                      Choose {plan.name}
                    </Button>
                  </Link>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/20 dark:border-white/10 bg-white/10 dark:bg-black/10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold">RawDrive</span>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">© 2026 RawDrive India. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
