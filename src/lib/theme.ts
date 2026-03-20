export const THEME_TEMPLATES = [
  { id: 'plain-light', name: 'Plain Light', type: 'plain', class: 'bg-zinc-50 dark:bg-zinc-950' },
  { id: 'plain-dark', name: 'Plain Dark', type: 'plain', class: 'bg-zinc-950 dark:bg-zinc-950' },
  { id: 'gradient-sunset', name: 'Sunset Gradient', type: 'gradient', class: 'bg-gradient-to-br from-orange-100 to-rose-100 dark:from-orange-950 dark:to-rose-950' },
  { id: 'gradient-ocean', name: 'Ocean Gradient', type: 'gradient', class: 'bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-950 dark:to-blue-950' },
  { id: 'gradient-midnight', name: 'Midnight Gradient', type: 'gradient', class: 'bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950 dark:to-purple-950' },
  { id: 'gradient-emerald', name: 'Emerald Gradient', type: 'gradient', class: 'bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950 dark:to-teal-950' },
];

export function getThemeClass(themeId?: string | null) {
  if (!themeId) return 'bg-zinc-50 dark:bg-zinc-950';
  const theme = THEME_TEMPLATES.find(t => t.id === themeId);
  return theme ? theme.class : 'bg-zinc-50 dark:bg-zinc-950';
}
