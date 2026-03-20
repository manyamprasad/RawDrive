import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { motion } from 'motion/react';
import { useId } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const id = useId();

  const options = [
    { id: 'light', icon: Sun, label: 'Light theme' },
    { id: 'system', icon: Monitor, label: 'System theme' },
    { id: 'dark', icon: Moon, label: 'Dark theme' },
  ] as const;

  return (
    <div className="relative flex items-center p-1 bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-full shadow-inner">
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = theme === option.id;

        return (
          <button
            key={option.id}
            onClick={() => setTheme(option.id)}
            className={`relative z-10 p-2 rounded-full transition-colors duration-200 ${
              isActive 
                ? 'text-indigo-600 dark:text-indigo-400' 
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
            }`}
            aria-label={option.label}
          >
            {isActive && (
              <motion.div
                layoutId={`theme-toggle-active-${id}`}
                className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-full shadow-sm border border-zinc-200/50 dark:border-zinc-700/50"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
              />
            )}
            <Icon className="relative z-20 w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}
