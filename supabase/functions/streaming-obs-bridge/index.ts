/**
 * streaming-obs-bridge - Proxy WebSocket para control de OBS
 * Permite controlar OBS Studio remotamente via obs-websocket
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OBS WebSocket request types
interface OBSRequest {
  op: number;
  d: {
    requestType: string;
    requestId: string;
    requestData?: Record<string, unknown>;
  };
}

interface OBSResponse {
  op: number;
  d: {
    requestType: string;
    requestId: string;
    requestStatus: {
      result: boolean;
      code: number;
      comment?: string;
    };
    responseData?: Record<string, unknown>;
  };
}

// Simple WebSocket client for OBS
async function sendOBSRequest(
  websocketUrl: string,
  password: string | undefined,
  requestType: string,
  requestData?: Record<string, unknown>,
  timeoutMs = 10000
): Promise<OBSResponse['d']['responseData']> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(websocketUrl);
    const requestId = crypto.randomUUID();
    let authenticated = false;
    let timeout: number;

    timeout = setTimeout(() => {
      ws.close();
      reject(new Error('OBS request timeout'));
    }, timeoutMs);

    ws.onopen = () => {
      console.log('[streaming-obs-bridge] WebSocket connected');
    };

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[streaming-obs-bridge] Message:', message.op);

        switch (message.op) {
          case 0: // Hello
            // OBS WebSocket 5.x protocol
            if (message.d.authentication) {
              // Need to authenticate
              if (!password) {
                ws.close();
                reject(new Error('OBS requires password'));
                return;
              }

              const { challenge, salt } = message.d.authentication;
              const authString = await generateAuthString(password, salt, challenge);

              ws.send(JSON.stringify({
                op: 1, // Identify
                d: {
                  rpcVersion: 1,
                  authentication: authString,
                },
              }));
            } else {
              // No auth required
              ws.send(JSON.stringify({
                op: 1,
                d: { rpcVersion: 1 },
              }));
            }
            break;

          case 2: // Identified
            authenticated = true;
            // Send the actual request
            ws.send(JSON.stringify({
              op: 6, // Request
              d: {
                requestType,
                requestId,
                requestData,
              },
            }));
            break;

          case 7: // RequestResponse
            if (message.d.requestId === requestId) {
              clearTimeout(timeout);
              ws.close();

              if (message.d.requestStatus.result) {
                resolve(message.d.responseData);
              } else {
                reject(new Error(message.d.requestStatus.comment || 'OBS request failed'));
              }
            }
            break;

          case 5: // Event (ignore)
            break;

          default:
            console.log('[streaming-obs-bridge] Unknown op:', message.op);
        }
      } catch (err) {
        console.error('[streaming-obs-bridge] Message parse error:', err);
      }
    };

    ws.onerror = (error) => {
      clearTimeout(timeout);
      reject(new Error('WebSocket error'));
    };

    ws.onclose = () => {
      clearTimeout(timeout);
      if (!authenticated) {
        reject(new Error('Connection closed before authentication'));
      }
    };
  });
}

// Generate OBS WebSocket 5.x authentication string
async function generateAuthString(password: string, salt: string, challenge: string): Promise<string> {
  const encoder = new TextEncoder();

  // Step 1: base64(SHA256(password + salt))
  const passwordSaltHash = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(password + salt)
  );
  const base64Secret = btoa(String.fromCharCode(...new Uint8Array(passwordSaltHash)));

  // Step 2: base64(SHA256(base64Secret + challenge))
  const secretChallengeHash = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(base64Secret + challenge)
  );
  return btoa(String.fromCharCode(...new Uint8Array(secretChallengeHash)));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, websocket_url, password, ...params } = await req.json();
    console.log(`[streaming-obs-bridge] Action: ${action}`);

    if (!websocket_url) {
      return jsonResponse({ error: 'Missing websocket_url' }, 400);
    }

    switch (action) {
      // ============================================
      // CONNECTION
      // ============================================
      case 'connect': {
        try {
          // Get OBS version and scenes
          const version = await sendOBSRequest(websocket_url, password, 'GetVersion');
          const scenes = await sendOBSRequest(websocket_url, password, 'GetSceneList');
          const status = await sendOBSRequest(websocket_url, password, 'GetStreamStatus');
          const recordStatus = await sendOBSRequest(websocket_url, password, 'GetRecordStatus');

          return jsonResponse({
            connected: true,
            version: version?.obsVersion,
            platform: version?.platform,
            scenes: scenes?.scenes || [],
            current_scene: scenes?.currentProgramSceneName,
            is_streaming: status?.outputActive || false,
            is_recording: recordStatus?.outputActive || false,
          });
        } catch (err) {
          return jsonResponse({
            connected: false,
            error: err instanceof Error ? err.message : 'Connection failed',
          });
        }
      }

      case 'get_status': {
        const streamStatus = await sendOBSRequest(websocket_url, password, 'GetStreamStatus');
        const recordStatus = await sendOBSRequest(websocket_url, password, 'GetRecordStatus');
        const currentScene = await sendOBSRequest(websocket_url, password, 'GetCurrentProgramScene');
        const stats = await sendOBSRequest(websocket_url, password, 'GetStats');

        return jsonResponse({
          is_streaming: streamStatus?.outputActive || false,
          stream_timecode: streamStatus?.outputTimecode,
          stream_bytes: streamStatus?.outputBytes,
          is_recording: recordStatus?.outputActive || false,
          record_timecode: recordStatus?.outputTimecode,
          current_scene: currentScene?.sceneName,
          stats: {
            cpu_usage: stats?.cpuUsage,
            memory_usage: stats?.memoryUsage,
            fps: stats?.activeFps,
            render_skipped_frames: stats?.renderSkippedFrames,
            output_skipped_frames: stats?.outputSkippedFrames,
          },
        });
      }

      // ============================================
      // SCENES
      // ============================================
      case 'get_scenes': {
        const data = await sendOBSRequest(websocket_url, password, 'GetSceneList');

        return jsonResponse({
          scenes: data?.scenes || [],
          current_scene: data?.currentProgramSceneName,
        });
      }

      case 'set_scene': {
        const { scene_name } = params;

        if (!scene_name) {
          return jsonResponse({ error: 'Missing scene_name' }, 400);
        }

        await sendOBSRequest(websocket_url, password, 'SetCurrentProgramScene', {
          sceneName: scene_name,
        });

        return jsonResponse({ success: true });
      }

      case 'get_scene_items': {
        const { scene_name } = params;

        const data = await sendOBSRequest(websocket_url, password, 'GetSceneItemList', {
          sceneName: scene_name,
        });

        return jsonResponse({ items: data?.sceneItems || [] });
      }

      // ============================================
      // SOURCES
      // ============================================
      case 'set_source_visibility': {
        const { scene_name, source_name, visible } = params;

        // Get scene item ID first
        const items = await sendOBSRequest(websocket_url, password, 'GetSceneItemList', {
          sceneName: scene_name,
        });

        const item = (items?.sceneItems as Array<{ sourceName: string; sceneItemId: number }>)?.find(
          (i) => i.sourceName === source_name
        );

        if (!item) {
          return jsonResponse({ error: 'Source not found' }, 404);
        }

        await sendOBSRequest(websocket_url, password, 'SetSceneItemEnabled', {
          sceneName: scene_name,
          sceneItemId: item.sceneItemId,
          sceneItemEnabled: visible,
        });

        return jsonResponse({ success: true });
      }

      case 'get_source_settings': {
        const { source_name } = params;

        const data = await sendOBSRequest(websocket_url, password, 'GetInputSettings', {
          inputName: source_name,
        });

        return jsonResponse({
          settings: data?.inputSettings,
          kind: data?.inputKind,
        });
      }

      case 'set_source_settings': {
        const { source_name, settings } = params;

        await sendOBSRequest(websocket_url, password, 'SetInputSettings', {
          inputName: source_name,
          inputSettings: settings,
        });

        return jsonResponse({ success: true });
      }

      case 'refresh_browser_source': {
        const { source_name } = params;

        await sendOBSRequest(websocket_url, password, 'PressInputPropertiesButton', {
          inputName: source_name,
          propertyName: 'refreshnocache',
        });

        return jsonResponse({ success: true });
      }

      // ============================================
      // STREAMING
      // ============================================
      case 'start_streaming': {
        await sendOBSRequest(websocket_url, password, 'StartStream');
        return jsonResponse({ success: true });
      }

      case 'stop_streaming': {
        await sendOBSRequest(websocket_url, password, 'StopStream');
        return jsonResponse({ success: true });
      }

      case 'toggle_streaming': {
        await sendOBSRequest(websocket_url, password, 'ToggleStream');
        return jsonResponse({ success: true });
      }

      case 'get_stream_settings': {
        const data = await sendOBSRequest(websocket_url, password, 'GetStreamServiceSettings');

        return jsonResponse({
          type: data?.streamServiceType,
          settings: data?.streamServiceSettings,
        });
      }

      case 'set_stream_settings': {
        const { service_type, settings } = params;

        await sendOBSRequest(websocket_url, password, 'SetStreamServiceSettings', {
          streamServiceType: service_type || 'rtmp_custom',
          streamServiceSettings: settings,
        });

        return jsonResponse({ success: true });
      }

      // ============================================
      // RECORDING
      // ============================================
      case 'start_recording': {
        await sendOBSRequest(websocket_url, password, 'StartRecord');
        return jsonResponse({ success: true });
      }

      case 'stop_recording': {
        const data = await sendOBSRequest(websocket_url, password, 'StopRecord');
        return jsonResponse({
          success: true,
          output_path: data?.outputPath,
        });
      }

      case 'toggle_recording': {
        await sendOBSRequest(websocket_url, password, 'ToggleRecord');
        return jsonResponse({ success: true });
      }

      case 'pause_recording': {
        await sendOBSRequest(websocket_url, password, 'PauseRecord');
        return jsonResponse({ success: true });
      }

      case 'resume_recording': {
        await sendOBSRequest(websocket_url, password, 'ResumeRecord');
        return jsonResponse({ success: true });
      }

      // ============================================
      // VIRTUAL CAMERA
      // ============================================
      case 'start_virtual_cam': {
        await sendOBSRequest(websocket_url, password, 'StartVirtualCam');
        return jsonResponse({ success: true });
      }

      case 'stop_virtual_cam': {
        await sendOBSRequest(websocket_url, password, 'StopVirtualCam');
        return jsonResponse({ success: true });
      }

      case 'toggle_virtual_cam': {
        await sendOBSRequest(websocket_url, password, 'ToggleVirtualCam');
        return jsonResponse({ success: true });
      }

      // ============================================
      // AUDIO
      // ============================================
      case 'get_audio_sources': {
        const inputs = await sendOBSRequest(websocket_url, password, 'GetInputList', {
          inputKind: 'wasapi_input_capture',
        });

        const outputs = await sendOBSRequest(websocket_url, password, 'GetInputList', {
          inputKind: 'wasapi_output_capture',
        });

        return jsonResponse({
          inputs: inputs?.inputs || [],
          outputs: outputs?.inputs || [],
        });
      }

      case 'set_audio_mute': {
        const { source_name, muted } = params;

        await sendOBSRequest(websocket_url, password, 'SetInputMute', {
          inputName: source_name,
          inputMuted: muted,
        });

        return jsonResponse({ success: true });
      }

      case 'set_audio_volume': {
        const { source_name, volume_db } = params;

        await sendOBSRequest(websocket_url, password, 'SetInputVolume', {
          inputName: source_name,
          inputVolumeDb: volume_db,
        });

        return jsonResponse({ success: true });
      }

      // ============================================
      // TRANSITIONS
      // ============================================
      case 'get_transitions': {
        const data = await sendOBSRequest(websocket_url, password, 'GetSceneTransitionList');

        return jsonResponse({
          transitions: data?.transitions || [],
          current: data?.currentSceneTransitionName,
          duration: data?.currentSceneTransitionDuration,
        });
      }

      case 'set_transition': {
        const { transition_name, duration } = params;

        await sendOBSRequest(websocket_url, password, 'SetCurrentSceneTransition', {
          transitionName: transition_name,
        });

        if (duration !== undefined) {
          await sendOBSRequest(websocket_url, password, 'SetCurrentSceneTransitionDuration', {
            transitionDuration: duration,
          });
        }

        return jsonResponse({ success: true });
      }

      case 'trigger_transition': {
        await sendOBSRequest(websocket_url, password, 'TriggerStudioModeTransition');
        return jsonResponse({ success: true });
      }

      // ============================================
      // STUDIO MODE
      // ============================================
      case 'get_studio_mode': {
        const data = await sendOBSRequest(websocket_url, password, 'GetStudioModeEnabled');
        return jsonResponse({ enabled: data?.studioModeEnabled || false });
      }

      case 'set_studio_mode': {
        const { enabled } = params;

        await sendOBSRequest(websocket_url, password, 'SetStudioModeEnabled', {
          studioModeEnabled: enabled,
        });

        return jsonResponse({ success: true });
      }

      case 'set_preview_scene': {
        const { scene_name } = params;

        await sendOBSRequest(websocket_url, password, 'SetCurrentPreviewScene', {
          sceneName: scene_name,
        });

        return jsonResponse({ success: true });
      }

      // ============================================
      // SCREENSHOTS
      // ============================================
      case 'take_screenshot': {
        const { source_name, format, width, height, quality } = params;

        const data = await sendOBSRequest(websocket_url, password, 'GetSourceScreenshot', {
          sourceName: source_name,
          imageFormat: format || 'png',
          imageWidth: width,
          imageHeight: height,
          imageCompressionQuality: quality || 100,
        });

        return jsonResponse({
          success: true,
          image_data: data?.imageData,
        });
      }

      // ============================================
      // HOTKEYS
      // ============================================
      case 'trigger_hotkey': {
        const { hotkey_name } = params;

        await sendOBSRequest(websocket_url, password, 'TriggerHotkeyByName', {
          hotkeyName: hotkey_name,
        });

        return jsonResponse({ success: true });
      }

      case 'trigger_hotkey_sequence': {
        const { key_id, shift, control, alt, command } = params;

        await sendOBSRequest(websocket_url, password, 'TriggerHotkeyByKeySequence', {
          keyId: key_id,
          keyModifiers: {
            shift: shift || false,
            control: control || false,
            alt: alt || false,
            command: command || false,
          },
        });

        return jsonResponse({ success: true });
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    console.error('[streaming-obs-bridge] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
