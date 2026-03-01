/**
 * streaming-chat-aggregator - Agregación de chat multi-plataforma
 * Combina mensajes de YouTube, TikTok, Facebook, Twitch en tiempo real
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  platform: string;
  message_id: string;
  author_name: string;
  author_avatar?: string;
  author_id?: string;
  content: string;
  timestamp: string;
  is_moderator?: boolean;
  is_subscriber?: boolean;
  badges?: string[];
  emotes?: Array<{ id: string; name: string; url: string }>;
}

interface PlatformConfig {
  platform: string;
  api_key?: string;
  channel_id?: string;
  access_token?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, ...params } = await req.json();
    console.log(`[streaming-chat-aggregator] Action: ${action}`);

    switch (action) {
      // ============================================
      // FETCH CHAT MESSAGES
      // ============================================
      case 'fetch_youtube_chat': {
        const { live_chat_id, api_key, page_token } = params;

        if (!live_chat_id || !api_key) {
          return jsonResponse({ error: 'Missing live_chat_id or api_key' }, 400);
        }

        const url = new URL('https://www.googleapis.com/youtube/v3/liveChat/messages');
        url.searchParams.set('liveChatId', live_chat_id);
        url.searchParams.set('part', 'snippet,authorDetails');
        url.searchParams.set('key', api_key);
        if (page_token) url.searchParams.set('pageToken', page_token);

        const response = await fetch(url.toString());
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || 'YouTube API error');
        }

        const messages: ChatMessage[] = (data.items || []).map((item: any) => ({
          platform: 'youtube',
          message_id: item.id,
          author_name: item.authorDetails?.displayName || 'Anonymous',
          author_avatar: item.authorDetails?.profileImageUrl,
          author_id: item.authorDetails?.channelId,
          content: item.snippet?.displayMessage || '',
          timestamp: item.snippet?.publishedAt || new Date().toISOString(),
          is_moderator: item.authorDetails?.isChatModerator || false,
          is_subscriber: item.authorDetails?.isChatSponsor || false,
          badges: getBadges(item.authorDetails),
        }));

        return jsonResponse({
          messages,
          next_page_token: data.nextPageToken,
          polling_interval_ms: data.pollingIntervalMillis || 5000,
        });
      }

      case 'fetch_twitch_chat': {
        // Twitch uses IRC/WebSocket - this provides historical messages
        const { channel_name, access_token, client_id } = params;

        if (!channel_name || !access_token || !client_id) {
          return jsonResponse({ error: 'Missing channel_name, access_token, or client_id' }, 400);
        }

        // Get channel info first
        const userResponse = await fetch(
          `https://api.twitch.tv/helix/users?login=${channel_name}`,
          {
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'Client-Id': client_id,
            },
          }
        );

        const userData = await userResponse.json();
        const broadcasterId = userData.data?.[0]?.id;

        if (!broadcasterId) {
          return jsonResponse({ error: 'Channel not found' }, 404);
        }

        // Note: Twitch doesn't have a REST API for chat history
        // Real-time chat requires IRC WebSocket connection
        // This endpoint returns connection info for client-side IRC
        return jsonResponse({
          platform: 'twitch',
          broadcaster_id: broadcasterId,
          irc_url: 'wss://irc-ws.chat.twitch.tv:443',
          channel: `#${channel_name.toLowerCase()}`,
          message: 'Connect via IRC WebSocket for real-time chat',
        });
      }

      case 'fetch_tiktok_chat': {
        // TikTok Live API (requires approved developer access)
        const { room_id, access_token } = params;

        if (!room_id || !access_token) {
          return jsonResponse({ error: 'Missing room_id or access_token' }, 400);
        }

        // TikTok Live events typically come via webhook
        // This simulates what the API would return
        return jsonResponse({
          platform: 'tiktok',
          room_id,
          messages: [],
          message: 'TikTok chat comes via webhook (streaming-webhook-v2)',
        });
      }

      case 'fetch_facebook_chat': {
        const { video_id, access_token } = params;

        if (!video_id || !access_token) {
          return jsonResponse({ error: 'Missing video_id or access_token' }, 400);
        }

        const url = `https://graph.facebook.com/v18.0/${video_id}/comments?access_token=${access_token}&fields=id,message,from,created_time`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || 'Facebook API error');
        }

        const messages: ChatMessage[] = (data.data || []).map((item: any) => ({
          platform: 'facebook',
          message_id: item.id,
          author_name: item.from?.name || 'Anonymous',
          author_id: item.from?.id,
          content: item.message || '',
          timestamp: item.created_time || new Date().toISOString(),
        }));

        return jsonResponse({
          messages,
          paging: data.paging,
        });
      }

      // ============================================
      // UNIFIED CHAT POLLING
      // ============================================
      case 'poll_all_platforms': {
        const { session_id, platforms } = params as {
          session_id: string;
          platforms: PlatformConfig[];
        };

        if (!session_id || !platforms?.length) {
          return jsonResponse({ error: 'Missing session_id or platforms' }, 400);
        }

        const allMessages: ChatMessage[] = [];
        const errors: Array<{ platform: string; error: string }> = [];

        // Fetch from each platform in parallel
        const fetchPromises = platforms.map(async (config) => {
          try {
            switch (config.platform) {
              case 'youtube':
                if (config.channel_id && config.api_key) {
                  const ytResponse = await fetch(
                    `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${config.channel_id}&part=snippet,authorDetails&key=${config.api_key}`
                  );
                  const ytData = await ytResponse.json();
                  if (ytData.items) {
                    return ytData.items.map((item: any) => ({
                      platform: 'youtube',
                      message_id: item.id,
                      author_name: item.authorDetails?.displayName || 'Anonymous',
                      author_avatar: item.authorDetails?.profileImageUrl,
                      content: item.snippet?.displayMessage || '',
                      timestamp: item.snippet?.publishedAt,
                    }));
                  }
                }
                break;

              case 'facebook':
                if (config.channel_id && config.access_token) {
                  const fbResponse = await fetch(
                    `https://graph.facebook.com/v18.0/${config.channel_id}/comments?access_token=${config.access_token}&fields=id,message,from,created_time`
                  );
                  const fbData = await fbResponse.json();
                  if (fbData.data) {
                    return fbData.data.map((item: any) => ({
                      platform: 'facebook',
                      message_id: item.id,
                      author_name: item.from?.name || 'Anonymous',
                      content: item.message || '',
                      timestamp: item.created_time,
                    }));
                  }
                }
                break;
            }
          } catch (err) {
            errors.push({
              platform: config.platform,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
          }
          return [];
        });

        const results = await Promise.all(fetchPromises);
        results.forEach((msgs) => allMessages.push(...msgs));

        // Sort by timestamp
        allMessages.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Insert new messages into database
        if (allMessages.length > 0) {
          const inserts = allMessages.map((msg) => ({
            session_id,
            source_platform: msg.platform,
            source_message_id: msg.message_id,
            author_name: msg.author_name,
            author_avatar_url: msg.author_avatar,
            author_platform_id: msg.author_id,
            content: msg.content,
            message_type: 'text',
            created_at: msg.timestamp,
          }));

          // Upsert to avoid duplicates
          await supabase
            .from('streaming_chat_messages_v2')
            .upsert(inserts, { onConflict: 'source_platform,source_message_id' });
        }

        return jsonResponse({
          messages: allMessages,
          errors: errors.length > 0 ? errors : undefined,
          count: allMessages.length,
        });
      }

      // ============================================
      // SEND CHAT MESSAGE
      // ============================================
      case 'send_youtube_message': {
        const { live_chat_id, access_token, message } = params;

        if (!live_chat_id || !access_token || !message) {
          return jsonResponse({ error: 'Missing required parameters' }, 400);
        }

        const response = await fetch(
          'https://www.googleapis.com/youtube/v3/liveChat/messages?part=snippet',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              snippet: {
                liveChatId: live_chat_id,
                type: 'textMessageEvent',
                textMessageDetails: {
                  messageText: message,
                },
              },
            }),
          }
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error?.message || 'Failed to send message');
        }

        return jsonResponse({ success: true, message_id: data.id });
      }

      case 'send_facebook_message': {
        const { video_id, access_token, message } = params;

        if (!video_id || !access_token || !message) {
          return jsonResponse({ error: 'Missing required parameters' }, 400);
        }

        const response = await fetch(
          `https://graph.facebook.com/v18.0/${video_id}/comments`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              access_token,
              message,
            }),
          }
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error?.message || 'Failed to send message');
        }

        return jsonResponse({ success: true, message_id: data.id });
      }

      // ============================================
      // MODERATION
      // ============================================
      case 'delete_youtube_message': {
        const { message_id, access_token } = params;

        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/liveChat/messages?id=${message_id}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${access_token}`,
            },
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error?.message || 'Failed to delete message');
        }

        return jsonResponse({ success: true });
      }

      case 'ban_youtube_user': {
        const { live_chat_id, channel_id, access_token, duration_seconds } = params;

        const response = await fetch(
          'https://www.googleapis.com/youtube/v3/liveChat/bans?part=snippet',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              snippet: {
                liveChatId: live_chat_id,
                type: duration_seconds ? 'temporary' : 'permanent',
                banDurationSeconds: duration_seconds || undefined,
                bannedUserDetails: {
                  channelId: channel_id,
                },
              },
            }),
          }
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error?.message || 'Failed to ban user');
        }

        return jsonResponse({ success: true, ban_id: data.id });
      }

      // ============================================
      // CHAT ANALYTICS
      // ============================================
      case 'get_chat_stats': {
        const { session_id, since_minutes } = params;

        if (!session_id) {
          return jsonResponse({ error: 'Missing session_id' }, 400);
        }

        const sinceTime = new Date(Date.now() - (since_minutes || 60) * 60 * 1000).toISOString();

        // Get message counts by platform
        const { data: messages, error } = await supabase
          .from('streaming_chat_messages_v2')
          .select('source_platform, created_at')
          .eq('session_id', session_id)
          .gte('created_at', sinceTime);

        if (error) throw error;

        // Calculate stats
        const platformCounts: Record<string, number> = {};
        const messagesPerMinute: Record<string, number> = {};

        for (const msg of messages || []) {
          // Platform counts
          platformCounts[msg.source_platform] = (platformCounts[msg.source_platform] || 0) + 1;

          // Messages per minute
          const minute = msg.created_at.slice(0, 16); // YYYY-MM-DDTHH:MM
          messagesPerMinute[minute] = (messagesPerMinute[minute] || 0) + 1;
        }

        // Get unique authors
        const { count: uniqueAuthors } = await supabase
          .from('streaming_chat_messages_v2')
          .select('author_platform_id', { count: 'exact', head: true })
          .eq('session_id', session_id)
          .gte('created_at', sinceTime);

        return jsonResponse({
          total_messages: messages?.length || 0,
          unique_authors: uniqueAuthors || 0,
          platform_breakdown: platformCounts,
          messages_per_minute: messagesPerMinute,
          avg_messages_per_minute: Object.values(messagesPerMinute).length > 0
            ? Math.round(
                Object.values(messagesPerMinute).reduce((a, b) => a + b, 0) /
                Object.values(messagesPerMinute).length
              )
            : 0,
        });
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    console.error('[streaming-chat-aggregator] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper functions
function getBadges(authorDetails: any): string[] {
  const badges: string[] = [];
  if (authorDetails?.isChatOwner) badges.push('owner');
  if (authorDetails?.isChatModerator) badges.push('moderator');
  if (authorDetails?.isChatSponsor) badges.push('member');
  if (authorDetails?.isVerified) badges.push('verified');
  return badges;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
