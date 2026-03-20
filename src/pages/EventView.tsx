import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { motion } from 'motion/react';
import { Camera, Share2, Image as ImageIcon, Loader2, Folder, ChevronLeft, Download, Trash2, Pencil } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { doc, getDoc, collection, query, where, getDocs, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { getThemeClass } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { LazyImage } from '@/components/LazyImage';
import { PhotographerProfile } from '@/types/profile';
import { useAuth } from '@/contexts/AuthContext';

interface Album {
  id: string;
  name: string;
  photoCount: number;
  createdAt: string;
  coverKey?: string | null;
}

interface Event {
  id: string;
  name: string;
  date: string;
  albumCount: number;
  coverKey?: string | null;
  photographerId: string;
}

import { ShareDialog } from '@/components/ShareDialog';

export default function EventView() {
  const { id } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbums, setSelectedAlbums] = useState<string[]>([]);
  const [profile, setProfile] = useState<PhotographerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editEventName, setEditEventName] = useState('');
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const navigate = useNavigate();
  const { isInstallable, promptInstall } = usePWAInstall();
  const { user } = useAuth();

  const isOwner = user?.uid === event?.photographerId;

  const toggleSelection = (albumId: string) => {
    setSelectedAlbums(prev => 
      prev.includes(albumId) ? prev.filter(id => id !== albumId) : [...prev, albumId]
    );
  };

  const handleDeleteSelected = async () => {
    if (!id || !isOwner || selectedAlbums.length === 0) return;
    
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected Albums',
      message: `Are you sure you want to delete ${selectedAlbums.length} selected album(s) and all their photos? This cannot be undone.`,
      onConfirm: async () => {
        try {
          for (const albumId of selectedAlbums) {
            // 1. Delete all photos in the album
            const photosQuery = query(collection(db, 'photos'), where('albumId', '==', albumId));
            const photosSnapshot = await getDocs(photosQuery);
            
            const deletePhotoPromises = photosSnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePhotoPromises);
            
            // 2. Delete the album itself
            await deleteDoc(doc(db, 'albums', albumId));
          }
          
          // 3. Update event album count
          const newAlbumCount = Math.max(0, (event?.albumCount || 0) - selectedAlbums.length);
          await updateDoc(doc(db, 'events', id), { albumCount: newAlbumCount });
          
          // Update local state
          setAlbums(prev => prev.filter(a => !selectedAlbums.includes(a.id)));
          setEvent(prev => prev ? { ...prev, albumCount: newAlbumCount } : null);
          setSelectedAlbums([]);
          
        } catch (error) {
          console.error("Error deleting selected albums:", error);
          alert("Failed to delete some albums.");
        }
      }
    });
  };

  const handleDeleteAlbum = async (albumId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!id || !isOwner) return;
    
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Album',
      message: 'Are you sure you want to delete this album and all its photos? This cannot be undone.',
      onConfirm: async () => {
        try {
          // 1. Delete all photos in the album
          const photosQuery = query(collection(db, 'photos'), where('albumId', '==', albumId));
          const photosSnapshot = await getDocs(photosQuery);
          
          const deletePhotoPromises = photosSnapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletePhotoPromises);
          
          // 2. Delete the album itself
          await deleteDoc(doc(db, 'albums', albumId));
          
          // 3. Update event album count
          const newAlbumCount = Math.max(0, (event?.albumCount || 0) - 1);
          await updateDoc(doc(db, 'events', id), { albumCount: newAlbumCount });
          
          // Update local state
          setAlbums(prev => prev.filter(a => a.id !== albumId));
          setEvent(prev => prev ? { ...prev, albumCount: newAlbumCount } : null);
          
        } catch (error) {
          console.error("Error deleting album:", error);
          alert("Failed to delete album.");
        }
      }
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlbum || !editName.trim() || !user) return;
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'albums', editingAlbum.id), {
        name: editName.trim()
      });
      setAlbums(prev => prev.map(a => a.id === editingAlbum.id ? { ...a, name: editName.trim() } : a));
      setEditingAlbum(null);
    } catch (error) {
      console.error("Error updating album:", error);
      alert("Failed to update album.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !editEventName.trim() || !user || !id) return;
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'events', id), {
        name: editEventName.trim()
      });
      setEvent(prev => prev ? { ...prev, name: editEventName.trim() } : null);
      setEditingEvent(null);
    } catch (error) {
      console.error("Error updating event:", error);
      alert("Failed to update event.");
    } finally {
      setIsSaving(false);
    }
  };

  const getShareUrl = () => {
    if (!event || !id) return window.location.href;
    const slug = event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const host = window.location.host.replace(/^www\./, '');
    return `${window.location.protocol}//${slug}.${host}/event/${id}`;
  };

  useEffect(() => {
    const fetchEventAndAlbums = async () => {
      if (!id) return;
      
      try {
        // Fetch event details
        const eventDoc = await getDoc(doc(db, 'events', id));
        if (!eventDoc.exists()) {
          setError('Event not found');
          setLoading(false);
          return;
        }
        
        const eventData = eventDoc.data() as Event;
        setEvent(eventData);

        // Fetch photographer profile
        if (eventData.photographerId) {
          const profileDoc = await getDoc(doc(db, 'profiles', eventData.photographerId));
          if (profileDoc.exists()) {
            setProfile(profileDoc.data() as PhotographerProfile);
          }
        }

        // Fetch albums for this event
        const albumsQuery = query(
          collection(db, 'albums'),
          where('eventId', '==', id)
        );
        
        const albumsSnapshot = await getDocs(albumsQuery);
        const fetchedAlbums = albumsSnapshot.docs.map((albumDoc) => {
          return {
            id: albumDoc.id,
            name: albumDoc.data().name,
            photoCount: albumDoc.data().photoCount || 0,
            createdAt: albumDoc.data().createdAt,
            coverKey: albumDoc.data().coverKey || null
          };
        });
        
        fetchedAlbums.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        setAlbums(fetchedAlbums.map(a => ({
          ...a,
          createdAt: new Date(a.createdAt).toLocaleDateString()
        })));
      } catch (err) {
        console.error("Error fetching event:", err);
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    fetchEventAndAlbums();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <h2 className="text-2xl font-bold mb-4">{error || 'Event not found'}</h2>
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
            {profile?.slug ? (
              <Button variant="ghost" size="icon" onClick={() => window.history.length > 2 ? navigate(-1) : navigate(`/p/${profile.slug}`)} className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20">
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

      {/* Event Hero */}
      <section className="relative h-[40vh] min-h-[300px] flex items-end pb-12 px-6">
        <div className="absolute inset-0 -z-10">
          {event.coverKey ? (
            <LazyImage 
              photoKey={event.coverKey} 
              alt="Event Cover" 
              className="w-full h-full object-cover"
            />
          ) : (
            <img 
              src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=2000&auto=format&fit=crop" 
              alt="Event Cover" 
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
              Event
            </span>
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">{event.name}</h1>
              {isOwner && (
                <Button
                  variant="glass"
                  size="icon"
                  onClick={() => {
                    setEditingEvent(event);
                    setEditEventName(event.name);
                  }}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <Pencil className="w-5 h-5" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-6 text-zinc-300 text-sm">
              <span>{new Date(event.date).toLocaleDateString()}</span>
              <span>•</span>
              <span>{albums.length} Albums</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Albums Grid */}
      <main className="max-w-7xl mx-auto px-6 mt-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Albums</h2>
          {selectedAlbums.length > 0 && isOwner && (
            <Button 
              variant="outline" 
              onClick={handleDeleteSelected}
              className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/50"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete Selected ({selectedAlbums.length})
            </Button>
          )}
        </div>

        {albums.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Folder className="w-8 h-8 text-zinc-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No albums yet</h2>
            <p className="text-zinc-500 mb-6">This event has no albums.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {albums.map((album, i) => (
              <motion.div
                key={album.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link to={`/album/${album.id}`} className="block">
                  <GlassCard intensity="low" className="group overflow-hidden bg-white/60 dark:bg-zinc-900/40 hover:border-indigo-500/50 transition-colors cursor-pointer">
                    <div className="relative h-48 overflow-hidden">
                      {isOwner && (
                        <div className="absolute top-3 left-3 z-10">
                          <input 
                            type="checkbox" 
                            checked={selectedAlbums.includes(album.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelection(album.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-5 h-5 rounded border-white/40 bg-black/20 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </div>
                      )}
                      <LazyImage 
                        photoKey={album.coverKey} 
                        alt={album.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <div className="flex gap-2 w-full justify-end">
                          {isOwner && (
                            <div className="flex gap-2">
                              <Button 
                                variant="glass" 
                                size="sm" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingAlbum(album);
                                  setEditName(album.name);
                                }} 
                                className="w-9 h-9 p-0 text-white hover:text-indigo-200 hover:bg-indigo-500/30 border-white/20"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="glass" 
                                size="sm" 
                                onClick={(e) => handleDeleteAlbum(album.id, e)} 
                                className="w-9 h-9 p-0 text-red-300 hover:text-red-200 hover:bg-red-500/30 border-white/20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-lg mb-1 truncate">{album.name}</h3>
                      <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                        <span>{album.createdAt}</span>
                        <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> {album.photoCount} Photos</span>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <ShareDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        url={getShareUrl()}
        title={event.name}
      />

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
            <form onSubmit={handleEditSubmit}>
              <div className="mb-6">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
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
                  disabled={!editName.trim() || isSaving || editName.trim() === editingAlbum.name}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-zinc-200 dark:border-zinc-800"
          >
            <h3 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Edit Event Name</h3>
            <form onSubmit={handleEditEventSubmit}>
              <div className="mb-6">
                <Input
                  value={editEventName}
                  onChange={(e) => setEditEventName(e.target.value)}
                  placeholder="Event Name"
                  className="w-full"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingEvent(null)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!editEventName.trim() || isSaving || editEventName.trim() === editingEvent.name}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
