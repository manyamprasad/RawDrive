import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Search, Share2, Download, Heart, LayoutGrid, Grid2X2, Grid3X3, Loader2, X, ChevronLeft, ChevronRight, Youtube, Plus, UploadCloud, Trash2, Play, Pause, CheckCircle2, Circle, Pencil } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc, setDoc, deleteDoc, increment } from 'firebase/firestore';
import { db } from '@/firebase';
import { LazyImage } from '@/components/LazyImage';
import { getThemeClass } from '@/lib/theme';
import { PhotographerProfile } from '@/types/profile';
import { useAuth } from '@/contexts/AuthContext';

interface Photo {
  id: string;
  webpKey: string;
  originalKey: string;
  likes: number;
  uploadedAt: string;
  isLiked?: boolean;
  size?: number;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

interface Album {
  id: string;
  name: string;
  createdAt: string;
  photoCount: number;
  coverKey?: string | null;
  photographerId: string;
  eventId?: string;
  youtubeUrl?: string;
  youtubeUrls?: string[];
}

import { ShareDialog } from '@/components/ShareDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import JSZip from 'jszip';

export default function AlbumView() {
  const { id } = useParams();
  const { user } = useAuth();
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>('comfortable');
  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState('');
  const [profile, setProfile] = useState<PhotographerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [editAlbumName, setEditAlbumName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isYoutubeDialogOpen, setIsYoutubeDialogOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [youtubeInput, setYoutubeInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPlayingSlideshow, setIsPlayingSlideshow] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { isInstallable, promptInstall } = usePWAInstall();

  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const handlePointerDown = (photoId: string) => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setSelectedPhotoIds(prev => prev.includes(photoId) ? prev.filter(id => id !== photoId) : [...prev, photoId]);
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const togglePhotoSelection = (e: React.MouseEvent, photoId: string) => {
    e.stopPropagation();
    setSelectedPhotoIds(prev =>
      prev.includes(photoId) ? prev.filter(id => id !== photoId) : [...prev, photoId]
    );
  };

  const handleBulkDelete = async () => {
    if (!id || !isOwner || !user) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected Photos',
      message: `Are you sure you want to delete ${selectedPhotoIds.length} photos?`,
      onConfirm: async () => {
        try {
          const selectedPhotos = photos.filter(p => selectedPhotoIds.includes(p.id));
          const keysToDelete = selectedPhotos.flatMap(p => [p.originalKey, p.webpKey]);
          const totalSizeToDelete = selectedPhotos.reduce((sum, p) => sum + (p.size || 0), 0);

          // 1. Delete from R2
          await fetch('/api/photos/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keys: keysToDelete })
          });

          // 2. Delete from Firestore
          const deletePromises = selectedPhotoIds.map(photoId => deleteDoc(doc(db, 'photos', photoId)));
          await Promise.all(deletePromises);
          
          // 3. Update user storage and album count
          await updateDoc(doc(db, 'users', user.uid), {
            storageUsed: increment(-totalSizeToDelete)
          });

          if (album) {
            const newPhotoCount = Math.max(0, album.photoCount - selectedPhotoIds.length);
            await updateDoc(doc(db, 'albums', id), { photoCount: newPhotoCount });
            setAlbum({ ...album, photoCount: newPhotoCount });
          }
          
          setPhotos(prev => prev.filter(p => !selectedPhotoIds.includes(p.id)));
          setSelectedPhotoIds([]);
        } catch (err) {
          console.error("Error deleting photos:", err);
        }
      }
    });
  };

  const handleBulkFavorite = async () => {
    if (!user) return;
    try {
      const updatePromises = selectedPhotoIds.map(async (photoId) => {
        const photo = photos.find(p => p.id === photoId);
        if (photo) await toggleLike(photo);
      });
      await Promise.all(updatePromises);
      setSelectedPhotoIds([]);
    } catch (err) {
      console.error("Error favoriting photos:", err);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedPhotoIds.length === 0) return;
    
    setIsDownloading(true);
    const zip = new JSZip();
    
    try {
      const downloadPromises = selectedPhotoIds.map(async (photoId) => {
        const photo = photos.find(p => p.id === photoId);
        if (!photo) return;
        
        try {
          // Use the proxy endpoint to avoid CORS issues
          const response = await fetch(`/api/images/proxy?key=${photo.originalKey}`);
          if (!response.ok) throw new Error(`Failed to fetch ${photo.originalKey}`);
          
          const blob = await response.blob();
          const fileName = photo.originalKey.split('/').pop() || `photo-${photoId}.jpg`;
          zip.file(fileName, blob);
        } catch (err) {
          console.error(`Failed to fetch photo ${photoId}:`, err);
        }
      });
      
      await Promise.all(downloadPromises);
      
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${album?.name || 'album'}-photos.zip`;
      link.click();
      
      setSelectedPhotoIds([]);
    } catch (error) {
      console.error("Error during bulk download:", error);
      alert("Failed to download photos as ZIP.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEditAlbumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!album || !editAlbumName.trim() || !user || !id) return;
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'albums', id), {
        name: editAlbumName.trim()
      });
      setAlbum(prev => prev ? { ...prev, name: editAlbumName.trim() } : null);
      setEditingAlbum(null);
    } catch (error) {
      console.error("Error updating album:", error);
      alert("Failed to update album.");
    } finally {
      setIsSaving(false);
    }
  };

  const isOwner = user?.uid === album?.photographerId;

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlayingSlideshow && selectedPhotoIndex !== null) {
      interval = setInterval(() => {
        setSelectedPhotoIndex((prev) => {
          if (prev === null) return null;
          if (prev >= photos.length - 1) {
            return 0;
          }
          return prev + 1;
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPlayingSlideshow, selectedPhotoIndex, photos.length]);

  const handleYoutubeSubmit = async () => {
    if (!id || !album || !youtubeInput.trim()) return;
    try {
      const currentUrls = album.youtubeUrls || (album.youtubeUrl ? [album.youtubeUrl] : []);
      const newUrls = [...currentUrls, youtubeInput.trim()];
      await updateDoc(doc(db, 'albums', id), { youtubeUrls: newUrls });
      setAlbum({ ...album, youtubeUrls: newUrls });
      setYoutubeInput('');
      setIsYoutubeDialogOpen(false);
    } catch (err) {
      console.error("Error updating youtube URL:", err);
      // alert("Failed to update YouTube URL");
    }
  };

  const handleDeleteYoutube = async (indexToDelete: number) => {
    if (!id || !album || !isOwner) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Video',
      message: 'Are you sure you want to remove this video?',
      onConfirm: async () => {
        try {
          const currentUrls = album.youtubeUrls || (album.youtubeUrl ? [album.youtubeUrl] : []);
          const newUrls = currentUrls.filter((_, index) => index !== indexToDelete);
          await updateDoc(doc(db, 'albums', id), { youtubeUrls: newUrls });
          setAlbum({ ...album, youtubeUrls: newUrls });
        } catch (err) {
          console.error("Error removing youtube URL:", err);
          // alert("Failed to remove YouTube URL");
        }
      }
    });
  };

  const handleSetCover = async (photoKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id || !album || !isOwner) return;
    try {
      await updateDoc(doc(db, 'albums', id), { coverKey: photoKey });
      setAlbum({ ...album, coverKey: photoKey });
    } catch (err) {
      console.error("Error setting cover photo:", err);
    }
  };

  const handleDeletePhoto = async (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id || !album || !isOwner) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Photo',
      message: 'Are you sure you want to delete this photo?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'photos', photoId));
          const newPhotoCount = Math.max(0, album.photoCount - 1);
          await updateDoc(doc(db, 'albums', id), { photoCount: newPhotoCount });
          setAlbum({ ...album, photoCount: newPhotoCount });
          setPhotos(prev => prev.filter(p => p.id !== photoId));
          if (selectedPhotoIndex !== null) {
            setSelectedPhotoIndex(null);
            setIsPlayingSlideshow(false);
          }
        } catch (err) {
          console.error("Error deleting photo:", err);
          // alert("Failed to delete photo");
        }
      }
    });
  };

  const handleDeleteAlbum = async () => {
    if (!id || !album || !isOwner) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Album',
      message: 'Are you sure you want to delete this entire album? This action cannot be undone and will delete all photos within it.',
      onConfirm: async () => {
        try {
          // Delete all photos in the album
          const photosSnapshot = await getDocs(query(collection(db, 'photos'), where('albumId', '==', id)));
          const deletePromises = photosSnapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletePromises);

          // Delete the album itself
          await deleteDoc(doc(db, 'albums', id));

          // Decrement event albumCount if applicable
          if (album.eventId) {
            try {
              const eventRef = doc(db, 'events', album.eventId);
              const eventDoc = await getDoc(eventRef);
              if (eventDoc.exists()) {
                const currentCount = eventDoc.data().albumCount || 0;
                await updateDoc(eventRef, { albumCount: Math.max(0, currentCount - 1) });
              }
            } catch (e) {
              console.error("Failed to update event album count:", e);
            }
          }

          // Navigate back
          navigate('/dashboard');
        } catch (err) {
          console.error("Error deleting album:", err);
          // alert("Failed to delete album");
        }
      }
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !id || !album || !user) return;
    
    setIsUploading(true);
    const files = Array.from(e.target.files);
    
    let successfulUploads = 0;
    let totalSizeUploaded = 0;
    const newPhotos: Photo[] = [];

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('userId', user.uid);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');

        const data = await response.json();
        const photoId = Math.random().toString(36).substring(2, 15);
        
        const photoDoc = {
          id: photoId,
          albumId: id,
          eventId: album.eventId || '',
          photographerId: user.uid,
          originalKey: data.originalKey,
          webpKey: data.webpKey,
          faces: data.faces || [],
          uploadedAt: new Date().toISOString(),
          likes: 0,
          size: data.size || 0
        };

        await setDoc(doc(db, 'photos', photoId), photoDoc);
        newPhotos.push(photoDoc);
        successfulUploads++;
        totalSizeUploaded += (data.size || 0);
      } catch (err) {
        console.error("Error uploading file:", err);
      }
    }

    if (successfulUploads > 0) {
      // Update user storage
      await updateDoc(doc(db, 'users', user.uid), {
        storageUsed: increment(totalSizeUploaded)
      });

      await updateDoc(doc(db, 'albums', id), {
        photoCount: album.photoCount + successfulUploads,
        ...(album.coverKey ? {} : { coverKey: newPhotos[0].webpKey })
      });
      
      setAlbum(prev => prev ? {
        ...prev,
        photoCount: prev.photoCount + successfulUploads,
        coverKey: prev.coverKey || newPhotos[0].webpKey
      } : null);
      
      setPhotos(prev => [...newPhotos, ...prev].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()));
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleLike = async (photo: Photo) => {
    if (!user || !id) return;

    const newIsLiked = !photo.isLiked;
    const newLikes = newIsLiked ? photo.likes + 1 : photo.likes - 1;

    // Optimistic update
    setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, isLiked: newIsLiked, likes: newLikes } : p));

    try {
      const likeRef = doc(db, 'likes', `${user.uid}_${photo.id}`);
      const photoRef = doc(db, 'photos', photo.id);

      if (newIsLiked) {
        await setDoc(likeRef, { userId: user.uid, photoId: photo.id, albumId: id });
        await updateDoc(photoRef, { likes: newLikes });
      } else {
        await deleteDoc(likeRef);
        await updateDoc(photoRef, { likes: newLikes });
      }
    } catch (err) {
      console.error("Error toggling like:", err);
      // Rollback
      setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, isLiked: photo.isLiked, likes: photo.likes } : p));
      alert("Failed to update like.");
    }
  };

  const getShareUrl = () => {
    if (!album || !id) return window.location.href;
    const slug = album.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const host = window.location.host.replace(/^www\./, '');
    // Generate subdomain URL: https://album-name.domain.com/album/id
    return `${window.location.protocol}//${slug}.${host}/album/${id}`;
  };

  const handleNextPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
  };

  const handlePrevPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    }
  };

  useEffect(() => {
    if (selectedPhotoIndex === null || !photos[selectedPhotoIndex]) return;
    const photoId = photos[selectedPhotoIndex].id;
    
    const fetchComments = async () => {
      try {
        const commentsQuery = query(collection(db, `photos/${photoId}/comments`), orderBy('createdAt', 'asc'));
        const snapshot = await getDocs(commentsQuery);
        const fetchedComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
        setComments(prev => ({ ...prev, [photoId]: fetchedComments }));
      } catch (err) {
        console.error("Error fetching comments:", err);
      }
    };
    
    fetchComments();
  }, [selectedPhotoIndex, photos]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || selectedPhotoIndex === null || !user) return;
    
    const photoId = photos[selectedPhotoIndex].id;
    const commentText = newComment.trim();
    setNewComment('');
    
    try {
      const commentId = Math.random().toString(36).substring(2, 15);
      const commentDoc = {
        id: commentId,
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        text: commentText,
        createdAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, `photos/${photoId}/comments`, commentId), commentDoc);
      
      setComments(prev => ({
        ...prev,
        [photoId]: [...(prev[photoId] || []), commentDoc]
      }));
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  useEffect(() => {
    const fetchAlbumAndPhotos = async () => {
      if (!id) return;
      
      try {
        // Fetch album details
        const albumDoc = await getDoc(doc(db, 'albums', id));
        if (!albumDoc.exists()) {
          setError('Album not found');
          setLoading(false);
          return;
        }
        
        const albumData = albumDoc.data() as Album;
        setAlbum(albumData);

        // Fetch photographer profile
        if (albumData.photographerId) {
          const profileDoc = await getDoc(doc(db, 'profiles', albumData.photographerId));
          if (profileDoc.exists()) {
            setProfile(profileDoc.data() as PhotographerProfile);
          }
        }

        // Fetch photos for this album
        const photosQuery = query(
          collection(db, 'photos'),
          where('albumId', '==', id)
        );
        
        const photosSnapshot = await getDocs(photosQuery);
        
        let likedPhotoIds = new Set<string>();
        if (user) {
          const likesQuery = query(
            collection(db, 'likes'),
            where('userId', '==', user.uid),
            where('albumId', '==', id)
          );
          const likesSnapshot = await getDocs(likesQuery);
          likedPhotoIds = new Set(likesSnapshot.docs.map(doc => doc.data().photoId));
        }

        const fetchedPhotos = photosSnapshot.docs.map(doc => ({
          id: doc.id,
          webpKey: doc.data().webpKey,
          originalKey: doc.data().originalKey,
          likes: doc.data().likes || 0,
          uploadedAt: doc.data().uploadedAt,
          isLiked: likedPhotoIds.has(doc.id)
        }));
        
        // Sort in memory
        fetchedPhotos.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        
        setPhotos(fetchedPhotos);

        if (fetchedPhotos.length > 0) {
          setAlbum(prev => prev ? { ...prev, coverKey: fetchedPhotos[0].webpKey } : null);
        }
      } catch (err) {
        console.error("Error fetching album:", err);
        setError('Failed to load album');
      } finally {
        setLoading(false);
      }
    };

    fetchAlbumAndPhotos();
  }, [id]);

  const densityConfig = {
    compact: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2',
    comfortable: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6',
    spacious: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10'
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <h2 className="text-2xl font-bold mb-4">{error || 'Album not found'}</h2>
        <Link to="/dashboard">
          <Button>Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const themeClass = getThemeClass(profile?.background_theme);

  return (
    <div 
      className={cn("min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 pb-24 transition-colors duration-500", themeClass)}
      style={{ fontFamily: profile?.brand_font || 'Inter, sans-serif' }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-2xl border-b border-white/20 dark:border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {(album.eventId || profile?.slug) ? (
              <Button variant="ghost" size="icon" onClick={() => window.history.length > 2 ? navigate(-1) : navigate(album.eventId ? `/event/${album.eventId}` : `/p/${profile?.slug}`)} className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => window.history.length > 2 ? navigate(-1) : navigate('/')} className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            <Link to={profile?.slug ? `/p/${profile.slug}` : "/"} className="flex items-center gap-2">
              {profile?.avatar_url ? (
                <div className="w-8 h-8 rounded-lg overflow-hidden shadow-lg">
                  <LazyImage photoKey={profile.avatar_url} alt="Logo" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: profile?.brand_color || '#4f46e5' }}
                >
                  <Camera className="text-white w-4 h-4" />
                </div>
              )}
              <span className="font-bold text-lg hidden sm:block">
                {profile?.display_name || 'RawDrive'}
              </span>
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isOwner && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="hidden sm:flex items-center gap-2 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-white/20 dark:border-zinc-800/50"
                  onClick={() => setIsYoutubeDialogOpen(true)}
                >
                  <Youtube className="w-4 h-4" />
                  Add Video
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="sm:hidden bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-white/20 dark:border-zinc-800/50"
                  onClick={() => setIsYoutubeDialogOpen(true)}
                >
                  <Youtube className="w-4 h-4" />
                </Button>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="hidden sm:flex items-center gap-2 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-white/20 dark:border-zinc-800/50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  Add Photos
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="sm:hidden bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-white/20 dark:border-zinc-800/50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                </Button>
              </>
            )}
            {isInstallable && (
              <Button 
                variant="outline" 
                size="sm" 
                className="hidden sm:flex items-center gap-2 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-white/20 dark:border-zinc-800/50"
                onClick={promptInstall}
              >
                <Download className="w-4 h-4" />
                Install App
              </Button>
            )}
            <Link to={`/find-me/${id}`}>
              <Button variant="glass" size="sm" className="bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-600/20 hover:bg-indigo-600/20">
                <Search className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Find My Photos</span>
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="sm" 
              className="hidden sm:flex items-center gap-2 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-white/20 dark:border-zinc-800/50"
              onClick={() => setIsShareOpen(true)}
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="sm:hidden bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-white/20 dark:border-zinc-800/50"
              onClick={() => setIsShareOpen(true)}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Album Hero */}
      <section className="relative h-[40vh] min-h-[300px] flex items-end pb-12 px-6">
        <div className="absolute inset-0 -z-10">
          {album.coverKey ? (
            <LazyImage 
              photoKey={album.coverKey} 
              alt="Album Cover" 
              className="w-full h-full"
            />
          ) : (
            <img 
              src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=2000&auto=format&fit=crop" 
              alt="Album Cover" 
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent"></div>
        </div>
        
        <div className="max-w-7xl mx-auto w-full relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium text-white mb-4 border border-white/30">
              Collection
            </span>
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">{album.name}</h1>
              {isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/70 hover:text-white hover:bg-white/20"
                  onClick={() => {
                    setEditAlbumName(album.name);
                    setEditingAlbum(album);
                  }}
                >
                  <Pencil className="w-5 h-5" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-6 text-zinc-300 text-sm">
              <span>{new Date(album.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span>{photos.length} Photos</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* YouTube Video Section */}
      {(album.youtubeUrls && album.youtubeUrls.length > 0) || album.youtubeUrl ? (
        <section className="max-w-7xl mx-auto px-6 mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {(album.youtubeUrls || (album.youtubeUrl ? [album.youtubeUrl] : [])).map((url, index) => {
            const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/)?.[1];
            return (
              <div key={index} className="relative group cursor-pointer" onClick={() => setSelectedVideoUrl(url)}>
                <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 dark:border-zinc-800/50">
                  <img
                    src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                    alt={`YouTube video ${index + 1}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                    <Play className="w-12 h-12 text-white opacity-80" />
                  </div>
                </div>
                {isOwner && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteYoutube(index); }}
                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-red-500/80 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300"
                    title="Remove Video"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </section>
      ) : null}

      {/* Video Modal */}
      <AnimatePresence>
        {selectedVideoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedVideoUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                width="100%"
                height="100%"
                src={selectedVideoUrl.includes('youtube.com/embed/') ? selectedVideoUrl : selectedVideoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
              <button
                onClick={() => setSelectedVideoUrl(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gallery Grid */}
      <main className="max-w-7xl mx-auto px-6 mt-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <h2 className="text-2xl font-bold tracking-tight">All Photos</h2>
          
          {/* Density Controls */}
          <div className="flex items-center gap-1 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md p-1 rounded-lg border border-white/20 dark:border-zinc-800/50">
            <button 
              onClick={() => setDensity('compact')}
              className={cn(
                "p-2 rounded shadow-sm transition-colors",
                density === 'compact' ? "bg-white/80 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100" : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              )}
              title="Compact View"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setDensity('comfortable')}
              className={cn(
                "p-2 rounded shadow-sm transition-colors",
                density === 'comfortable' ? "bg-white/80 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100" : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              )}
              title="Comfortable View"
            >
              <Grid2X2 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setDensity('spacious')}
              className={cn(
                "p-2 rounded shadow-sm transition-colors",
                density === 'spacious' ? "bg-white/80 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100" : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              )}
              title="Spacious View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className={cn("transition-all duration-500", densityConfig[density])}>
          {photos.map((photo, i) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="relative group"
            >
              <GlassCard 
                intensity="low" 
                className={cn("group relative overflow-hidden rounded-2xl bg-white/60 dark:bg-zinc-900/40 cursor-pointer h-full transition-all", selectedPhotoIds.includes(photo.id) ? "ring-2 ring-blue-500 shadow-lg" : "hover:shadow-md")} 
                onClick={() => {
                  if (!isLongPressRef.current) setSelectedPhotoIndex(i);
                }}
                onPointerDown={() => handlePointerDown(photo.id)}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                <button 
                  onClick={(e) => togglePhotoSelection(e, photo.id)}
                  className={cn(
                    "absolute top-2 left-2 z-10 p-1 rounded-full transition-colors",
                    selectedPhotoIds.includes(photo.id) ? "bg-blue-500 text-white" : "bg-black/20 text-white hover:bg-black/40"
                  )}
                >
                  {selectedPhotoIds.includes(photo.id) ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </button>
                <LazyImage 
                  photoKey={photo.webpKey} 
                  alt={`Photo ${photo.id}`} 
                  className={cn(
                    "w-full object-cover",
                    density === 'compact' ? "aspect-square" : density === 'comfortable' ? "aspect-[4/3]" : "aspect-[3/2]"
                  )}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleLike(photo); }}
                      className={cn(
                        "flex items-center gap-1.5 text-sm font-medium transition-colors",
                        photo.isLiked ? "text-red-500" : "text-white/90 hover:text-white"
                      )}
                    >
                      <Heart className={cn("w-4 h-4", photo.isLiked && "fill-current")} /> {photo.likes}
                    </button>
                    <button className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </GlassCard>
              {isOwner && (
                <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                  <button
                    onClick={(e) => handleSetCover(photo.webpKey, e)}
                    className="px-3 py-1.5 bg-black/50 hover:bg-indigo-500/80 text-white text-xs font-medium rounded-full backdrop-blur-md transition-colors"
                    title="Set as Cover"
                  >
                    Set as Cover
                  </button>
                  <button
                    onClick={(e) => handleDeletePhoto(photo.id, e)}
                    className="p-2 bg-black/50 hover:bg-red-500/80 text-white rounded-full backdrop-blur-md transition-colors"
                    title="Delete Photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </main>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedPhotoIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center transition-cursor duration-300",
              !showControls && "cursor-none"
            )}
            onMouseMove={() => {
              setShowControls(true);
              if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
              controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2500);
            }}
            onMouseLeave={() => {
              if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
              setShowControls(false);
            }}
          >
            <div className={cn(
              "absolute top-6 right-6 flex items-center gap-4 z-50 transition-opacity duration-300",
              showControls ? "opacity-100" : "opacity-0"
            )}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlayingSlideshow(!isPlayingSlideshow);
                }}
                className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                title={isPlayingSlideshow ? "Pause Slideshow" : "Play Slideshow"}
              >
                {isPlayingSlideshow ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPhotoIndex(null);
                  setIsPlayingSlideshow(false);
                }}
                className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {selectedPhotoIndex > 0 && (
              <button 
                onClick={(e) => { e.stopPropagation(); handlePrevPhoto(); }}
                className={cn(
                  "absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-50 duration-300",
                  showControls ? "opacity-100" : "opacity-0"
                )}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {selectedPhotoIndex < photos.length - 1 && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleNextPhoto(); }}
                className={cn(
                  "absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-50 duration-300",
                  showControls ? "opacity-100" : "opacity-0"
                )}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            <div className="w-full h-full max-w-7xl mx-auto p-4 md:p-12 flex flex-col items-center justify-start overflow-y-auto" onClick={() => setSelectedPhotoIndex(null)}>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative max-w-full mt-12 mb-24 flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <LazyImage 
                  photoKey={photos[selectedPhotoIndex].webpKey} 
                  alt={`Photo ${photos[selectedPhotoIndex].id}`} 
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
                />
                
                <div className={cn(
                  "w-full flex items-center justify-between text-white/80 mt-4 transition-opacity duration-300",
                  showControls ? "opacity-100" : "opacity-0"
                )}>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => toggleLike(photos[selectedPhotoIndex])}
                      className={cn(
                        "flex items-center gap-2 transition-colors",
                        photos[selectedPhotoIndex].isLiked ? "text-red-500" : "text-white/80 hover:text-white"
                      )}
                    >
                      <Heart className={cn("w-5 h-5", photos[selectedPhotoIndex].isLiked && "fill-current")} /> {photos[selectedPhotoIndex].likes}
                    </button>
                    <span className="text-sm text-white/50">
                      © {new Date(photos[selectedPhotoIndex].uploadedAt).getFullYear()} {profile?.display_name || (profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : 'Photographer')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {isOwner && (
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const response = await fetch(`/api/images/url?key=${encodeURIComponent(photos[selectedPhotoIndex].originalKey)}`);
                            if (response.ok) {
                              const data = await response.json();
                              if (navigator.share) {
                                await navigator.share({
                                  title: `Photo from ${album.name}`,
                                  url: data.url
                                });
                              } else {
                                await navigator.clipboard.writeText(data.url);
                                // Optional: You could use a toast here instead of alert
                                alert('Link copied to clipboard!');
                              }
                            }
                          } catch (err) {
                            console.error("Failed to share photo", err);
                          }
                        }}
                        className="flex items-center gap-2 hover:text-white transition-colors"
                      >
                        <Share2 className="w-5 h-5" /> Share
                      </button>
                    )}
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const response = await fetch(`/api/images/url?key=${encodeURIComponent(photos[selectedPhotoIndex].originalKey)}`);
                          if (response.ok) {
                            const data = await response.json();
                            window.open(data.url, '_blank');
                          }
                        } catch (err) {
                          console.error("Failed to get download URL", err);
                        }
                      }}
                      className="flex items-center gap-2 hover:text-white transition-colors"
                    >
                      <Download className="w-5 h-5" /> Download Original
                    </button>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="w-full max-w-2xl mt-8 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                  <h3 className="text-white font-semibold mb-4">Comments</h3>
                  <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
                    {comments[photos[selectedPhotoIndex].id]?.map(comment => (
                      <div key={comment.id} className="bg-black/20 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white/90 font-medium text-sm">{comment.userName}</span>
                          <span className="text-white/50 text-xs">{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-white/80 text-sm">{comment.text}</p>
                      </div>
                    ))}
                    {(!comments[photos[selectedPhotoIndex].id] || comments[photos[selectedPhotoIndex].id].length === 0) && (
                      <p className="text-white/50 text-sm italic">No comments yet. Be the first to comment!</p>
                    )}
                  </div>
                  
                  {user ? (
                    <form onSubmit={handleAddComment} className="flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <Button type="submit" disabled={!newComment.trim()} className="shrink-0">
                        Post
                      </Button>
                    </form>
                  ) : (
                    <p className="text-white/50 text-sm text-center">Please sign in to leave a comment.</p>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ShareDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        url={getShareUrl()}
        title={album.name}
      />

      {/* YouTube Dialog */}
      <AnimatePresence>
        {isYoutubeDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold">Add YouTube Video</h3>
                  <button 
                    onClick={() => setIsYoutubeDialogOpen(false)}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">YouTube URL</label>
                    <input
                      type="text"
                      value={youtubeInput}
                      onChange={(e) => setYoutubeInput(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setIsYoutubeDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleYoutubeSubmit}>
                      Save Video
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={() => {
          confirmDialog.onConfirm();
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Edit Album Modal */}
      {editingAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-zinc-200 dark:border-zinc-800"
          >
            <h3 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Edit Album Name</h3>
            <form onSubmit={handleEditAlbumSubmit}>
              <div className="mb-6">
                <Input
                  value={editAlbumName}
                  onChange={(e) => setEditAlbumName(e.target.value)}
                  placeholder="Album Name"
                  className="w-full"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingAlbum(null)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!editAlbumName.trim() || isSaving || editAlbumName.trim() === editingAlbum.name}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {/* Bulk Actions Floating Bar */}
      <AnimatePresence>
        {selectedPhotoIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-2xl"
          >
            <span className="text-sm font-medium px-2">{selectedPhotoIds.length} selected</span>
            <Button variant="ghost" size="sm" onClick={handleBulkFavorite}><Heart className="w-4 h-4 mr-2" /> Favorite</Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBulkDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download
            </Button>
            <Button variant="ghost" size="sm" className="text-red-500" onClick={handleBulkDelete}><Trash2 className="w-4 h-4 mr-2" /> Delete</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedPhotoIds([])}><X className="w-4 h-4" /></Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
