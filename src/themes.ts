export interface Theme {
  id: string;
  name: string;
  className: string;
  description: string;
}

export const themes: Theme[] = [
  { id: 'minimal-white', name: 'Minimalist White', className: 'bg-white text-black', description: 'Clean and bright.' },
  { id: 'minimal-black', name: 'Minimalist Black', className: 'bg-black text-white', description: 'Sleek and dark.' },
  { id: 'ocean-gradient', name: 'Ocean Gradient', className: 'bg-gradient-to-br from-blue-500 to-cyan-300 text-white', description: 'Cool and refreshing.' },
  { id: 'sunset-gradient', name: 'Sunset Gradient', className: 'bg-gradient-to-br from-orange-500 to-pink-500 text-white', description: 'Warm and vibrant.' },
  { id: 'forest-green', name: 'Forest Green', className: 'bg-emerald-900 text-emerald-50', description: 'Natural and calm.' },
  { id: 'neon-night', name: 'Neon Night', className: 'bg-zinc-950 text-indigo-400', description: 'Modern and edgy.' },
  { id: 'soft-pastel', name: 'Soft Pastel', className: 'bg-rose-100 text-rose-900', description: 'Gentle and inviting.' },
  { id: 'vintage-paper', name: 'Vintage Paper', className: 'bg-stone-200 text-stone-800', description: 'Classic and textured.' },
  { id: 'cyberpunk', name: 'Cyberpunk', className: 'bg-purple-950 text-yellow-300', description: 'Futuristic and bold.' },
  { id: 'abstract-shapes', name: 'Abstract Shapes', className: 'bg-zinc-900 text-zinc-100', description: 'Artistic and unique.' },
  { id: 'marble-texture', name: 'Marble Texture', className: 'bg-slate-100 text-slate-900', description: 'Elegant and sophisticated.' },
  { id: 'dark-wood', name: 'Dark Wood', className: 'bg-amber-950 text-amber-100', description: 'Warm and rustic.' },
  { id: 'concrete', name: 'Concrete', className: 'bg-zinc-500 text-zinc-950', description: 'Industrial and raw.' },
  { id: 'bokeh-lights', name: 'Bokeh Lights', className: 'bg-zinc-900 text-zinc-200', description: 'Dreamy and soft.' },
  { id: 'geometric-lines', name: 'Geometric Lines', className: 'bg-white text-zinc-900', description: 'Structured and clean.' },
  { id: 'watercolor', name: 'Watercolor', className: 'bg-sky-50 text-sky-900', description: 'Artistic and fluid.' },
  { id: 'denim-texture', name: 'Denim Texture', className: 'bg-blue-900 text-blue-50', description: 'Casual and durable.' },
  { id: 'gold-foil', name: 'Gold Foil', className: 'bg-yellow-900 text-amber-200', description: 'Luxurious and bright.' },
  { id: 'space-nebula', name: 'Space Nebula', className: 'bg-indigo-950 text-indigo-200', description: 'Vast and mysterious.' },
  { id: 'floral-pattern', name: 'Floral Pattern', className: 'bg-green-50 text-green-900', description: 'Fresh and organic.' },
];
