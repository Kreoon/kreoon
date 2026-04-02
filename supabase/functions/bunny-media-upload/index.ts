import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Unified media upload to Bunny CDN Storage Zones
 *
 * Supports:
 * - type=image → kreoon-images zone (with optimizer)
 * - type=asset → kreoon-assets zone (raw files)
 * - type=avatar → kreoon-images/avatars/ (resized)
 * - type=portfolio → kreoon-images/portfolio/
 * - type=chat → kreoon-assets/chat/
 */

interface UploadRequest {
  type: 'image' | 'asset' | 'avatar' | 'portfolio' | 'chat';
  fileName: string;
  contentType: string;
  userId?: string;
  organizationId?: string;
  metadata?: Record<string, string>;
}

interface UploadResponse {
  uploadUrl: string;
  cdnUrl: string;
  path: string;
  zone: string;
}

// Zone configurations
const ZONES = {
  images: {
    name: Deno.env.get('BUNNY_IMAGES_ZONE') || 'kreoon-images',
    password: Deno.env.get('BUNNY_IMAGES_PASSWORD') || '',
    cdn: Deno.env.get('BUNNY_IMAGES_CDN') || 'kreoon-images.b-cdn.net',
    hostname: Deno.env.get('BUNNY_IMAGES_HOSTNAME') || 'la.storage.bunnycdn.com',
  },
  assets: {
    name: Deno.env.get('BUNNY_ASSETS_ZONE') || 'kreoon-assets',
    password: Deno.env.get('BUNNY_ASSETS_PASSWORD') || '',
    cdn: Deno.env.get('BUNNY_ASSETS_CDN') || 'kreoon-assets.b-cdn.net',
    hostname: Deno.env.get('BUNNY_ASSETS_HOSTNAME') || 'la.storage.bunnycdn.com',
  },
};

function getZoneForType(type: UploadRequest['type']): typeof ZONES.images {
  switch (type) {
    case 'image':
    case 'avatar':
    case 'portfolio':
      return ZONES.images;
    case 'asset':
    case 'chat':
      return ZONES.assets;
    default:
      return ZONES.images;
  }
}

function getPathForType(
  type: UploadRequest['type'],
  fileName: string,
  userId?: string,
  organizationId?: string
): string {
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

  switch (type) {
    case 'avatar':
      return `avatars/${userId || 'unknown'}/${timestamp}-${sanitizedName}`;
    case 'portfolio':
      return `portfolio/${userId || 'unknown'}/${timestamp}-${sanitizedName}`;
    case 'chat':
      return `chat/${organizationId || 'general'}/${timestamp}-${sanitizedName}`;
    case 'image':
      return `images/${organizationId || 'general'}/${timestamp}-${sanitizedName}`;
    case 'asset':
      return `assets/${organizationId || 'general'}/${timestamp}-${sanitizedName}`;
    default:
      return `uploads/${timestamp}-${sanitizedName}`;
  }
}

function getOptimizedCdnUrl(
  cdnHost: string,
  path: string,
  type: UploadRequest['type'],
  contentType: string
): string {
  const baseUrl = `https://${cdnHost}/${path}`;

  // Only apply optimization params for images zone
  if (type === 'asset' || type === 'chat') {
    return baseUrl;
  }

  // Check if it's an image that can be optimized
  const isOptimizableImage = contentType.startsWith('image/') &&
    !contentType.includes('svg') &&
    !contentType.includes('gif');

  if (!isOptimizableImage) {
    return baseUrl;
  }

  // Apply Bunny Optimizer params for images
  const params = new URLSearchParams();

  if (type === 'avatar') {
    // Avatars: square crop, 256x256
    params.set('width', '256');
    params.set('height', '256');
    params.set('aspect_ratio', '1:1');
  } else if (type === 'portfolio') {
    // Portfolio: max 1200px width, maintain aspect
    params.set('width', '1200');
  }

  // Always request WebP for modern browsers
  params.set('format', 'webp');
  params.set('quality', '85');

  return `${baseUrl}?${params.toString()}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication internally (bypass gateway JWT issues)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[bunny-media-upload] Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: UploadRequest = await req.json();
    const { type, fileName, contentType, userId, organizationId } = body;

    if (!type || !fileName || !contentType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, fileName, contentType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get zone configuration
    const zone = getZoneForType(type);

    if (!zone.password) {
      console.error(`Missing password for zone: ${zone.name}`);
      return new Response(
        JSON.stringify({ error: 'Storage zone not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate path
    const path = getPathForType(type, fileName, userId, organizationId);

    // Build upload URL for direct browser upload
    const uploadUrl = `https://${zone.hostname}/${zone.name}/${path}`;

    // Build CDN URL (with optimization params if applicable)
    const cdnUrl = getOptimizedCdnUrl(zone.cdn, path, type, contentType);

    const response: UploadResponse = {
      uploadUrl,
      cdnUrl,
      path,
      zone: zone.name,
    };

    // Return upload credentials and URLs
    return new Response(
      JSON.stringify({
        ...response,
        accessKey: zone.password,
        headers: {
          'AccessKey': zone.password,
          'Content-Type': contentType,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('bunny-media-upload error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
