import { motion } from 'motion/react';
import { Play } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#030406] text-white">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2940&auto=format&fit=crop')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-[#030406]/70 backdrop-blur-[100px]" />
        <div className="absolute -top-[10%] left-[20%] w-[60vw] h-[60vw] bg-blue-900/40 rounded-full blur-[80px] animate-pulse" />
        <div className="absolute -bottom-[20%] right-[10%] w-[50vw] h-[50vw] bg-blue-800/30 rounded-full blur-[80px] animate-pulse" />
      </div>

      {/* Hero Content */}
      <main className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center px-6 pt-24 max-w-7xl mx-auto w-full">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/20 border border-blue-800/50 text-blue-200 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            <div className="w-2 h-2 bg-blue-200 rounded-full shadow-[0_0_8px_#A3B5C6]" />
            VisionOS 2.0 Engine Live
          </div>
          
          <h1 className="text-5xl md:text-7xl font-light leading-[1.05] tracking-tighter">
            Share your photos the way they <span className="italic font-serif text-blue-200">deserve</span> to be seen.
          </h1>
          
          <p className="text-xl text-zinc-400 max-w-md leading-relaxed">
            Elevate your client delivery. RawDrive uses spatial rendering and lossless compression to create immersive, cinematic galleries that feel as premium as your craft.
          </p>
          
          <div className="flex gap-4">
            <button className="px-8 py-4 bg-white text-black rounded-full font-semibold hover:bg-zinc-200 transition-all">Start free trial</button>
            <button className="px-8 py-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-full font-medium flex items-center gap-3 hover:bg-white/10 transition-all">
              <Play className="w-5 h-5" /> View demo gallery
            </button>
          </div>

          <div className="flex gap-12 pt-8 border-t border-white/5">
            {[
              { val: '100%', label: 'Lossless Quality' },
              { val: '10Gbps', label: 'Global CDN' },
              { val: 'Zero', label: 'Compression artifacts' },
            ].map((m, i) => (
              <div key={i} className="flex flex-col gap-1">
                <span className="text-2xl font-semibold">{m.val}</span>
                <span className="text-xs text-zinc-500 uppercase tracking-widest">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Visuals */}
        <div className="relative h-[600px] flex items-center justify-center perspective-[2000px]">
          <div className="absolute w-[85%] h-[85%] bg-white/5 backdrop-blur-3xl rounded-[48px] border border-white/10 shadow-2xl flex flex-col justify-between p-8 transform rotate-y-[-5deg] rotate-x-[2deg]">
            <div className="flex justify-between items-center">
              <div className="text-sm text-white/80 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/50 rounded-full" />
                Session: E. & J. Wedding
              </div>
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-white/20 rounded-full" />
                <div className="w-2 h-2 bg-white/20 rounded-full" />
                <div className="w-2 h-2 bg-white/20 rounded-full" />
              </div>
            </div>
            <div className="flex justify-between items-end border-t border-white/5 pt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-700 border-2 border-white/20" />
                <div>
                  <p className="text-sm font-medium">Delivered to Emma H.</p>
                  <p className="text-xs text-zinc-400">Viewed 12 mins ago</p>
                </div>
              </div>
              <div className="text-[10px] font-mono text-white/40 tracking-widest">SYS.RD.094 // ACTIVE</div>
            </div>
          </div>
          
          {/* Photo Cards */}
          <motion.div 
            animate={{ rotate: [-8, -12, -8] }}
            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
            className="absolute w-[240px] h-[320px] top-[15%] left-[10%] bg-zinc-900 rounded-3xl shadow-2xl border border-white/10 overflow-hidden brightness-75"
          >
            <img src="https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1000&auto=format&fit=crop" alt="Wedding detail" className="w-full h-full object-cover" />
          </motion.div>
          <motion.div 
            animate={{ rotate: [-2, 2, -2] }}
            transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
            className="absolute w-[340px] h-[480px] top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 bg-zinc-900 rounded-3xl shadow-2xl border border-white/10 overflow-hidden z-10"
          >
            <img src="https://images.unsplash.com/photo-1606800052052-a08af7148866?q=80&w=1200&auto=format&fit=crop" alt="Wedding portrait" className="w-full h-full object-cover" />
          </motion.div>
          <motion.div 
            animate={{ rotate: [5, 8, 5] }}
            transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
            className="absolute w-[280px] h-[380px] bottom-[10%] right-[5%] bg-zinc-900 rounded-3xl shadow-2xl border border-white/10 overflow-hidden z-20"
          >
            <img src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1000&auto=format&fit=crop" alt="Wedding couple" className="w-full h-full object-cover" />
          </motion.div>
        </div>
      </main>
    </section>
  );
}
