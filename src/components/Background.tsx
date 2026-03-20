import React from 'react';

export function Background() {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden bg-[#f8fafc] dark:bg-[#09090b] transition-colors duration-500">
      {/* Liquid Glass Animated Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-400/30 dark:bg-blue-600/20 blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-blob" />
      <div className="absolute top-[20%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-purple-400/30 dark:bg-purple-600/20 blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-2000" />
      <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-indigo-400/30 dark:bg-indigo-600/20 blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-4000" />
      <div className="absolute bottom-[10%] right-[20%] w-[40vw] h-[40vw] rounded-full bg-pink-400/20 dark:bg-pink-600/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-6000" />
      
      {/* Noise Texture Overlay for realism */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
    </div>
  );
}
