import { useState, useEffect } from 'react';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LazyImage({ photoKey, alt, className }: { photoKey?: string | null; alt: string; className?: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const fetchUrl = async () => {
      if (!photoKey) return;
      try {
        setError(false);
        const response = await fetch(`/api/images/url?key=${encodeURIComponent(photoKey)}`);
        if (response.ok) {
          const data = await response.json();
          setSrc(data.url);
        } else {
          setError(true);
        }
      } catch (error) {
        console.error("Failed to fetch image URL", error);
        setError(true);
      }
    };
    fetchUrl();
  }, [photoKey]);

  if (!photoKey || error) {
    return (
      <div className={cn("relative overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex flex-col items-center justify-center p-4 text-center", className)}>
        <div className="w-10 h-10 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center mb-2">
          <ImageIcon className="w-5 h-5 text-zinc-400" />
        </div>
        <span className="text-zinc-400 text-xs font-medium">{error ? 'Failed to load' : 'No image'}</span>
        {error && (
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 text-[10px] text-indigo-500 hover:underline"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-zinc-200 dark:bg-zinc-800", className)}>
      {src && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          className={cn(
            "w-full h-full object-cover transition-all duration-700",
            isLoaded ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-md scale-105",
            "group-hover:scale-105"
          )}
        />
      )}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
      )}
    </div>
  );
}
