import React, { useEffect, useRef, useState } from 'react';
import JSMpeg from 'jsmpeg-player';

interface RtspPlayerProps {
  streamId: string;
  rtspUrl: string;
  className?: string;
}

const RtspPlayer: React.FC<RtspPlayerProps> = ({ streamId, rtspUrl, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const initPlayer = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get the websocket URL from our proxy endpoint
        const response = await fetch(`/api/streams/${streamId}/proxy`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to get proxy URL');
        }

        // Append the rtspUrl as a query parameter so the server knows what to proxy
        const wsUrl = `${data.wsUrl}?url=${encodeURIComponent(rtspUrl)}`;

        // Initialize JSMpeg player
        // jsmpeg-player's VideoElement takes the container and the websocket URL
        playerRef.current = new JSMpeg.VideoElement(containerRef.current, wsUrl, {
          autoplay: true,
          decodeFirstFrame: true,
        });

        // We can't easily listen for events on jsmpeg-player's VideoElement directly 
        // without checking its internals, but we can assume it's loading.
        // Let's add a timeout to stop the loading spinner if it takes too long
        const timer = setTimeout(() => {
          setIsLoading(false);
        }, 5000);

        return () => clearTimeout(timer);

      } catch (err: any) {
        console.error('Player Init Error:', err);
        setError(err.message || 'Failed to initialize player');
        setIsLoading(false);
      }
    };

    initPlayer();

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [streamId, rtspUrl]);

  return (
    <div className={`relative bg-black rounded-xl overflow-hidden ${className}`} ref={containerRef}>
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="text-white text-xs font-medium">Connecting to stream...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-10 p-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-white text-sm font-medium">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 underline"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RtspPlayer;
