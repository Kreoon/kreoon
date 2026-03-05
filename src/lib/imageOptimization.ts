/**
 * Image optimization utilities for better Core Web Vitals
 * Handles Bunny CDN, Supabase Storage, and external images
 */

const SUPABASE_STORAGE_HOST = 'wjkbqcrxwsmvtxmqgiqc.supabase.co';
const BUNNY_CDN_HOSTS = ['b-cdn.net', 'mediadelivery.net'];

interface OptimizedImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'png' | 'auto';
}

/**
 * Get optimized image URL with proper sizing for the container
 * Supports Supabase Storage transformations and Bunny CDN
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  options: OptimizedImageOptions = {}
): string {
  if (!url) return '';

  const { width = 400, quality = 75, format = 'webp' } = options;

  try {
    const urlObj = new URL(url);

    // Supabase Storage - use render endpoint with transformations
    if (urlObj.hostname === SUPABASE_STORAGE_HOST && urlObj.pathname.includes('/storage/v1/object/')) {
      // Convert from /storage/v1/object/public/... to /storage/v1/render/image/public/...
      const renderPath = urlObj.pathname.replace('/object/', '/render/image/');
      const params = new URLSearchParams();
      params.set('width', String(width));
      params.set('quality', String(quality));
      if (format !== 'auto') params.set('format', format);
      return `${urlObj.origin}${renderPath}?${params.toString()}`;
    }

    // Bunny CDN video thumbnails - already optimized, just return
    if (BUNNY_CDN_HOSTS.some(host => urlObj.hostname.includes(host))) {
      return url;
    }

    // External images - return as-is (consider using a proxy in production)
    return url;
  } catch {
    return url || '';
  }
}

/**
 * Get srcSet for responsive images
 */
export function getResponsiveSrcSet(
  url: string | null | undefined,
  widths: number[] = [180, 360, 540]
): string {
  if (!url) return '';

  return widths
    .map(w => `${getOptimizedImageUrl(url, { width: w })} ${w}w`)
    .join(', ');
}

/**
 * Get sizes attribute for responsive images based on viewport
 */
export function getImageSizes(config: {
  mobile?: string;
  tablet?: string;
  desktop?: string;
}): string {
  const parts: string[] = [];
  if (config.mobile) parts.push(`(max-width: 640px) ${config.mobile}`);
  if (config.tablet) parts.push(`(max-width: 1024px) ${config.tablet}`);
  if (config.desktop) parts.push(config.desktop);
  return parts.join(', ') || '100vw';
}

/**
 * Preload critical images (call in useEffect for above-the-fold images)
 */
export function preloadImage(url: string, options?: OptimizedImageOptions): void {
  if (typeof window === 'undefined') return;

  const optimizedUrl = getOptimizedImageUrl(url, options);
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = optimizedUrl;
  if (options?.format === 'webp') {
    link.type = 'image/webp';
  }
  document.head.appendChild(link);
}

/**
 * Get placeholder color from image (simple hash-based)
 */
export function getPlaceholderColor(id: string): string {
  const colors = [
    'bg-purple-900/30',
    'bg-blue-900/30',
    'bg-pink-900/30',
    'bg-indigo-900/30',
    'bg-violet-900/30',
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return colors[Math.abs(hash) % colors.length];
}
