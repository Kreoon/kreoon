import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

let accessToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  
  if (accessToken && tokenExpiry > now) {
    return accessToken;
  }

  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Spotify auth error:', error);
    throw new Error('Failed to authenticate with Spotify');
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = now + (data.expires_in * 1000) - 60000; // Refresh 1 min before expiry
  
  return accessToken!;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 20 } = await req.json();

    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ tracks: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = await getAccessToken();

    // Try US market first (more previews available), fallback to no market
    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}&market=US`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!searchResponse.ok) {
      const error = await searchResponse.text();
      console.error('Spotify search error:', error);
      throw new Error('Failed to search Spotify');
    }

    const searchData = await searchResponse.json();

    const allTracks =
      searchData.tracks?.items?.map((track: any) => ({
        id: track.id,
        name: track.name,
        artist: track.artists?.map((a: any) => a.name).join(", ") || "Unknown",
        album: track.album?.name || "",
        albumArt: track.album?.images?.[0]?.url || null,
        previewUrl: track.preview_url, // 30-second preview (may be null)
        duration: track.duration_ms,
        spotifyUrl: track.external_urls?.spotify,
      })) || [];

    const tracks = allTracks.filter(
      (t: any) => typeof t.previewUrl === "string" && t.previewUrl.length > 0
    );
    const skippedCount = allTracks.length - tracks.length;

    console.log(
      `Found ${allTracks.length} tracks for query: ${query}; returning ${tracks.length} with previews (skipped ${skippedCount})`
    );

    return new Response(JSON.stringify({ tracks, totalCount: allTracks.length, skippedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('Error in spotify-search:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
