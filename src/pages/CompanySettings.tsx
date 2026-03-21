import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { CompanyProfile } from '@/types/company';
import { Camera, Save, Globe, MapPin, Link as LinkIcon, Palette, ArrowLeft, Loader2, Upload, Image as ImageIcon, Search, Plus, Trash2, Settings, Share2, Layout, Shield, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LazyImage } from '@/components/LazyImage';
import { AvatarCropper } from '@/components/AvatarCropper';
import { cn } from '@/lib/utils';

type TabId = 'brand' | 'digital' | 'contact' | 'address' | 'privacy';

export default function CompanySettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<TabId>('brand');
  
  const [profile, setProfile] = useState<Partial<CompanyProfile>>({
    name: '',
    tagline: '',
    logo_url: '',
    favicon_url: '',
    brand_color: '#4f46e5',
    brand_font: 'Inter, sans-serif',
    slug: '',
    website: '',
    socials: {},
    custom_links: [],
    email: '',
    phone: '',
    secondary_emails: [],
    secondary_phones: [],
    phonepe_url: '',
    address: '',
    google_maps_url: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    company_visibility: {
      name: false,
      tagline: false,
      logo_url: false,
      email: false,
      phone: false,
      website: false,
      address: false,
      socials: {
        instagram: false,
        facebook: false,
        twitter: false,
        linkedin: false,
        youtube: false,
        tiktok: false,
        pinterest: false,
        whatsapp: false,
      },
      secondary_emails: false,
      secondary_phones: false,
      custom_links: false,
      qr_code: false,
      vcard: false,
    },
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'companies', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as CompanyProfile;
          setProfile({ 
            ...profile, 
            ...data,
            company_visibility: {
              ...profile.company_visibility,
              ...(data.company_visibility || {}),
              socials: {
                ...profile.company_visibility?.socials,
                ...(data.company_visibility?.socials || {})
              }
            }
          });
        } else {
          setProfile(prev => ({
            ...prev,
            email: user.email || '',
            name: user.displayName || 'My Studio',
            slug: user.displayName?.toLowerCase().replace(/\s+/g, '-') || user.uid.slice(0, 8),
          }));
        }
      } catch (error) {
        console.error("Error fetching company profile:", error);
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

  const handleVisibilityChange = (field: keyof NonNullable<CompanyProfile['company_visibility']>) => {
    setProfile(prev => ({
      ...prev,
      company_visibility: {
        ...(prev.company_visibility || {}),
        [field]: !(prev.company_visibility?.[field] ?? false)
      }
    }));
  };

  const handleSocialVisibilityChange = (platform: string) => {
    setProfile(prev => ({
      ...prev,
      company_visibility: {
        ...(prev.company_visibility || {}),
        socials: {
          ...(prev.company_visibility?.socials || {}),
          [platform]: !(prev.company_visibility?.socials?.[platform as keyof typeof prev.company_visibility.socials] ?? false)
        }
      }
    }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropImageSrc(null);
    setUploadingLogo(true);
    
    const formData = new FormData();
    formData.append('photo', croppedBlob, 'logo.jpg');

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
      
      setProfile(prev => ({ ...prev, logo_url: data.webpKey }));
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      setError(error.message || 'Failed to upload logo. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // Check if slug is unique
      if (profile.slug) {
        const slugQuery = query(collection(db, 'companies'), where('slug', '==', profile.slug));
        const slugSnapshot = await getDocs(slugQuery);
        const isTaken = !slugSnapshot.empty && slugSnapshot.docs.some(d => d.id !== user.uid);
        if (isTaken) {
          setError('This company URL (slug) is already taken. Please choose another one.');
          setSaving(false);
          return;
        }
      }

      const docRef = doc(db, 'companies', user.uid);
      await setDoc(docRef, {
        ...profile,
        workspace_id: user.uid,
        updated_at: new Date().toISOString(),
      }, { merge: true });
      setSuccess('Company profile saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error saving company profile:", error);
      setError('Failed to save company profile. Please try again.');
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
    { id: 'brand', label: 'Brand & Identity', icon: Building2 },
    { id: 'digital', label: 'Digital Presence', icon: Globe },
    { id: 'contact', label: 'Contact Details', icon: LinkIcon },
    { id: 'address', label: 'Physical Address', icon: MapPin },
    { id: 'privacy', label: 'Privacy Controls', icon: Shield },
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
              <h1 className="text-2xl font-bold tracking-tight">Company Profile</h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">Manage your studio's brand and public presence.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button 
              onClick={() => window.open(`/c/${profile.slug}`, '_blank')}
              variant="outline"
              className="hidden sm:flex"
              disabled={!profile.slug}
            >
              <Share2 className="w-4 h-4 mr-2" /> View Public Page
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3 space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-white dark:bg-zinc-900 shadow-sm text-indigo-600 dark:text-indigo-400" 
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 hover:text-zinc-900 dark:hover:text-zinc-100"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400")} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* BRAND & IDENTITY */}
                {activeTab === 'brand' && (
                  <GlassCard intensity="low" className="p-6 space-y-6 bg-white dark:bg-zinc-900/50">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-indigo-500" /> Brand & Identity
                    </h2>
                    
                    <div className="flex flex-col sm:flex-row gap-8 items-start">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative w-32 h-32 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center group">
                          {profile.logo_url ? (
                            <LazyImage photoKey={profile.logo_url} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-10 h-10 text-zinc-400" />
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo}>
                              {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-zinc-500 font-medium">Studio Logo</p>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleLogoUpload}
                          accept="image/*"
                          className="hidden"
                        />
                      </div>

                      <div className="flex-1 space-y-4 w-full">
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Studio Name</label>
                          <Input 
                            name="name" 
                            value={profile.name || ''} 
                            onChange={handleChange} 
                            placeholder="e.g. Lumina Studios" 
                            className="bg-zinc-50 dark:bg-zinc-900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Tagline</label>
                          <Input 
                            name="tagline" 
                            value={profile.tagline || ''} 
                            onChange={handleChange} 
                            placeholder="e.g. Capturing Timeless Moments" 
                            className="bg-zinc-50 dark:bg-zinc-900"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1.5">Brand Color</label>
                            <div className="flex gap-2">
                              <input 
                                type="color" 
                                name="brand_color" 
                                value={profile.brand_color || '#4f46e5'} 
                                onChange={handleChange}
                                className="h-10 w-10 rounded cursor-pointer border-0 p-0"
                              />
                              <Input 
                                name="brand_color" 
                                value={profile.brand_color || '#4f46e5'} 
                                onChange={handleChange} 
                                className="flex-1 font-mono text-sm bg-zinc-50 dark:bg-zinc-900"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1.5">Brand Font</label>
                            <select 
                              name="brand_font" 
                              value={profile.brand_font || 'Inter, sans-serif'} 
                              onChange={handleChange}
                              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="Inter, sans-serif">Inter (Modern Sans)</option>
                              <option value="'Playfair Display', serif">Playfair Display (Elegant Serif)</option>
                              <option value="'Space Grotesk', sans-serif">Space Grotesk (Tech Sans)</option>
                              <option value="'JetBrains Mono', monospace">JetBrains Mono (Technical)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* DIGITAL PRESENCE */}
                {activeTab === 'digital' && (
                  <GlassCard intensity="low" className="p-6 space-y-6 bg-white dark:bg-zinc-900/50">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Globe className="w-5 h-5 text-indigo-500" /> Digital Presence
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Profile URL Slug</label>
                        <div className="flex items-center">
                          <span className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-r-0 border-zinc-200 dark:border-zinc-700 rounded-l-xl text-zinc-500 text-sm">
                            rawdrive.ai/c/
                          </span>
                          <Input 
                            name="slug" 
                            value={profile.slug || ''} 
                            onChange={handleChange} 
                            placeholder="your-studio" 
                            className="rounded-l-none bg-zinc-50 dark:bg-zinc-900"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Official Website</label>
                        <Input 
                          name="website" 
                          value={profile.website || ''} 
                          onChange={handleChange} 
                          placeholder="https://yourstudio.com" 
                          className="bg-zinc-50 dark:bg-zinc-900"
                        />
                      </div>
                      
                      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                        <h3 className="text-sm font-medium mb-4">Social Media Links</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {['instagram', 'facebook', 'twitter', 'linkedin', 'youtube', 'tiktok'].map(platform => (
                            <div key={platform}>
                              <label className="block text-xs font-medium text-zinc-500 capitalize mb-1">{platform}</label>
                              <Input 
                                value={profile.socials?.[platform as keyof typeof profile.socials] || ''} 
                                onChange={(e) => handleSocialChange(platform, e.target.value)} 
                                placeholder={`https://${platform}.com/...`} 
                                className="bg-zinc-50 dark:bg-zinc-900 text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* CONTACT DETAILS */}
                {activeTab === 'contact' && (
                  <GlassCard intensity="low" className="p-6 space-y-6 bg-white dark:bg-zinc-900/50">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <LinkIcon className="w-5 h-5 text-indigo-500" /> Contact Details
                    </h2>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Primary Email</label>
                          <Input 
                            name="email" 
                            type="email"
                            value={profile.email || ''} 
                            onChange={handleChange} 
                            placeholder="hello@yourstudio.com" 
                            className="bg-zinc-50 dark:bg-zinc-900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Primary Phone</label>
                          <Input 
                            name="phone" 
                            value={profile.phone || ''} 
                            onChange={handleChange} 
                            placeholder="+1 (555) 123-4567" 
                            className="bg-zinc-50 dark:bg-zinc-900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">PhonePe Payment Link</label>
                          <Input 
                            name="phonepe_url" 
                            value={profile.phonepe_url || ''} 
                            onChange={handleChange} 
                            placeholder="https://phon.pe/..." 
                            className="bg-zinc-50 dark:bg-zinc-900"
                          />
                        </div>
                      </div>
                      
                      {/* Secondary Contacts could be added here with a dynamic list builder, keeping it simple for now */}
                      <p className="text-xs text-zinc-500 mt-2">
                        Secondary emails and phones can be configured via the API.
                      </p>
                    </div>
                  </GlassCard>
                )}

                {/* PHYSICAL ADDRESS */}
                {activeTab === 'address' && (
                  <GlassCard intensity="low" className="p-6 space-y-6 bg-white dark:bg-zinc-900/50">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-indigo-500" /> Physical Address & Location
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Display Address</label>
                        <Input 
                          name="address" 
                          value={profile.address || ''} 
                          onChange={handleChange} 
                          placeholder="e.g. 123 Studio Way, Los Angeles, CA" 
                          className="bg-zinc-50 dark:bg-zinc-900"
                        />
                        <p className="text-xs text-zinc-500 mt-1.5">This is the text address that clients will see on your profile.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Google Maps Link</label>
                        <Input 
                          name="google_maps_url" 
                          value={profile.google_maps_url || ''} 
                          onChange={handleChange} 
                          placeholder="https://maps.app.goo.gl/..." 
                          className="bg-zinc-50 dark:bg-zinc-900"
                        />
                        <p className="text-xs text-zinc-500 mt-1.5">Search for your business or address on Google Maps, click "Share", and paste the link here. Clients clicking your address will be directed here.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Address Line 1</label>
                          <Input name="address_line1" value={profile.address_line1 || ''} onChange={handleChange} placeholder="Street address" className="bg-zinc-50 dark:bg-zinc-900" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Address Line 2</label>
                          <Input name="address_line2" value={profile.address_line2 || ''} onChange={handleChange} placeholder="Apt, suite, etc. (optional)" className="bg-zinc-50 dark:bg-zinc-900" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">City</label>
                          <Input name="city" value={profile.city || ''} onChange={handleChange} placeholder="City" className="bg-zinc-50 dark:bg-zinc-900" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">State / Province</label>
                          <Input name="state" value={profile.state || ''} onChange={handleChange} placeholder="State" className="bg-zinc-50 dark:bg-zinc-900" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Postal Code</label>
                          <Input name="postal_code" value={profile.postal_code || ''} onChange={handleChange} placeholder="ZIP / Postal Code" className="bg-zinc-50 dark:bg-zinc-900" />
                        </div>
                        <div>
                          <Input disabled name="country" value="India" className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed" />
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* PRIVACY CONTROLS */}
                {activeTab === 'privacy' && (
                  <GlassCard intensity="low" className="p-6 space-y-6 bg-white dark:bg-zinc-900/50">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <Shield className="w-5 h-5 text-indigo-500" /> Privacy & Visibility
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Control what information is visible on your public company profile.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {([] as { id: keyof NonNullable<CompanyProfile['company_visibility']>, label: string, desc: string }[]).concat([
                        { id: 'name', label: 'Company Name', desc: 'Show your studio name' },
                        { id: 'tagline', label: 'Tagline', desc: 'Show your mission statement' },
                        { id: 'logo_url', label: 'Logo', desc: 'Display your studio logo' },
                        { id: 'email', label: 'Email Address', desc: 'Allow clients to see your email' },
                        { id: 'phone', label: 'Phone Number', desc: 'Allow clients to see your phone number' },
                        { id: 'secondary_emails', label: 'Secondary Emails', desc: 'Show secondary email addresses' },
                        { id: 'secondary_phones', label: 'Secondary Phones', desc: 'Show secondary phone numbers' },
                        { id: 'website', label: 'Website Link', desc: 'Display your external website' },
                        { id: 'address', label: 'Physical Address', desc: 'Show your studio location' },
                        { id: 'address_details', label: 'Detailed Address', desc: 'Show full physical address details' },
                        { id: 'custom_links', label: 'Custom Links', desc: 'Display your custom links' },
                      ]).map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                          <div>
                            <h3 className="font-medium text-sm">{item.label}</h3>
                            <p className="text-xs text-zinc-500">{item.desc}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={profile.company_visibility?.[item.id] as boolean ?? false} 
                              onChange={() => handleVisibilityChange(item.id)} 
                              className="sr-only peer" 
                            />
                            <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>

                    <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                      <h3 className="text-sm font-medium mb-4">Social Media Visibility</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {['instagram', 'facebook', 'twitter', 'linkedin', 'youtube', 'tiktok'].map(platform => (
                          <div key={platform} className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                            <span className="text-sm font-medium capitalize">{platform}</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={profile.company_visibility?.socials?.[platform as keyof typeof profile.company_visibility.socials] ?? false} 
                                onChange={() => handleSocialVisibilityChange(platform)} 
                                className="sr-only peer" 
                              />
                              <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>
                        ))}
                      </div>
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
