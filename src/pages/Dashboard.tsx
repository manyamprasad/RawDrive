import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Camera, LogOut, Plus, Image as ImageIcon, Share2, Settings, HardDrive, Zap, MapPin, Folder, Trash2, User, Building, Pencil, Video } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy, getDocs, deleteDoc, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '@/firebase';
import { LazyImage } from '@/components/LazyImage';
import RtspPlayer from '@/components/RtspPlayer';

interface Event {
  id: string;
  name: string;
  date: string;
  albums: number;
  coverKey?: string | null;
  createdAt?: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, user: any) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: user?.uid,
      email: user?.email,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'events' | 'live'>('events');
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddingStream, setIsAddingStream] = useState(false);
  const [newStream, setNewStream] = useState({ name: '', rtspUrl: '', eventId: '' });

  const handleStorageSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/storage/sync?userId=${user.uid}`);
      const data = await response.json();
      if (data.success) {
        // Update Firestore with real value from R2
        await updateDoc(doc(db, 'users', user.uid), {
          storageUsed: data.storageUsed
        });
      }
    } catch (error) {
      console.error("Error syncing storage:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const toggleSelection = (eventId: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
    );
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const q = query(
      collection(db, 'events'),
      where('photographerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents: Event[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedEvents.push({
          id: doc.id,
          name: data.name,
          date: new Date(data.createdAt).toLocaleDateString(),
          albums: data.albumCount || 0,
          coverKey: data.coverKey || null,
          createdAt: data.createdAt
        });
      });
      
      // Sort in memory
      fetchedEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setEvents(fetchedEvents);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events', user);
    });

    return () => unsubscribe();
  }, [user, navigate]);

  useEffect(() => {
    if (!user || activeTab !== 'live') return;

    const q = query(
      collection(db, 'live_streams'),
      where('photographerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedStreams: any[] = [];
      snapshot.forEach((doc) => {
        fetchedStreams.push({ id: doc.id, ...doc.data() });
      });
      setLiveStreams(fetchedStreams);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'live_streams', user);
    });

    return () => unsubscribe();
  }, [user, activeTab]);

  const handleAddStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newStream.name || !newStream.rtspUrl) return;

    try {
      const streamId = Math.random().toString(36).substring(2, 15);
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'live_streams', streamId), {
        id: streamId,
        photographerId: user.uid,
        name: newStream.name,
        rtspUrl: newStream.rtspUrl,
        eventId: newStream.eventId || null,
        status: 'active',
        createdAt: new Date().toISOString()
      });
      setIsAddingStream(false);
      setNewStream({ name: '', rtspUrl: '', eventId: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'live_streams', user);
    }
  };

  const handleDeleteStream = async (streamId: string) => {
    if (!user) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Stream',
      message: 'Are you sure you want to delete this live stream configuration?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'live_streams', streamId));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'live_streams', user);
        }
      }
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleDeleteEvent = async (eventId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) return;
    
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Event',
      message: 'Are you sure you want to delete this event and all its albums and photos? This cannot be undone.',
      onConfirm: async () => {
        try {
          // 1. Get all photos for this event to delete from R2
          const eventPhotosQuery = query(collection(db, 'photos'), where('eventId', '==', eventId));
          const eventPhotosSnapshot = await getDocs(eventPhotosQuery);
          
          const photosToDelete = eventPhotosSnapshot.docs.map(doc => doc.data());
          const keysToDelete = photosToDelete.flatMap(p => [p.originalKey, p.webpKey]);
          const totalSizeToDelete = photosToDelete.reduce((sum, p) => sum + (p.size || 0), 0);

          // 2. Delete from R2
          if (keysToDelete.length > 0) {
            await fetch('/api/photos/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ keys: keysToDelete })
            });
          }

          // 3. Delete from Firestore (Photos, Albums, Event)
          const deletePhotoPromises = eventPhotosSnapshot.docs.map(docRef => deleteDoc(docRef.ref));
          await Promise.all(deletePhotoPromises);

          const albumsQuery = query(collection(db, 'albums'), where('eventId', '==', eventId));
          const albumsSnapshot = await getDocs(albumsQuery);
          const deleteAlbumPromises = albumsSnapshot.docs.map(docRef => deleteDoc(docRef.ref));
          await Promise.all(deleteAlbumPromises);
          
          await deleteDoc(doc(db, 'events', eventId));

          // 4. Update user storage
          await updateDoc(doc(db, 'users', user.uid), {
            storageUsed: increment(-totalSizeToDelete)
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'events', user);
        }
      }
    });
  };

  const handleDeleteSelected = async () => {
    if (!user || selectedEvents.length === 0) return;
    
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected Events',
      message: `Are you sure you want to delete ${selectedEvents.length} selected event(s) and all their albums and photos? This cannot be undone.`,
      onConfirm: async () => {
        try {
          for (const eventId of selectedEvents) {
            // 1. Get all albums for this event
            const albumsQuery = query(collection(db, 'albums'), where('eventId', '==', eventId));
            const albumsSnapshot = await getDocs(albumsQuery);
            
            // 2. For each album, delete its photos and then the album itself
            for (const albumDoc of albumsSnapshot.docs) {
              const photosQuery = query(collection(db, 'photos'), where('albumId', '==', albumDoc.id));
              const photosSnapshot = await getDocs(photosQuery);
              
              const deletePhotoPromises = photosSnapshot.docs.map(docRef => deleteDoc(docRef.ref));
              await Promise.all(deletePhotoPromises);
              
              await deleteDoc(albumDoc.ref);
            }
            
            // 3. Delete any remaining photos for this event (just in case)
            const eventPhotosQuery = query(collection(db, 'photos'), where('eventId', '==', eventId));
            const eventPhotosSnapshot = await getDocs(eventPhotosQuery);
            const deleteEventPhotoPromises = eventPhotosSnapshot.docs.map(docRef => deleteDoc(docRef.ref));
            await Promise.all(deleteEventPhotoPromises);
            
            // 4. Delete the event itself
            await deleteDoc(doc(db, 'events', eventId));
          }
          setSelectedEvents([]);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'events', user);
        }
      }
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !editName.trim() || !user) return;
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'events', editingEvent.id), {
        name: editName.trim()
      });
      setEditingEvent(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'events', user);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex text-zinc-900 dark:text-zinc-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Camera className="text-white w-4 h-4" />
          </div>
          <span className="font-bold text-lg">RawDrive</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <button 
            onClick={() => setActiveTab('events')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors",
              activeTab === 'events' 
                ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" 
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
            )}
          >
            <Folder className="w-5 h-5" />
            My Events
          </button>

          <button 
            onClick={() => setActiveTab('live')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors",
              activeTab === 'live' 
                ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" 
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
            )}
          >
            <Video className="w-5 h-5" />
            Live Streams
          </button>

          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Settings</p>
          </div>

          <Link to="/dashboard/profile" className="flex items-center gap-3 px-4 py-3 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-xl font-medium transition-colors">
            <User className="w-5 h-5" />
            Profile
          </Link>
          <Link to="/dashboard/company" className="flex items-center gap-3 px-4 py-3 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-xl font-medium transition-colors">
            <Building className="w-5 h-5" />
            Company Settings
          </Link>
        </nav>

        <div className="p-4">
          <GlassCard intensity="low" className="p-4 bg-white/60 dark:bg-zinc-800/40 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Storage</span>
              <button 
                onClick={handleStorageSync} 
                disabled={isSyncing}
                className={cn("text-zinc-400 hover:text-indigo-500 transition-colors", isSyncing && "animate-spin")}
                title="Sync with Cloudflare R2"
              >
                <Zap className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {profile ? `${formatSize(profile.storageUsed)} / ${formatSize(profile.storageLimit)}` : 'Loading...'}
              </span>
              {profile && (
                <span className="text-[10px] text-zinc-400">
                  {Math.round((profile.storageUsed / profile.storageLimit) * 100)}%
                </span>
              )}
            </div>
            <div className="w-full h-2 bg-zinc-200/50 dark:bg-zinc-700/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500" 
                style={{ width: profile ? `${Math.min(100, (profile.storageUsed / profile.storageLimit) * 100)}%` : '0%' }}
              ></div>
            </div>
            <Link to="/pricing">
              <Button variant="outline" size="sm" className="w-full mt-4 text-xs h-8">
                Upgrade Plan
              </Button>
            </Link>
          </GlassCard>

          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex flex-col">
              <span className="text-sm font-medium truncate max-w-[120px]">{user.displayName || user.email}</span>
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> India
              </span>
            </div>
            <button onClick={handleLogout} className="p-2 text-zinc-500 hover:text-red-500 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-6xl mx-auto">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1">
                {activeTab === 'events' ? `Welcome back, ${(user.displayName || user.email || '').split(' ')[0]}` : 'Live Streams'}
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400">
                {activeTab === 'events' ? 'Manage your premium events and share with clients.' : 'Manage and monitor your live RTSP streams.'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              {activeTab === 'events' ? (
                <>
                  {selectedEvents.length > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={handleDeleteSelected}
                      className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Selected ({selectedEvents.length})
                    </Button>
                  )}
                  <Link to="/upload">
                    <Button className="shrink-0 shadow-lg shadow-indigo-500/20">
                      <Plus className="w-5 h-5 mr-2" /> New Event
                    </Button>
                  </Link>
                </>
              ) : (
                <Button 
                  onClick={() => setIsAddingStream(true)}
                  className="shrink-0 shadow-lg shadow-indigo-500/20"
                >
                  <Plus className="w-5 h-5 mr-2" /> Add Stream
                </Button>
              )}
            </div>
          </header>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : activeTab === 'events' ? (
            events.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Folder className="w-8 h-8 text-zinc-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No events yet</h2>
                <p className="text-zinc-500 mb-6">Create your first event to start organizing albums.</p>
                <Link to="/upload">
                  <Button>Create Event</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <GlassCard intensity="low" className="group overflow-hidden bg-white/60 dark:bg-zinc-900/40 hover:border-indigo-500/50 transition-colors cursor-pointer">
                      <div className="relative h-48 overflow-hidden">
                        <div className="absolute top-3 left-3 z-10">
                          <input 
                            type="checkbox" 
                            checked={selectedEvents.includes(event.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelection(event.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-5 h-5 rounded border-white/40 bg-black/20 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </div>
                        {event.coverKey ? (
                          <LazyImage 
                            photoKey={event.coverKey} 
                            alt={event.name} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <img 
                            src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop" 
                            alt={event.name} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                          <div className="flex gap-2 w-full">
                            <Button variant="glass" size="sm" className="flex-1 h-9 text-xs bg-white/20 hover:bg-white/30 text-white border-white/20">
                              <Share2 className="w-3 h-3 mr-1.5" /> Share
                            </Button>
                            <Link to={`/event/${event.id}`} className="flex-1">
                              <Button variant="primary" size="sm" className="w-full h-9 text-xs shadow-lg shadow-indigo-500/30">
                                View
                              </Button>
                            </Link>
                            <Button 
                              variant="glass" 
                              size="sm" 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingEvent(event);
                                setEditName(event.name);
                              }} 
                              className="w-9 h-9 p-0 text-zinc-300 hover:text-white hover:bg-white/20 border-white/20"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="glass" 
                              size="sm" 
                              onClick={(e) => handleDeleteEvent(event.id, e)} 
                              className="w-9 h-9 p-0 text-red-300 hover:text-red-200 hover:bg-red-500/30 border-white/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="p-5">
                        <h3 className="font-semibold text-lg mb-1 truncate">{event.name}</h3>
                        <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                          <span>{event.date}</span>
                          <span className="flex items-center gap-1"><Folder className="w-3 h-3" /> {event.albums} Albums</span>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            )
          ) : (
            /* Live Streams View */
            <div className="space-y-6">
              {liveStreams.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Video className="w-8 h-8 text-zinc-400" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">No live streams yet</h2>
                  <p className="text-zinc-500 mb-6">Add your first RTSP stream to monitor it here.</p>
                  <Button onClick={() => setIsAddingStream(true)}>Add Stream</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {liveStreams.map((stream, i) => (
                    <motion.div
                      key={stream.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <GlassCard intensity="low" className="p-6 bg-white/60 dark:bg-zinc-900/40">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-xl mb-1">{stream.name}</h3>
                            <p className="text-sm text-zinc-500 font-mono truncate max-w-xs">{stream.rtspUrl}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              stream.status === 'active' ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                            )}>
                              {stream.status}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteStream(stream.id)}
                              className="w-8 h-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="aspect-video bg-black rounded-xl overflow-hidden relative group">
                          <RtspPlayer 
                            streamId={stream.id} 
                            rtspUrl={stream.rtspUrl} 
                            className="w-full h-full" 
                          />
                          <div className="absolute top-4 right-4 animate-pulse flex items-center gap-2 pointer-events-none">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Live</span>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs text-zinc-500">
                            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Low Latency</span>
                            <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" /> 1080p</span>
                          </div>
                          <Button variant="outline" size="sm" className="text-xs">
                            Open in Player
                          </Button>
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Add Stream Modal */}
      {isAddingStream && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Add Live Stream</h2>
              <form onSubmit={handleAddStream}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Stream Name
                    </label>
                    <Input
                      value={newStream.name}
                      onChange={(e) => setNewStream({ ...newStream, name: e.target.value })}
                      placeholder="e.g., Main Hall Camera"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      RTSP URL
                    </label>
                    <Input
                      value={newStream.rtspUrl}
                      onChange={(e) => setNewStream({ ...newStream, rtspUrl: e.target.value })}
                      placeholder="rtsp://username:password@ip:port/stream"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Associate with Event (Optional)
                    </label>
                    <select 
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={newStream.eventId}
                      onChange={(e) => setNewStream({ ...newStream, eventId: e.target.value })}
                    >
                      <option value="">None</option>
                      {events.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsAddingStream(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!newStream.name || !newStream.rtspUrl}>
                    Add Stream
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Edit Event</h2>
              <form onSubmit={handleEditSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Event Name
                    </label>
                    <Input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="e.g., Smith Wedding"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditingEvent(null)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving || !editName.trim()}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

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
    </div>
  );
}
