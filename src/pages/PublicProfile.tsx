import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { PhotographerProfile } from '@/types/profile';
import { MapPin, Globe, Mail, Phone, Instagram, Twitter, Facebook, Youtube, Camera, Calendar, Linkedin, Video, Image as ImageIcon, MessageCircle, Share2, Folder } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { cn, normalizeUrl, normalizeSocialUrl } from '@/lib/utils';
import { LazyImage } from '@/components/LazyImage';
import { getThemeClass } from '@/lib/theme';

export default function PublicProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<PhotographerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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
        } else {
          setError('Profile not found.');
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

  if (loading) return <div className="min-h-screen bg-zinc-900 flex items-center justify-center text-white">Loading...</div>;
  if (error || !profile) return <div className="min-h-screen bg-zinc-900 flex items-center justify-center text-white">{error}</div>;

  const brandColor = profile.brand_color || '#4f46e5';

  return (
    <div className={cn("min-h-screen p-6 font-sans", getThemeClass(profile.background_theme))}
      style={profile.background_image_url ? { backgroundImage: `url(${profile.background_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
    >
      <div className="max-w-md mx-auto flex flex-col items-center text-center space-y-6">
        {/* Avatar */}
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-zinc-800 shadow-2xl bg-zinc-800">
          {profile.avatar_url && profile.privacy_settings?.show_avatar ? (
            <LazyImage photoKey={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-700">
              <Camera className="w-12 h-12 text-zinc-400" />
            </div>
          )}
        </div>

        {/* Name & Bio */}
        <div className="space-y-4 bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-lg">
          {profile.privacy_settings?.show_display_name && profile.display_name ? (
            <h1 className="text-3xl font-bold text-white">{profile.display_name}</h1>
          ) : (
            <h1 className="text-3xl font-bold text-white">
              {profile.privacy_settings?.show_first_name && profile.first_name} {profile.privacy_settings?.show_last_name && profile.last_name}
            </h1>
          )}
          {profile.profile_title && profile.privacy_settings?.show_profile_title && (
            <p className="text-lg text-zinc-200 font-medium">{profile.profile_title}</p>
          )}
          {profile.tagline && profile.privacy_settings?.show_tagline && (
            <p className="text-zinc-200">{profile.tagline}</p>
          )}
          {profile.bio && profile.privacy_settings?.show_bio && (
            <p className="text-zinc-100 mt-4 max-w-sm">{profile.bio}</p>
          )}
        </div>

        {/* Links Stack */}
        <div className="w-full space-y-3">
          {profile.email && profile.privacy_settings?.show_email && (
            <a href={`mailto:${profile.email}`} className="block w-full">
              <Button className="w-full py-4 rounded-full bg-white text-black hover:bg-zinc-200 font-semibold">Email Me</Button>
            </a>
          )}
          {profile.phone && profile.privacy_settings?.show_phone && (
            <a href={`tel:${profile.phone}`} className="block w-full">
              <Button className="w-full py-4 rounded-full bg-white text-black hover:bg-zinc-200 font-semibold">Call Me</Button>
            </a>
          )}
          {profile.booking_calendar_url && profile.privacy_settings?.show_booking && (
            <a href={normalizeUrl(profile.booking_calendar_url)} target="_blank" rel="noopener noreferrer" className="block w-full">
              <Button className="w-full py-4 rounded-full bg-white text-black hover:bg-zinc-200 font-semibold">Book a Session</Button>
            </a>
          )}
          {profile.website && profile.privacy_settings?.show_website && (
            <a href={normalizeUrl(profile.website)} target="_blank" rel="noopener noreferrer" className="block w-full">
              <Button className="w-full py-4 rounded-full bg-white text-black hover:bg-zinc-200 font-semibold">My Website</Button>
            </a>
          )}
          {profile.location && profile.privacy_settings?.show_location && (
            profile.google_maps_url && profile.privacy_settings?.show_google_maps ? (
              <a href={normalizeUrl(profile.google_maps_url)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center text-white gap-3 hover:opacity-80 transition-opacity">
                <div className="text-white bg-white/10 backdrop-blur-md rounded-full p-2 border border-white/10">
                  <MapPin className="w-4 h-4" />
                </div>
                <span>{profile.location}</span>
              </a>
            ) : (
              <div className="flex items-center justify-center text-white gap-3">
                <div className="text-white bg-white/10 backdrop-blur-md rounded-full p-2 border border-white/10">
                  <MapPin className="w-4 h-4" />
                </div>
                <span>{profile.location}</span>
              </div>
            )
          )}
        </div>

        {/* Socials */}
        <div className="flex gap-4 pt-4">
          {profile.socials?.instagram && profile.privacy_settings?.socials?.instagram && (
            <a href={normalizeSocialUrl('instagram', profile.socials.instagram)} target="_blank" rel="noopener noreferrer" className="text-white bg-white/10 backdrop-blur-md rounded-full p-3 border border-white/10 hover:bg-white/20 transition-all">
              <Instagram className="w-6 h-6" />
            </a>
          )}
          {profile.socials?.facebook && profile.privacy_settings?.socials?.facebook && (
            <a href={normalizeSocialUrl('facebook', profile.socials.facebook)} target="_blank" rel="noopener noreferrer" className="text-white bg-white/10 backdrop-blur-md rounded-full p-3 border border-white/10 hover:bg-white/20 transition-all">
              <Facebook className="w-6 h-6" />
            </a>
          )}
          {profile.socials?.twitter && profile.privacy_settings?.socials?.twitter && (
            <a href={normalizeSocialUrl('twitter', profile.socials.twitter)} target="_blank" rel="noopener noreferrer" className="text-white bg-white/10 backdrop-blur-md rounded-full p-3 border border-white/10 hover:bg-white/20 transition-all">
              <Twitter className="w-6 h-6" />
            </a>
          )}
          {profile.socials?.linkedin && profile.privacy_settings?.socials?.linkedin && (
            <a href={normalizeSocialUrl('linkedin', profile.socials.linkedin)} target="_blank" rel="noopener noreferrer" className="text-white bg-white/10 backdrop-blur-md rounded-full p-3 border border-white/10 hover:bg-white/20 transition-all">
              <Linkedin className="w-6 h-6" />
            </a>
          )}
          {profile.socials?.youtube && profile.privacy_settings?.socials?.youtube && (
            <a href={normalizeSocialUrl('youtube', profile.socials.youtube)} target="_blank" rel="noopener noreferrer" className="text-white bg-white/10 backdrop-blur-md rounded-full p-3 border border-white/10 hover:bg-white/20 transition-all">
              <Youtube className="w-6 h-6" />
            </a>
          )}
          {profile.socials?.tiktok && profile.privacy_settings?.socials?.tiktok && (
            <a href={normalizeSocialUrl('tiktok', profile.socials.tiktok)} target="_blank" rel="noopener noreferrer" className="text-white bg-white/10 backdrop-blur-md rounded-full p-3 border border-white/10 hover:bg-white/20 transition-all">
              <Video className="w-6 h-6" />
            </a>
          )}
          {profile.socials?.pinterest && profile.privacy_settings?.socials?.pinterest && (
            <a href={normalizeSocialUrl('pinterest', profile.socials.pinterest)} target="_blank" rel="noopener noreferrer" className="text-white bg-white/10 backdrop-blur-md rounded-full p-3 border border-white/10 hover:bg-white/20 transition-all">
              <ImageIcon className="w-6 h-6" />
            </a>
          )}
          {profile.socials?.whatsapp && profile.privacy_settings?.socials?.whatsapp && (
            <a href={normalizeSocialUrl('whatsapp', profile.socials.whatsapp)} target="_blank" rel="noopener noreferrer" className="text-white bg-white/10 backdrop-blur-md rounded-full p-3 border border-white/10 hover:bg-white/20 transition-all">
              <MessageCircle className="w-6 h-6" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
