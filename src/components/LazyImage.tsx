import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LazyImage({ photoKey, alt, className }: { photoKey?: string | null; alt: string; className?: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const fetchUrl = async () => {
      if (!photoKey) return;
      try {
        const response = await fetch(`/api/images/url?key=${encodeURIComponent(photoKey)}`);
        if (response.ok) {
          const data = await response.json();
          setSrc(data.url);
        }
      } catch (error) {
        console.error("Failed to fetch image URL", error);
      }
    };
    fetchUrl();
  }, [photoKey]);

  if (!photoKey) {
    return (
      <div className={cn("relative overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center", className)}>
        <span className="text-zinc-400 text-sm">No image</span>
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
