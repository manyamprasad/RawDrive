export interface CompanyProfile {
  profile_id?: string;
  workspace_id: string;
  user_id?: string;

  // 1. Brand & Visual Identity
  name?: string;
  tagline?: string;
  logo_url?: string;
  favicon_url?: string;
  brand_color?: string;
  brand_font?: string;

  // 2. Digital Presence
  slug?: string;
  website?: string;
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
  custom_links?: { label: string; url: string; icon?: string }[];

  // 3. Contact Details (Primary & Secondary)
  email?: string;
  phone?: string;
  secondary_emails?: { label: string; value: string }[];
  secondary_phones?: { label: string; value: string }[];

  // 4. Physical Address & Location
  address?: string;
  google_maps_url?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;

  // 5. Sharing & Privacy Controls
  company_visibility?: {
    name?: boolean;
    tagline?: boolean;
    logo_url?: boolean;
    email?: boolean;
    phone?: boolean;
    website?: boolean;
    address?: boolean;
    address_details?: boolean;
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
    secondary_emails?: boolean;
    secondary_phones?: boolean;
    custom_links?: boolean;
    qr_code?: boolean;
    vcard?: boolean;
  };

  // 6. System Metadata
  created_at?: string;
  updated_at?: string;
}
