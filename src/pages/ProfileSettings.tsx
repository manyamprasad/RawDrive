import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { PhotographerProfile } from '@/types/profile';
import { Camera, Save, Globe, MapPin, Link as LinkIcon, Palette, ArrowLeft, Loader2, Upload, Image as ImageIcon, Search, Plus, Trash2, Settings, Share2, Layout, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LazyImage } from '@/components/LazyImage';
import { AvatarCropper } from '@/components/AvatarCropper';
import { getThemeClass, THEME_TEMPLATES } from '@/lib/theme';
import { INDIAN_STATES_CITIES } from '@/constants/locations';
import { cn } from '@/lib/utils';

type TabId = 'identity' | 'branding' | 'contact' | 'location' | 'seo' | 'privacy' | 'extras';

export default function ProfileSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<TabId>('identity');
  
  const [profile, setProfile] = useState<Partial<PhotographerProfile>>({
    first_name: '',
    last_name: '',
    display_name: '',
    profile_title: '',
    tagline: '',
    bio: '',
    slug: '',
    email: '',
    phone: '',
    website: '',
    location: '',
    google_maps_url: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    is_public: true,
    show_qr_code: true,
    show_vcard: true,
    indexable: true,
    custom_domain: '',
    custom_domain_enabled: false,
    brand_color: '#4f46e5',
    background_theme: 'plain-light',
    background_image_url: '',
    theme_id: '',
    avatar_url: '',
    logo_url: '',
    favicon_url: '',
    categories: [],
    socials: {},
    service_areas: [],
    custom_links: [],
    meta_title: '',
    meta_description: '',
    meta_keywords: [],
    pronouns: '',
    language: 'en',
    timezone: '',
    tags: [],
    consent_marketing: false,
    privacy_settings: {
      show_email: false,
      show_phone: false,
      show_website: false,
      show_booking: false,
      show_socials: false,
      show_location: false,
      show_avatar: false,
      show_bio: false,
      show_custom_links: false,
      show_first_name: false,
      show_last_name: false,
      show_display_name: false,
      show_profile_title: false,
      show_tagline: false,
      show_logo: false,
      show_categories: false,
      show_secondary_emails: false,
      show_secondary_phones: false,
      show_address_details: false,
      show_service_areas: false,
      show_pronouns: false,
      show_language: false,
      show_timezone: false,
      show_tags: false,
      socials: {
        instagram: false,
        facebook: false,
        twitter: false,
        linkedin: false,
        youtube: false,
        tiktok: false,
        pinterest: false,
        whatsapp: false,
      }
    },
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'profiles', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as PhotographerProfile;
          setProfile({ 
            ...profile, 
            ...data,
            privacy_settings: {
              ...profile.privacy_settings,
              ...(data.privacy_settings || {})
            }
          });
        } else {
          setProfile(prev => ({
            ...prev,
            email: user.email || '',
            display_name: user.displayName || '',
            slug: user.displayName?.toLowerCase().replace(/\s+/g, '-') || user.uid.slice(0, 8),
          }));
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setProfile(prev => ({ ...prev, [name]: val }));
  };

  const handleSocialChange = (platform: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      socials: {
        ...(prev.socials || {}),
        [platform]: value
      }
    }));
  };

  const handleArrayChange = (field: 'categories' | 'service_areas' | 'tags' | 'meta_keywords', value: string) => {
    // Do not filter(Boolean) here so the user can type a comma and a space
    const arr = value.split(',').map(s => s.trimStart());
    setProfile(prev => ({ ...prev, [field]: arr }));
  };

  const handlePrivacyChange = (field: string, value: boolean) => {
    setProfile(prev => {
      const newPrivacySettings = { ...(prev.privacy_settings || {}) };
      
      if (field.startsWith('socials.')) {
        const socialField = field.split('.')[1] as keyof NonNullable<PhotographerProfile['privacy_settings']['socials']>;
        newPrivacySettings.socials = {
          ...(newPrivacySettings.socials || {}),
          [socialField]: value
        };
      } else {
        (newPrivacySettings as any)[field] = value;
      }
      
      return { ...prev, privacy_settings: newPrivacySettings };
    });
  };

  const VisibilityToggle = ({ checked, onChange, label }: { checked: boolean, onChange: (checked: boolean) => void, label: string }) => (
    <div className="flex items-center justify-between mb-1">
      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</label>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-8 h-4 bg-zinc-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
      </label>
    </div>
  );

  const handleThemeSelect = (themeId: string) => {
    setProfile(prev => ({ ...prev, background_theme: themeId }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setCropImageSrc(reader.result?.toString() || null);
    });
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingBackground(true);
    const formData = new FormData();
    formData.append('photo', file, 'background.jpg');

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}. ${text.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Upload failed with status ${response.status}`);
      }
      
      setProfile(prev => ({ ...prev, background_image_url: data.webpKey }));
    } catch (error: any) {
      console.error("Error uploading background:", error);
      setError(error.message || 'Failed to upload background. Please try again.');
    } finally {
      setUploadingBackground(false);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropImageSrc(null);
    setUploadingAvatar(true);
    
    const formData = new FormData();
    formData.append('photo', croppedBlob, 'avatar.jpg');

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}. ${text.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Upload failed with status ${response.status}`);
      }
      
      setProfile(prev => ({ ...prev, avatar_url: data.webpKey }));
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      setError(error.message || 'Failed to upload avatar. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // Validate custom domain
      if (profile.custom_domain_enabled && profile.custom_domain) {
        const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
        if (!domainRegex.test(profile.custom_domain)) {
          setError('Please enter a valid custom domain (e.g., photos.yourdomain.com).');
          setSaving(false);
          return;
        }
      }

      // Check if slug is unique
      if (profile.slug) {
        const slugQuery = query(collection(db, 'profiles'), where('slug', '==', profile.slug));
        const slugSnapshot = await getDocs(slugQuery);
        const isTaken = !slugSnapshot.empty && slugSnapshot.docs.some(d => d.id !== user.uid);
        if (isTaken) {
          setError('This profile URL (slug) is already taken. Please choose another one.');
          setSaving(false);
          return;
        }
      }

      // Clean up arrays and set name
      const cleanedProfile = { ...profile };
      delete cleanedProfile.id;
      ['categories', 'service_areas', 'tags', 'meta_keywords'].forEach(field => {
        const key = field as keyof PhotographerProfile;
        if (Array.isArray(cleanedProfile[key])) {
          (cleanedProfile as any)[key] = (cleanedProfile[key] as string[]).map(s => s.trim()).filter(Boolean);
        }
      });
      cleanedProfile.name = cleanedProfile.display_name || `${cleanedProfile.first_name || ''} ${cleanedProfile.last_name || ''}`.trim();

      const docRef = doc(db, 'profiles', user.uid);
      await setDoc(docRef, {
        ...cleanedProfile,
        user_id: user.uid,
        updated_at: new Date().toISOString(),
      }, { merge: true });
      setSuccess('Profile saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error saving profile:", error);
      setError(error instanceof Error ? error.message : 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const tabs = [
    { id: 'identity', label: 'Core Identity', icon: Camera },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'contact', label: 'Contact & Social', icon: LinkIcon },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'extras', label: 'Extras', icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {cropImageSrc && (
          <AvatarCropper
            imageSrc={cropImageSrc}
            onClose={() => setCropImageSrc(null)}
            onCropComplete={handleCropComplete}
          />
        )}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Photographer Profile</h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">Manage your public presence and brand.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end md:self-auto">
            <ThemeToggle />
            {profile.slug && (
              <Button variant="outline" onClick={() => window.open(`/p/${profile.slug}`, '_blank')}>
                <Globe className="w-4 h-4 mr-2" /> View Public
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving} className="min-w-[100px]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save</>}
            </Button>
          </div>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="md:col-span-1 space-y-2 flex flex-row md:flex-col overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap",
                    isActive 
                      ? "bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800 text-indigo-600 dark:text-indigo-400" 
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                  )}
                >
                  <Icon className="w-5 h-5" /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Form Content */}
          <div className="md:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                
                {/* CORE IDENTITY */}
                {activeTab === 'identity' && (
                  <GlassCard intensity="low" className="p-6 space-y-6 bg-white dark:bg-zinc-900/50">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Camera className="w-5 h-5 text-indigo-500" /> Core Identity
                    </h2>
                    
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                      <div className="flex flex-col items-center gap-3">
                        <div 
                          className="relative w-32 h-32 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-4 border-white dark:border-zinc-900 shadow-lg cursor-pointer group"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {profile.avatar_url ? (
                            <LazyImage photoKey={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-400">
                              <ImageIcon className="w-10 h-10" />
                            </div>
                          )}
                          
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Camera className="w-8 h-8 text-white" />
                          </div>

                          {uploadingAvatar && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Loader2 className="w-6 h-6 animate-spin text-white" />
                            </div>
                          )}
                        </div>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleAvatarUpload} 
                          accept="image/*" 
                          className="hidden" 
                        />
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
                          <Upload className="w-4 h-4 mr-2" /> Upload Avatar
                        </Button>
                      </div>

                      <div className="flex-1 space-y-4 w-full">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <VisibilityToggle checked={profile.privacy_settings?.show_first_name ?? false} onChange={(checked) => handlePrivacyChange('show_first_name', checked)} label="Show First Name" />
                            <Input name="first_name" value={profile.first_name || ''} onChange={handleChange} placeholder="Jane" />
                          </div>
                          <div className="space-y-2">
                            <VisibilityToggle checked={profile.privacy_settings?.show_last_name ?? false} onChange={(checked) => handlePrivacyChange('show_last_name', checked)} label="Show Last Name" />
                            <Input name="last_name" value={profile.last_name || ''} onChange={handleChange} placeholder="Doe" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <VisibilityToggle checked={profile.privacy_settings?.show_display_name ?? false} onChange={(checked) => handlePrivacyChange('show_display_name', checked)} label="Show Display Name" />
                            <Input name="display_name" value={profile.display_name || ''} onChange={handleChange} placeholder="Jane Doe Photography" />
                          </div>
                          <div className="space-y-2">
                            <VisibilityToggle checked={profile.privacy_settings?.show_profile_title ?? false} onChange={(checked) => handlePrivacyChange('show_profile_title', checked)} label="Show Profile Title" />
                            <Input name="profile_title" value={profile.profile_title || ''} onChange={handleChange} placeholder="Wedding Photographer" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <VisibilityToggle checked={profile.privacy_settings?.show_tagline ?? false} onChange={(checked) => handlePrivacyChange('show_tagline', checked)} label="Show Tagline" />
                      <Input name="tagline" value={profile.tagline || ''} onChange={handleChange} placeholder="Cinematic stories, real emotions" />
                    </div>

                    <div className="space-y-2">
                      <VisibilityToggle checked={profile.privacy_settings?.show_bio ?? false} onChange={(checked) => handlePrivacyChange('show_bio', checked)} label="Show Bio" />
                      <textarea 
                        name="bio" 
                        value={profile.bio || ''} 
                        onChange={handleChange} 
                        rows={4}
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                        placeholder="Tell your story..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Profile Slug URL</label>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 dark:text-zinc-400 text-sm">rawdrive.ai/p/</span>
                          <Input name="slug" value={profile.slug || ''} onChange={handleChange} placeholder="jane-doe" className="flex-1" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <VisibilityToggle checked={profile.privacy_settings?.show_categories ?? false} onChange={(checked) => handlePrivacyChange('show_categories', checked)} label="Show Categories" />
                        <Input 
                          value={profile.categories?.join(', ') || ''} 
                          onChange={(e) => handleArrayChange('categories', e.target.value)} 
                          placeholder="Wedding, Portrait, Editorial" 
                        />
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* BRANDING & VISIBILITY */}
                {activeTab === 'branding' && (
                  <GlassCard intensity="low" className="p-6 space-y-6 bg-white dark:bg-zinc-900/50">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Palette className="w-5 h-5 text-indigo-500" /> Branding & Visibility
                    </h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                        <div>
                          <h3 className="font-medium text-sm">Public Profile</h3>
                          <p className="text-xs text-zinc-500">Visible to anyone with the link.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" name="is_public" checked={profile.is_public ?? true} onChange={handleChange} className="sr-only peer" />
                          <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                        <div>
                          <h3 className="font-medium text-sm">Search Engine Indexing</h3>
                          <p className="text-xs text-zinc-500">Allow Google to find your profile.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" name="indexable" checked={profile.indexable ?? true} onChange={handleChange} className="sr-only peer" />
                          <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                        <div>
                          <h3 className="font-medium text-sm">Show QR Code</h3>
                          <p className="text-xs text-zinc-500">Display downloadable QR.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" name="show_qr_code" checked={profile.show_qr_code ?? true} onChange={handleChange} className="sr-only peer" />
                          <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                        <div>
                          <h3 className="font-medium text-sm">Show vCard</h3>
                          <p className="text-xs text-zinc-500">Allow saving contact info.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" name="show_vcard" checked={profile.show_vcard ?? true} onChange={handleChange} className="sr-only peer" />
                          <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-sm">Custom Domain</h3>
                          <p className="text-xs text-zinc-500">Use your own domain instead of the default.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" name="custom_domain_enabled" checked={profile.custom_domain_enabled ?? false} onChange={handleChange} className="sr-only peer" />
                          <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                      
                      {profile.custom_domain_enabled && (
                        <div className="pt-2">
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Domain Name</label>
                          <Input 
                            type="text" 
                            name="custom_domain" 
                            value={profile.custom_domain || ''} 
                            onChange={handleChange} 
                            placeholder="e.g., photos.yourdomain.com" 
                            className={cn(
                              profile.custom_domain && !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i.test(profile.custom_domain) 
                                ? "border-red-500 focus:ring-red-500" 
                                : ""
                            )}
                          />
                          {profile.custom_domain && !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i.test(profile.custom_domain) && (
                            <p className="text-xs text-red-500 mt-1">Please enter a valid domain name (e.g., photos.yourdomain.com)</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Background Photo</label>
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800">
                          {profile.background_image_url ? (
                            <LazyImage photoKey={profile.background_image_url} alt="Background" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-400">
                              <ImageIcon className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        <input 
                          type="file" 
                          ref={bgFileInputRef} 
                          onChange={handleBackgroundUpload} 
                          accept="image/*" 
                          className="hidden" 
                        />
                        <Button variant="outline" size="sm" onClick={() => bgFileInputRef.current?.click()} disabled={uploadingBackground}>
                          {uploadingBackground ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4 mr-2" /> Upload Background</>}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Background Theme Template</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {THEME_TEMPLATES.map((template) => (
                          <div 
                            key={template.id}
                            onClick={() => handleThemeSelect(template.id)}
                            className={cn(
                              "cursor-pointer rounded-xl border-2 overflow-hidden transition-all duration-200",
                              profile.background_theme === template.id 
                                ? "border-indigo-500 shadow-md scale-105" 
                                : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                            )}
                          >
                            <div className={cn("h-20 w-full", template.class)}></div>
                            <div className="p-2 text-xs font-medium text-center bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
                              {template.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Brand Color (Hex)</label>
                          <div className="flex items-center gap-3">
                            <input type="color" name="brand_color" value={profile.brand_color || '#4f46e5'} onChange={handleChange as any} className="w-10 h-10 rounded cursor-pointer" />
                            <Input name="brand_color" value={profile.brand_color || ''} onChange={handleChange} placeholder="#4f46e5" className="flex-1" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Brand Font</label>
                          <select 
                            name="brand_font" 
                            value={profile.brand_font || 'Inter'} 
                            onChange={handleChange as any}
                            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                          >
                            <option value="Inter">Inter (Sans-serif)</option>
                            <option value="Playfair Display">Playfair Display (Serif)</option>
                            <option value="Space Grotesk">Space Grotesk (Modern)</option>
                            <option value="JetBrains Mono">JetBrains Mono (Monospace)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* CONTACT & SOCIAL */}
                {activeTab === 'contact' && (
                  <GlassCard intensity="low" className="p-6 space-y-6 bg-white dark:bg-zinc-900/50">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <LinkIcon className="w-5 h-5 text-indigo-500" /> Contact & Social
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <VisibilityToggle checked={profile.privacy_settings?.show_email ?? false} onChange={(checked) => handlePrivacyChange('show_email', checked)} label="Show Public Email" />
                        <Input name="email" type="email" value={profile.email || ''} onChange={handleChange} placeholder="hello@example.com" />
                      </div>
                      <div className="space-y-2">
                        <VisibilityToggle checked={profile.privacy_settings?.show_phone ?? false} onChange={(checked) => handlePrivacyChange('show_phone', checked)} label="Show Phone" />
                        <Input name="phone" value={profile.phone || ''} onChange={handleChange} placeholder="+1 234 567 8900" />
                      </div>
                      <div className="space-y-2">
                        <VisibilityToggle checked={profile.privacy_settings?.show_website ?? false} onChange={(checked) => handlePrivacyChange('show_website', checked)} label="Show Website" />
                        <Input name="website" value={profile.website || ''} onChange={handleChange} placeholder="https://janedoe.com" />
                      </div>
                      <div className="space-y-2">
                        <VisibilityToggle checked={profile.privacy_settings?.show_booking ?? false} onChange={(checked) => handlePrivacyChange('show_booking', checked)} label="Show Booking URL" />
                        <Input name="booking_calendar_url" value={profile.booking_calendar_url || ''} onChange={handleChange} placeholder="https://cal.com/janedoe" />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Social Profiles</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['instagram', 'facebook', 'twitter', 'linkedin', 'youtube', 'tiktok', 'pinterest', 'whatsapp'].map((platform) => (
                          <div key={platform} className="space-y-1">
                            <VisibilityToggle 
                              checked={profile.privacy_settings?.socials?.[platform as keyof NonNullable<PhotographerProfile['privacy_settings']['socials']>] ?? false} 
                              onChange={(checked) => handlePrivacyChange(`socials.${platform}`, checked)} 
                              label={platform === 'whatsapp' ? 'Show WhatsApp Phone Number' : `Show ${platform.charAt(0).toUpperCase() + platform.slice(1)}`} 
                            />
                            <Input 
                              value={profile.socials?.[platform as keyof typeof profile.socials] || ''} 
                              onChange={(e) => handleSocialChange(platform, e.target.value)} 
                              placeholder={platform === 'whatsapp' ? '+1234567890' : `https://${platform}.com/username`} 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* LOCATION */}
                {activeTab === 'location' && (
                  <GlassCard intensity="low" className="p-6 space-y-6 bg-white dark:bg-zinc-900/50">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-indigo-500" /> Studio & Location
                    </h2>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <VisibilityToggle checked={profile.privacy_settings?.show_location ?? false} onChange={(checked) => handlePrivacyChange('show_location', checked)} label="Show Location" />
                        <Input name="location" value={profile.location || ''} onChange={handleChange} placeholder="e.g., Essen, Germany" />
                        <p className="text-xs text-zinc-500">This is the text that will be displayed on your profile.</p>
                      </div>
                      
                      <div className="space-y-2">
                        <VisibilityToggle checked={profile.privacy_settings?.show_google_maps ?? false} onChange={(checked) => handlePrivacyChange('show_google_maps', checked)} label="Show Google Maps Link" />
                        <Input name="google_maps_url" value={profile.google_maps_url || ''} onChange={handleChange} placeholder="https://maps.app.goo.gl/..." />
                        <p className="text-xs text-zinc-500">Paste a shareable link from Google Maps. When clients click your location, it will open this link.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="space-y-2">
                        <VisibilityToggle checked={profile.privacy_settings?.show_address_details ?? false} onChange={(checked) => handlePrivacyChange('show_address_details', checked)} label="Show Address Details" />
                        <Input name="address_line1" value={profile.address_line1 || ''} onChange={handleChange} placeholder="Street, house no." />
                      </div>
                      <div className="space-y-2">
                        <Input name="address_line2" value={profile.address_line2 || ''} onChange={handleChange} placeholder="Suite, landmark" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">City</label>
                        <select
                          name="city"
                          value={profile.city || ''}
                          onChange={handleChange}
                          disabled={!profile.state}
                          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                        >
                          <option value="">Select City</option>
                          {profile.state && INDIAN_STATES_CITIES[profile.state]?.map(city => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">State / Region</label>
                        <select
                          name="state"
                          value={profile.state || ''}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                        >
                          <option value="">Select State</option>
                          {Object.keys(INDIAN_STATES_CITIES).map(state => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Postal Code</label>
                        <Input name="postal_code" value={profile.postal_code || ''} onChange={handleChange} placeholder="45127" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Country</label>
                        <Input name="country" value={profile.country || ''} onChange={handleChange} placeholder="India" />
                      </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <VisibilityToggle checked={profile.privacy_settings?.show_service_areas ?? false} onChange={(checked) => handlePrivacyChange('show_service_areas', checked)} label="Show Service Areas" />
                      <Input 
                        value={profile.service_areas?.join(', ') || ''} 
                        onChange={(e) => handleArrayChange('service_areas', e.target.value)} 
                        placeholder="NRW, Germany-wide, Europe" 
                      />
                    </div>
                  </GlassCard>
                )}

                {/* SEO & CONTENT */}
                {activeTab === 'seo' && (
                  <GlassCard intensity="low" className="p-6 space-y-6 bg-white dark:bg-zinc-900/50">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Search className="w-5 h-5 text-indigo-500" /> Page Content & SEO
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Featured Gallery ID</label>
                        <Input name="featured_gallery_id" value={profile.featured_gallery_id || ''} onChange={handleChange} placeholder="UUID of gallery to highlight" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Spotify Playlist ID</label>
                        <Input name="spotify_playlist_id" value={profile.spotify_playlist_id || ''} onChange={handleChange} placeholder="37i9dQZF1DX..." />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Search Engine Optimization</h3>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-500">Meta Title</label>
                        <Input name="meta_title" value={profile.meta_title || ''} onChange={handleChange} placeholder="Jane Doe | Wedding Photographer in Essen" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-500">Meta Description</label>
                        <textarea 
                          name="meta_description" 
                          value={profile.meta_description || ''} 
                          onChange={handleChange} 
                          rows={2}
                          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                          placeholder="Award-winning wedding photography..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-500">Meta Keywords (comma separated)</label>
                        <Input 
                          value={profile.meta_keywords?.join(', ') || ''} 
                          onChange={(e) => handleArrayChange('meta_keywords', e.target.value)} 
                          placeholder="wedding, photographer, essen, germany" 
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Open Graph (Social Sharing)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-zinc-500">OG Title</label>
                          <Input name="og_title" value={profile.og_title || ''} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-zinc-500">OG Image URL</label>
                          <Input name="og_image" value={profile.og_image || ''} onChange={handleChange} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-500">OG Description</label>
                        <Input name="og_description" value={profile.og_description || ''} onChange={handleChange} />
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* EXTRAS */}
                {activeTab === 'extras' && (
                  <GlassCard intensity="low" className="p-6 space-y-6 bg-white dark:bg-zinc-900/50">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Settings className="w-5 h-5 text-indigo-500" /> Extras & System
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Pronouns</label>
                        <Input name="pronouns" value={profile.pronouns || ''} onChange={handleChange} placeholder="she/her" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Language</label>
                        <Input name="language" value={profile.language || ''} onChange={handleChange} placeholder="en, de" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Timezone</label>
                        <Input name="timezone" value={profile.timezone || ''} onChange={handleChange} placeholder="Europe/Berlin" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Internal Tags (comma separated)</label>
                        <Input 
                          value={profile.tags?.join(', ') || ''} 
                          onChange={(e) => handleArrayChange('tags', e.target.value)} 
                          placeholder="luxury, budget-friendly" 
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                      <div>
                        <h3 className="font-medium text-sm">Marketing Consent</h3>
                        <p className="text-xs text-zinc-500">Allow receiving marketing emails.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="consent_marketing" checked={profile.consent_marketing ?? false} onChange={handleChange} className="sr-only peer" />
                        <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </GlassCard>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
