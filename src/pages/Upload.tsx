import React, { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  UploadCloud, 
  X, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle,
  Camera,
  FolderPlus,
  RefreshCw
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface UploadFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
}

export default function Upload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [eventName, setEventName] = useState('');
  const [albumName, setAlbumName] = useState('');
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFiles = (newFiles: FileList | File[]) => {
    const validFiles = Array.from(newFiles).filter(file => file.type.startsWith('image/'));
    
    const newUploadFiles: UploadFile[] = validFiles.map(file => {
      if (file.size > MAX_FILE_SIZE) {
        return {
          id: Math.random().toString(36).substring(7),
          file,
          preview: URL.createObjectURL(file),
          progress: 0,
          status: 'error',
          errorMessage: 'File exceeds 50MB limit'
        };
      }

      return {
        id: Math.random().toString(36).substring(7),
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        status: 'pending'
      };
    });

    setFiles(prev => [...prev, ...newUploadFiles]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const retryFile = (id: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id === id) {
        if (f.file.size > MAX_FILE_SIZE) return f;
        return { ...f, status: 'pending', progress: 0, errorMessage: undefined };
      }
      return f;
    }));
  };

  const startUpload = async () => {
    setError(null);
    if (!eventName.trim() || !albumName.trim()) {
      setError('Please enter both Event and Album names');
      return;
    }
    if (!user) {
      setError('You must be logged in to upload');
      return;
    }
    
    const filesToUpload = files.filter(f => f.status === 'pending' || f.status === 'error');
    if (filesToUpload.length === 0) {
      setError('Please select valid photos to upload');
      return;
    }

    setIsUploading(true);

    // Create event document
    const eventId = Math.random().toString(36).substring(2, 15);
    const eventRef = doc(db, 'events', eventId);
    
    try {
      await setDoc(eventRef, {
        id: eventId,
        photographerId: user.uid,
        name: eventName,
        date: new Date().toISOString(),
        albumCount: 1,
        isPublic: true,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error creating event:", error);
      setError("Failed to create event");
      setIsUploading(false);
      return;
    }

    // Create album document
    const albumId = Math.random().toString(36).substring(2, 15);
    const albumRef = doc(db, 'albums', albumId);
    
    try {
      await setDoc(albumRef, {
        id: albumId,
        eventId: eventId,
        photographerId: user.uid,
        name: albumName,
        photoCount: 0, // Will update after upload
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error creating album:", error);
      setError("Failed to create album");
      setIsUploading(false);
      return;
    }

    let successfulUploads = 0;
    let failedUploads = 0;

    const uploadPromises = filesToUpload.map(async (fileObj) => {
      if (fileObj.file.size > MAX_FILE_SIZE) {
        failedUploads++;
        return;
      }

      setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'uploading', progress: 50 } : f));

      try {
        const formData = new FormData();
        formData.append('photo', fileObj.file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();

        // Save photo metadata to Firestore
        const photoId = Math.random().toString(36).substring(2, 15);
        await setDoc(doc(db, 'photos', photoId), {
          id: photoId,
          albumId: albumId,
          eventId: eventId,
          photographerId: user.uid,
          originalKey: data.originalKey,
          webpKey: data.webpKey,
          size: data.size,
          likes: 0,
          faces: data.faces || [],
          uploadedAt: new Date().toISOString()
        });
        
        successfulUploads++;
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'completed', progress: 100 } : f));
      } catch (err: any) {
        console.error("Upload error:", err);
        failedUploads++;
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'error', errorMessage: err.message || 'Upload failed' } : f));
      }
    });

    await Promise.all(uploadPromises);

    // Update album and event with final photo count and cover key
    if (successfulUploads > 0) {
      try {
        // Get the first successful upload's webpKey to use as cover
        const firstPhotoId = filesToUpload.find(f => f.status === 'completed')?.id;
        // We don't have the webpKey in the files array directly, but we can just query it or we can store it during upload.
        // Actually, let's just fetch the first photo we just uploaded.
        const photosQuery = query(collection(db, 'photos'), where('albumId', '==', albumId));
        const photosSnapshot = await getDocs(photosQuery);
        let coverKey = null;
        if (!photosSnapshot.empty) {
          coverKey = photosSnapshot.docs[0].data().webpKey;
        }

        await setDoc(albumRef, {
          photoCount: successfulUploads,
          ...(coverKey ? { coverKey } : {})
        }, { merge: true });

        await setDoc(eventRef, {
          ...(coverKey ? { coverKey } : {})
        }, { merge: true });
      } catch (err) {
        console.error("Error updating album/event metadata:", err);
      }
    }

    setIsUploading(false);

    if (failedUploads === 0 && successfulUploads > 0) {
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    }
  };

  const totalSize = files.reduce((acc, curr) => acc + curr.file.size, 0);
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const completedCount = files.filter(f => f.status === 'completed').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const pendingCount = files.filter(f => f.status === 'pending').length;

  return (
    <div className="min-h-screen text-zinc-900 dark:text-zinc-50 font-sans pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-2xl border-b border-white/20 dark:border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            <ArrowLeft className="w-5 h-5" /> Back to Dashboard
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
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 mt-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Upload Photos</h1>
          <p className="text-zinc-500">Create a new event and album to organize your photos.</p>
          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Left Column: Settings */}
          <div className="md:col-span-1 space-y-6">
            <GlassCard intensity="low" className="p-6 bg-white/60 dark:bg-zinc-900/40">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-500" />
                Organization
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 ml-1">Event Name</label>
                  <Input 
                    placeholder="e.g. Sharma Wedding 2026" 
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    disabled={isUploading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 ml-1">Album Name</label>
                  <Input 
                    placeholder="e.g. Engagement" 
                    value={albumName}
                    onChange={(e) => setAlbumName(e.target.value)}
                    disabled={isUploading}
                  />
                </div>
                
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-500">Total Photos</span>
                    <span className="font-medium">{files.length}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-6">
                    <span className="text-zinc-500">Total Size</span>
                    <span className="font-medium">{formatSize(totalSize)}</span>
                  </div>

                  {errorCount > 0 && !isUploading && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <p>{errorCount} file(s) failed to upload or validation.</p>
                    </div>
                  )}

                  <Button 
                    className="w-full" 
                    onClick={startUpload}
                    disabled={isUploading || (pendingCount === 0 && errorCount === 0) || !eventName.trim() || !albumName.trim()}
                  >
                    {isUploading ? (
                      <>Uploading {completedCount}/{files.length}...</>
                    ) : errorCount > 0 && pendingCount === 0 ? (
                      <>Retry Failed Uploads</>
                    ) : (
                      <>Start Upload</>
                    )}
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Right Column: Dropzone & Preview */}
          <div className="md:col-span-2 space-y-6">
            {/* Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={cn(
                "relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-3xl transition-all duration-200 cursor-pointer overflow-hidden",
                isDragging 
                  ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 scale-[1.02]" 
                  : "border-zinc-300 dark:border-zinc-700 bg-white/40 dark:bg-zinc-900/40 hover:bg-white/60 dark:hover:bg-zinc-800/50 hover:border-indigo-400 dark:hover:border-indigo-500",
                isUploading && "pointer-events-none opacity-50"
              )}
            >
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileInput}
                disabled={isUploading}
              />
              
              <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                <div className={cn(
                  "w-16 h-16 mb-4 rounded-2xl flex items-center justify-center transition-colors",
                  isDragging ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400" : "bg-white/80 dark:bg-zinc-800/80 text-zinc-500 shadow-sm"
                )}>
                  <UploadCloud className="w-8 h-8" />
                </div>
                <p className="mb-2 text-lg font-semibold text-zinc-700 dark:text-zinc-300">
                  <span className="text-indigo-600 dark:text-indigo-400">Click to upload</span> or drag and drop
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  High-resolution JPEG, PNG, WEBP (Max 50MB per file)
                </p>
              </div>
            </div>

            {/* File Previews */}
            {files.length > 0 && (
              <GlassCard intensity="low" className="p-6 bg-white/60 dark:bg-zinc-900/40">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Selected Photos ({files.length})</h3>
                  {files.length > 0 && !isUploading && (
                    <button 
                      onClick={() => setFiles([])}
                      className="text-sm text-red-500 hover:text-red-600 font-medium"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  <AnimatePresence>
                    {files.map((file) => (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        layout
                        className="relative group aspect-square rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                      >
                        <img 
                          src={file.preview} 
                          alt="preview" 
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Overlay */}
                        <div className={cn(
                          "absolute inset-0 transition-all duration-200",
                          file.status === 'pending' ? "bg-black/40 opacity-0 group-hover:opacity-100" : 
                          file.status === 'error' ? "bg-black/70 opacity-100" :
                          "bg-black/60 opacity-100"
                        )}>
                          {(file.status === 'pending' || file.status === 'error') && !isUploading && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                              className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg z-10"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}

                          {file.status === 'uploading' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mb-2">
                                <motion.div 
                                  className="h-full bg-indigo-500"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${file.progress}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-white">{file.progress}%</span>
                            </div>
                          )}

                          {file.status === 'completed' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring" }}
                              >
                                <CheckCircle2 className="w-8 h-8 text-emerald-400 drop-shadow-lg" />
                              </motion.div>
                            </div>
                          )}

                          {file.status === 'error' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                              <AlertCircle className="w-6 h-6 text-red-400 mb-1" />
                              <span className="text-[10px] font-medium text-red-200 leading-tight mb-2">
                                {file.errorMessage || 'Upload failed'}
                              </span>
                              {!isUploading && file.file.size <= MAX_FILE_SIZE && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); retryFile(file.id); }}
                                  className="flex items-center gap-1 text-[10px] bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-md transition-colors"
                                >
                                  <RefreshCw className="w-3 h-3" /> Retry
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
