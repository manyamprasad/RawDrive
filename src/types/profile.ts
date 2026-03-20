export interface PhotographerProfile {
  id?: string;
  user_id: string;
  
  // Core Identity
  first_name?: string;
  last_name?: string;
  display_name?: string;
  name?: string;
  profile_title?: string;
  tagline?: string;
  slug?: string;
  bio?: string;
  avatar_url?: string;
  logo_url?: string;
  favicon_url?: string;
  categories?: string[];
  workspace_id?: string;

  // Branding & Visibility
  brand_color?: string;
  brand_font?: string;
  background_theme?: string;
  background_image_url?: string;
  theme_id?: string;
  is_public?: boolean;
  show_qr_code?: boolean;
  show_vcard?: boolean;
  indexable?: boolean;
  custom_domain?: string;
  custom_domain_enabled?: boolean;

  // Contact Information
  email?: string;
  phone?: string;
  website?: string;
  secondary_emails?: { label: string; value: string }[];
  secondary_phones?: { label: string; value: string }[];
  booking_calendar_url?: string;
  socials?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
    pinterest?: string;
    whatsapp?: string;
  };

  // Studio & Location
  location?: string;
  google_maps_url?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  service_areas?: string[];

  // Page Content & Integrations
  featured_gallery_id?: string;
  custom_links?: { label: string; url: string; icon?: string }[];
  tiktok_username?: string;
  spotify_playlist_id?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  og_title?: string;
  og_description?: string;
  og_image?: string;
  twitter_card?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image?: string;

  // Analytics & System Metadata
  view_count?: number;
  unique_visitors?: number;
  last_viewed_at?: string;
  created_at?: string;
  updated_at?: string;

  // Extras
  pronouns?: string;
  language?: string;
  timezone?: string;
  role?: string;
  status?: string;
  verification_badge?: boolean | string;
  tags?: string[];
  consent_marketing?: boolean;
  custom_fields?: Record<string, any>;

  // Privacy Settings
  privacy_settings?: {
    show_email?: boolean;
    show_phone?: boolean;
    show_website?: boolean;
    show_booking?: boolean;
    show_socials?: boolean;
    show_location?: boolean;
    show_google_maps?: boolean;
    show_avatar?: boolean;
    show_bio?: boolean;
    show_custom_links?: boolean;
    show_first_name?: boolean;
    show_last_name?: boolean;
    show_display_name?: boolean;
    show_profile_title?: boolean;
    show_tagline?: boolean;
    show_logo?: boolean;
    show_categories?: boolean;
    show_secondary_emails?: boolean;
    show_secondary_phones?: boolean;
    show_address_details?: boolean;
    show_service_areas?: boolean;
    show_pronouns?: boolean;
    show_language?: boolean;
    show_timezone?: boolean;
    show_tags?: boolean;
    socials?: {
      instagram?: boolean;
      facebook?: boolean;
      twitter?: boolean;
      linkedin?: boolean;
      youtube?: boolean;
      tiktok?: boolean;
      pinterest?: boolean;
      whatsapp?: boolean;
    };
  };
}
