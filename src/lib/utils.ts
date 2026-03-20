import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:') || url.startsWith('tel:')) {
    return url;
  }
  return `https://${url}`;
}

export function normalizeSocialUrl(platform: string, urlOrHandle: string | undefined | null): string {
  if (!urlOrHandle) return '';
  
  let cleanValue = urlOrHandle.trim();
  
  if (cleanValue.startsWith('http://') || cleanValue.startsWith('https://')) {
    return cleanValue;
  }

  if (cleanValue.includes(platform + '.com') || cleanValue.includes(platform + '.in') || cleanValue.includes('wa.me')) {
    return `https://${cleanValue}`;
  }

  const handle = cleanValue.replace(/^@/, '');

  switch (platform.toLowerCase()) {
    case 'instagram':
      return `https://instagram.com/${handle}`;
    case 'twitter':
      return `https://twitter.com/${handle}`;
    case 'facebook':
      return `https://facebook.com/${handle}`;
    case 'linkedin':
      return `https://linkedin.com/in/${handle}`;
    case 'youtube':
      return `https://youtube.com/@${handle}`;
    case 'tiktok':
      return `https://tiktok.com/@${handle}`;
    case 'pinterest':
      return `https://pinterest.com/${handle}`;
    case 'whatsapp':
      return `https://wa.me/${handle.replace(/[^0-9]/g, '')}`;
    default:
      return `https://${handle}`;
  }
}
