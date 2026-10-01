import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  createProxyToken,
  forwardPutToBunny,
  functionUrl,
  getRequestUser,
  isOrgMember,
  jsonResponse,
  uploadCorsHeaders,
  verifyProxyToken,
} from '../_shared/bunnyUploadSecurity.ts';

const FN = 'bunny-media-upload';
// Imágenes, documentos, audio y adjuntos de chat. Archivos más grandes deben ir
// por Bunny Stream (TUS) o por el flujo de material crudo.
const PROXY_MAX_BYTES = 200 * 1024 * 1024;

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: uploadCorsHeaders });
  }

  try {
    // === PUT: proxy con token de un solo destino (la contraseña nunca sale) ===
    if (req.method === 'PUT') {
      const token = req.headers.get('AccessKey') || '';
      const payload = await verifyProxyToken(token, FN);
      if (!payload || payload.kind !== 'storage') {
        return jsonResponse({ success: false, error: 'Token de subida inválido o vencido' }, 401);
      }
      const sep = payload.target.indexOf(':');
      const zoneKey = payload.target.slice(0, sep) as 'images' | 'assets';
      const path = payload.target.slice(sep + 1);
      const zone = ZONES[zoneKey];
      if (!zone || !zone.password || !path) {
        return jsonResponse({ success: false, error: 'Destino inválido' }, 400);
      }
      const ct = (req.headers.get('content-type') || 'application/octet-stream').slice(0, 120);
      return await forwardPutToBunny(req, `https://${zone.hostname}/${zone.name}/${path}`, zone.password, payload.max, ct);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const user = await getRequestUser(req, admin);
    if (!user) {
      return jsonResponse({ error: 'Invalid or expired session' }, 401);
    }

    const body: UploadRequest = await req.json();
    const { type, fileName, contentType, organizationId } = body;

    if (!type || !fileName || !contentType) {
      return jsonResponse({ error: 'Missing required fields: type, fileName, contentType' }, 400);
    }

    // La organización de la ruta solo se acepta si el usuario es miembro.
    if (organizationId && !(await isOrgMember(admin, user.id, organizationId))) {
      return jsonResponse({ error: 'forbidden: not a member of this organization' }, 403);
    }

    const zone = getZoneForType(type);
    const zoneKey = zone === ZONES.assets ? 'assets' : 'images';

    if (!zone.password) {
      console.error(`Missing password for zone: ${zone.name}`);
      return jsonResponse({ error: 'Storage zone not configured' }, 500);
    }

    // userId SIEMPRE es el usuario autenticado (antes venía del body).
    const path = getPathForType(type, fileName, user.id, organizationId);
    const cdnUrl = getOptimizedCdnUrl(zone.cdn, path, type, contentType);

    const accessKey = await createProxyToken({
      fn: FN,
      kind: 'storage',
      target: `${zoneKey}:${path}`,
      max: PROXY_MAX_BYTES,
      uid: user.id,
    });

    const response: UploadResponse = {
      uploadUrl: functionUrl(FN),
      cdnUrl,
      path,
      zone: zone.name,
    };

    // `accessKey` es un token de proxy, NO la contraseña de la zona.
    return jsonResponse({
      ...response,
      accessKey,
      headers: {
        'AccessKey': accessKey,
        'Content-Type': contentType,
      },
    });

  } catch (error) {
    console.error('bunny-media-upload error:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Internal server error' }, 500);
  }
});
