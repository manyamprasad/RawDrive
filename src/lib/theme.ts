export const THEME_TEMPLATES = [
  { id: 'minimal-white', name: 'Minimalist White', type: 'plain', class: 'bg-white text-black' },
  { id: 'minimal-black', name: 'Minimalist Black', type: 'plain', class: 'bg-black text-white' },
  { id: 'ocean-gradient', name: 'Ocean Gradient', type: 'gradient', class: 'bg-gradient-to-br from-blue-500 to-cyan-300 text-white' },
  { id: 'sunset-gradient', name: 'Sunset Gradient', type: 'gradient', class: 'bg-gradient-to-br from-orange-500 to-pink-500 text-white' },
  { id: 'forest-green', name: 'Forest Green', type: 'plain', class: 'bg-emerald-900 text-emerald-50' },
  { id: 'neon-night', name: 'Neon Night', type: 'plain', class: 'bg-zinc-950 text-indigo-400' },
  { id: 'soft-pastel', name: 'Soft Pastel', type: 'plain', class: 'bg-rose-100 text-rose-900' },
  { id: 'vintage-paper', name: 'Vintage Paper', type: 'plain', class: 'bg-stone-200 text-stone-800' },
  { id: 'cyberpunk', name: 'Cyberpunk', type: 'plain', class: 'bg-purple-950 text-yellow-300' },
  { id: 'abstract-shapes', name: 'Abstract Shapes', type: 'plain', class: 'bg-zinc-900 text-zinc-100' },
  { id: 'marble-texture', name: 'Marble Texture', type: 'plain', class: 'bg-slate-100 text-slate-900' },
  { id: 'dark-wood', name: 'Dark Wood', type: 'plain', class: 'bg-amber-950 text-amber-100' },
  { id: 'concrete', name: 'Concrete', type: 'plain', class: 'bg-zinc-500 text-zinc-950' },
  { id: 'bokeh-lights', name: 'Bokeh Lights', type: 'plain', class: 'bg-zinc-900 text-zinc-200' },
  { id: 'geometric-lines', name: 'Geometric Lines', type: 'plain', class: 'bg-white text-zinc-900' },
  { id: 'watercolor', name: 'Watercolor', type: 'plain', class: 'bg-sky-50 text-sky-900' },
  { id: 'denim-texture', name: 'Denim Texture', type: 'plain', class: 'bg-blue-900 text-blue-50' },
  { id: 'gold-foil', name: 'Gold Foil', type: 'plain', class: 'bg-yellow-900 text-amber-200' },
  { id: 'space-nebula', name: 'Space Nebula', type: 'plain', class: 'bg-indigo-950 text-indigo-200' },
  { id: 'floral-pattern', name: 'Floral Pattern', type: 'plain', class: 'bg-green-50 text-green-900' },
];

export function getThemeClass(themeId?: string | null) {
  if (!themeId) return 'bg-zinc-50 dark:bg-zinc-950';
  const theme = THEME_TEMPLATES.find(t => t.id === themeId);
  return theme ? theme.class : 'bg-zinc-50 dark:bg-zinc-950';
}
