import { useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import Webcam from 'react-webcam';
import { motion } from 'motion/react';
import { Camera, ArrowLeft, ScanFace, Loader2, CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';

export default function FaceSearch() {
  const { albumId } = useParams();
  const webcamRef = useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImgSrc(imageSrc);
      setIsScanning(true);
      
      // Simulate face scanning and matching process
      setTimeout(() => {
        setIsScanning(false);
        setScanComplete(true);
      }, 3000);
    }
  }, [webcamRef]);

  const retake = () => {
    setImgSrc(null);
    setScanComplete(false);
  };

  return (
    <div className="min-h-screen text-zinc-900 dark:text-zinc-50 font-sans flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="p-6 flex items-center justify-between z-10">
        <Link to={`/album/${albumId}`} className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" /> Back to Album
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Camera className="text-white w-4 h-4" />
            </div>
            <span className="font-bold text-lg hidden sm:block">RawDrive</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-3">Find Your Photos</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Scan your face to instantly find all photos of you in this album.</p>
          </div>

          <GlassCard intensity="high" className="p-4 bg-white/60 dark:bg-zinc-900/60 border-white/40 dark:border-zinc-800/60 rounded-[2.5rem] overflow-hidden relative shadow-2xl">
            {!imgSrc ? (
              <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden bg-zinc-100 dark:bg-zinc-950">
                {/* @ts-ignore */}
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "user" }}
                  className="w-full h-full object-cover"
                />
                
                {/* Scanning Overlay UI */}
                <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-[2rem] m-4 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-64 border-2 border-dashed border-indigo-400/50 rounded-[3rem]"></div>
                </div>
                
                <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                  <Button onClick={capture} size="lg" className="rounded-full shadow-[0_0_40px_rgba(79,70,229,0.5)]">
                    <ScanFace className="w-5 h-5 mr-2" /> Scan Face
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden bg-zinc-100 dark:bg-zinc-950">
                <img src={imgSrc} alt="Captured face" className="w-full h-full object-cover opacity-50 grayscale" />
                
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  {isScanning ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center"
                    >
                      <div className="relative mb-6">
                        <div className="w-24 h-24 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                        <ScanFace className="w-8 h-8 text-indigo-600 dark:text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Analyzing Face Data...</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">Matching with 1,240 photos in the album.</p>
                    </motion.div>
                  ) : scanComplete ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">Match Found!</h3>
                      <p className="text-zinc-500 dark:text-zinc-400 mb-8">We found 42 photos of you.</p>
                      
                      <div className="flex gap-3 w-full">
                        <Button variant="outline" onClick={retake} className="flex-1 rounded-xl border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                          Retake
                        </Button>
                        <Link to={`/album/${albumId}?filter=me`} className="flex-1">
                          <Button className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30">
                            View Photos
                          </Button>
                        </Link>
                      </div>
                    </motion.div>
                  ) : null}
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </main>
    </div>
  );
}
