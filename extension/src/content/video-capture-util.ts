// Runs in page context (content script) — has the page's session cookies automatically.
// Strategy:
//   1. Capture canvas frame SYNCHRONOUSLY (< 100ms, no network, no page freeze)
//   2. Start video download in BACKGROUND (fire-and-forget, upgrades the frame if done before "Analizar")

const MAX_VIDEO_BYTES = 5 * 1024 * 1024 // 5 MB raw
const STORAGE_KEY = 'kreoon_pending_video'

export interface PendingVideoData {
  data: string       // base64
  mimeType: string   // 'video/mp4' | 'image/jpeg'
  type: 'video' | 'frame'
  sizeKB: number
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 8192
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function captureFrame(video: HTMLVideoElement): string | null {
  try {
    const w = Math.min(video.videoWidth || 1280, 1280)
    const h = Math.min(video.videoHeight || 720, 720)
    if (w === 0 || h === 0) return null
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', 0.88).split(',')[1]
  } catch {
    return null
  }
}

async function tryDownloadVideo(videoUrl: string): Promise<void> {
  if (!videoUrl || !videoUrl.startsWith('http')) return
  try {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 15000)
    const res = await fetch(videoUrl, {
      credentials: 'include',
      signal: ctrl.signal,
      headers: { Referer: window.location.origin },
    })
    clearTimeout(timeout)
    if (!res.ok) return

    const len = Number(res.headers.get('content-length') || 0)
    if (len > MAX_VIDEO_BYTES) return

    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_VIDEO_BYTES) return

    const entry: PendingVideoData = {
      data: toBase64(buf),
      mimeType: 'video/mp4',
      type: 'video',
      sizeKB: Math.round(buf.byteLength / 1024),
    }
    await chrome.storage.local.set({ [STORAGE_KEY]: entry })
    console.log(`[Kreoon] Video upgrade complete: ${entry.sizeKB}KB`)
  } catch (e) {
    // Frame fallback already saved — silently ignore
    console.log('[Kreoon] Video download failed, using frame:', (e as Error).message)
  }
}

export async function prefetchVideoForAnalysis(
  video: HTMLVideoElement,
  videoUrl: string,
): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY)

  // Step 1: capture frame immediately — NO network, NO page freeze
  const frameBase64 = captureFrame(video)
  if (frameBase64) {
    const entry: PendingVideoData = {
      data: frameBase64,
      mimeType: 'image/jpeg',
      type: 'frame',
      sizeKB: Math.round(frameBase64.length * 0.75 / 1024),
    }
    await chrome.storage.local.set({ [STORAGE_KEY]: entry })
    console.log(`[Kreoon] Frame captured: ${entry.sizeKB}KB`)
  }

  // Step 2: try full video download in background (non-blocking)
  // Will overwrite the frame in storage if it completes before the user clicks "Analizar"
  void tryDownloadVideo(videoUrl)
}
