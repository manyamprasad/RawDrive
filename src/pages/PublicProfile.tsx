import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { PhotographerProfile } from '@/types/profile';
import { MapPin, Globe, Mail, Phone, Instagram, Twitter, Facebook, Youtube, Camera, Calendar, Linkedin, Video, Image as ImageIcon, MessageCircle, ChevronLeft, Share2, Download, Folder } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { getThemeClass } from '@/lib/theme';
import { cn, normalizeUrl, normalizeSocialUrl } from '@/lib/utils';
import { LazyImage } from '@/components/LazyImage';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function PublicProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<PhotographerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const navigate = useNavigate();
  const { isInstallable, promptInstall } = usePWAInstall();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!slug) return;
      try {
        const q = query(collection(db, 'profiles'), where('slug', '==', slug));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const profileData = querySnapshot.docs[0].data() as PhotographerProfile;
          
          if (profileData.is_public === false) {
            setError('Profile not found or is private.');
            setLoading(false);
            return;
          }
          
          setProfile(profileData);
          
          // Fetch public events
          const eventsQuery = query(
            collection(db, 'events'),
            where('photographerId', '==', profileData.user_id),
            where('isPublic', '==', true)
          );
          const eventsSnapshot = await getDocs(eventsQuery);
          const fetchedEvents = eventsSnapshot.docs
            .map(doc => doc.data())
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setEvents(fetchedEvents);
        } else {
          setError('Profile not found or is private.');
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
        <Camera className="w-16 h-16 text-zinc-700 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Profile Not Found</h1>
        <p className="text-zinc-400 mb-6">{error || "This profile doesn't exist."}</p>
        <Link to="/">
          <Button variant="outline">Return Home</Button>
        </Link>
      </div>
    );
  }

  const brandColor = profile.brand_color || '#4f46e5';
  const themeClass = profile.background_theme ? getThemeClass(profile.background_theme) : 'bg-neutral-950';

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: profile.display_name || 'Photographer Profile',
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        // Could add a toast here
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <div 
      className={cn("min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-500", themeClass)}
      style={{ fontFamily: profile.brand_font || 'Inter, sans-serif' }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-2xl border-b border-white/20 dark:border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => window.history.length > 2 ? navigate(-1) : navigate('/')} className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              {profile.logo_url && profile.privacy_settings?.show_logo === true ? (
                <div className="w-8 h-8 rounded-lg overflow-hidden shadow-lg">
                  <LazyImage photoKey={profile.logo_url} alt="Logo" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: brandColor }}
                >
                  <Camera className="text-white w-4 h-4" />
                </div>
              )}
              <span className="font-bold text-lg hidden sm:block">
                {profile.privacy_settings?.show_display_name && profile.display_name 
                  ? profile.display_name 
                  : `${profile.privacy_settings?.show_first_name ? (profile.first_name || '') : ''} ${profile.privacy_settings?.show_last_name ? (profile.last_name || '') : ''}`.trim() || 'Photographer'}
              </span>
            </div>
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
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="sm:hidden bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-white/20 dark:border-zinc-800/50"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative h-[40vh] min-h-[300px] flex items-end">
        <div className="absolute inset-0 z-0">
          {profile.avatar_url && profile.privacy_settings?.show_avatar ? (
            <>
              <LazyImage 
                photoKey={profile.avatar_url} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 via-zinc-50/50 to-transparent dark:from-zinc-950 dark:via-zinc-950/50" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 dark:from-indigo-500/10 dark:to-purple-500/10" />
          )}
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <div className="flex items-center gap-6 mb-6">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white dark:border-zinc-900 shadow-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                {profile.avatar_url && profile.privacy_settings?.show_avatar ? (
                  <LazyImage photoKey={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-400 dark:text-zinc-500" />
                )}
              </div>
              <div>
                <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-2 text-zinc-900 dark:text-white">
                  {profile.privacy_settings?.show_display_name && profile.display_name 
                    ? profile.display_name 
                    : `${profile.privacy_settings?.show_first_name ? (profile.first_name || '') : ''} ${profile.privacy_settings?.show_last_name ? (profile.last_name || '') : ''}`.trim() || 'Photographer'}
                </h1>
                {profile.profile_title && profile.privacy_settings?.show_profile_title === true && (
                  <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-300 font-medium">
                    {profile.profile_title}
                  </p>
                )}
              </div>
            </div>
            
            {profile.tagline && profile.privacy_settings?.show_tagline === true && (
              <p className="text-lg text-zinc-700 dark:text-zinc-300 mb-4 max-w-2xl">{profile.tagline}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
              {profile.location && profile.privacy_settings?.show_location === true && (
                profile.google_maps_url ? (
                  <a href={normalizeUrl(profile.google_maps_url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-white/50 dark:bg-white/5 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition-colors backdrop-blur-md">
                    <MapPin className="w-4 h-4" /> {profile.location}
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 bg-white/50 dark:bg-white/5 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-white/10 backdrop-blur-md">
                    <MapPin className="w-4 h-4" /> {profile.location}
                  </span>
                )
              )}
              {profile.website && profile.privacy_settings?.show_website === true && (
                <a href={normalizeUrl(profile.website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-white/50 dark:bg-white/5 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition-colors backdrop-blur-md">
                  <Globe className="w-4 h-4" /> Website
                </a>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Bio & Details */}
          <div className="lg:col-span-2 space-y-8">
            {profile.bio && profile.privacy_settings?.show_bio === true && (
              <section className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-8 shadow-sm">
                <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-white">About</h2>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {profile.bio}
                </p>
              </section>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {profile.categories && profile.categories.length > 0 && profile.privacy_settings?.show_categories === true && (
                <section className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.categories.map((cat, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-black/5 dark:bg-white/10 rounded-full text-sm font-medium text-zinc-700 dark:text-zinc-300">{cat}</span>
                    ))}
                  </div>
                </section>
              )}
              
              {profile.service_areas && profile.service_areas.length > 0 && profile.privacy_settings?.show_service_areas === true && (
                <section className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4">Service Areas</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.service_areas.map((area, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-black/5 dark:bg-white/10 rounded-full text-sm font-medium text-zinc-700 dark:text-zinc-300">{area}</span>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {profile.tags && profile.tags.length > 0 && profile.privacy_settings?.show_tags === true && (
              <section className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.tags.map((tag, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-black/5 dark:bg-white/10 rounded-full text-sm font-medium text-zinc-700 dark:text-zinc-300">#{tag}</span>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Contact & Links */}
          <div className="space-y-6">
            <section className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-6 text-zinc-900 dark:text-white">Contact & Booking</h3>
              
              <div className="space-y-3">
                {profile.email && profile.privacy_settings?.show_email === true && (
                  <a href={`mailto:${profile.email}`} className="block">
                    <Button className="w-full py-6 rounded-2xl font-semibold text-white shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2" style={{ backgroundColor: brandColor }}>
                      <Mail className="w-5 h-5" /> Email Me
                    </Button>
                  </a>
                )}
                
                {profile.phone && profile.privacy_settings?.show_phone === true && (
                  <a href={`tel:${profile.phone}`} className="block">
                    <Button variant="outline" className="w-full py-6 rounded-2xl font-semibold bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md border-zinc-200 dark:border-zinc-700 transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2">
                      <Phone className="w-5 h-5" /> Call Me
                    </Button>
                  </a>
                )}
                
                {profile.booking_calendar_url && profile.privacy_settings?.show_booking === true && (
                  <a href={normalizeUrl(profile.booking_calendar_url)} target="_blank" rel="noopener noreferrer" className="block">
                    <Button variant="outline" className="w-full py-6 rounded-2xl font-semibold bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md border-zinc-200 dark:border-zinc-700 transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2">
                      <Calendar className="w-5 h-5" /> Book Session
                    </Button>
                  </a>
                )}
              </div>

              {/* Secondary Contacts */}
              {((profile.secondary_emails && profile.secondary_emails.length > 0 && profile.privacy_settings?.show_secondary_emails === true) || 
                (profile.secondary_phones && profile.secondary_phones.length > 0 && profile.privacy_settings?.show_secondary_phones === true)) && (
                <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                  {profile.secondary_emails && profile.privacy_settings?.show_secondary_emails === true && profile.secondary_emails.map((email, idx) => (
                    <a key={`email-${idx}`} href={`mailto:${email.value}`} className="block">
                      <div className="w-full p-3 rounded-xl font-medium text-zinc-700 dark:text-zinc-300 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-3 text-sm">
                        <Mail className="w-4 h-4 text-zinc-500" /> {email.label || email.value}
                      </div>
                    </a>
                  ))}
                  {profile.secondary_phones && profile.privacy_settings?.show_secondary_phones === true && profile.secondary_phones.map((phone, idx) => (
                    <a key={`phone-${idx}`} href={`tel:${phone.value}`} className="block">
                      <div className="w-full p-3 rounded-xl font-medium text-zinc-700 dark:text-zinc-300 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-3 text-sm">
                        <Phone className="w-4 h-4 text-zinc-500" /> {phone.label || phone.value}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </section>

            {/* Links */}
            {profile.custom_links && profile.custom_links.length > 0 && profile.privacy_settings?.show_custom_links === true && (
              <section className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-white">Links</h3>
                <div className="space-y-3">
                  {profile.custom_links.map((link, idx) => (
                    <a 
                      key={idx} 
                      href={normalizeUrl(link.url)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block w-full p-4 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-2xl transition-all hover:translate-x-1 flex items-center justify-between group"
                    >
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">{link.label}</span>
                      <span className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center group-hover:bg-black/10 dark:group-hover:bg-white/20 transition-colors">
                        →
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Socials */}
            {profile.socials && Object.keys(profile.socials).length > 0 && profile.privacy_settings?.show_socials === true && (
              <section className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-white">Social Media</h3>
                <div className="flex flex-wrap gap-3">
                  {profile.socials.instagram && profile.privacy_settings?.socials?.instagram === true && (
                    <a href={normalizeSocialUrl('instagram', profile.socials.instagram)} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white transition-all">
                      <Instagram className="w-5 h-5" />
                    </a>
                  )}
                  {profile.socials.twitter && profile.privacy_settings?.socials?.twitter === true && (
                    <a href={normalizeSocialUrl('twitter', profile.socials.twitter)} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white transition-all">
                      <Twitter className="w-5 h-5" />
                    </a>
                  )}
                  {profile.socials.facebook && profile.privacy_settings?.socials?.facebook === true && (
                    <a href={normalizeSocialUrl('facebook', profile.socials.facebook)} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white transition-all">
                      <Facebook className="w-5 h-5" />
                    </a>
                  )}
                  {profile.socials.youtube && profile.privacy_settings?.socials?.youtube === true && (
                    <a href={normalizeSocialUrl('youtube', profile.socials.youtube)} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white transition-all">
                      <Youtube className="w-5 h-5" />
                    </a>
                  )}
                  {profile.socials.linkedin && profile.privacy_settings?.socials?.linkedin === true && (
                    <a href={normalizeSocialUrl('linkedin', profile.socials.linkedin)} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white transition-all">
                      <Linkedin className="w-5 h-5" />
                    </a>
                  )}
                  {profile.socials.tiktok && profile.privacy_settings?.socials?.tiktok === true && (
                    <a href={normalizeSocialUrl('tiktok', profile.socials.tiktok)} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white transition-all">
                      <Video className="w-5 h-5" />
                    </a>
                  )}
                  {profile.socials.pinterest && profile.privacy_settings?.socials?.pinterest === true && (
                    <a href={normalizeSocialUrl('pinterest', profile.socials.pinterest)} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white transition-all">
                      <ImageIcon className="w-5 h-5" />
                    </a>
                  )}
                  {profile.socials.whatsapp && profile.privacy_settings?.socials?.whatsapp === true && (
                    <a href={normalizeSocialUrl('whatsapp', profile.socials.whatsapp)} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white transition-all">
                      <MessageCircle className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      {/* Public Albums */}
      {events.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-12 border-t border-zinc-200 dark:border-zinc-800/50">
          <h2 className="text-2xl font-bold tracking-tight mb-8 text-zinc-900 dark:text-white">Public Galleries</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link to={`/event/${event.id}`}>
                  <div className="group overflow-hidden bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800/50 rounded-3xl hover:border-indigo-500/50 transition-colors cursor-pointer shadow-sm">
                    <div className="relative h-48 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                      {event.coverKey ? (
                        <LazyImage 
                          photoKey={event.coverKey} 
                          alt={event.name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Folder className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <Button variant="primary" size="sm" className="w-full h-9 text-xs shadow-lg shadow-indigo-500/30">
                          View Gallery
                        </Button>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-lg mb-1 truncate text-zinc-900 dark:text-white">{event.name}</h3>
                      <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> {event.albumCount || 0} Albums</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 text-center text-zinc-500 dark:text-zinc-400 text-sm border-t border-zinc-200 dark:border-zinc-800/50 mt-12">
        Powered by RawDrive
      </footer>
    </div>
  );
}
