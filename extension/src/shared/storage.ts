import type { AuthSession, VideoMetadata } from './types'
import type { PendingVideoData } from '../content/video-capture-util'

const KEYS = {
  SESSION: 'kreoon_session',
  PENDING_CAPTURE: 'kreoon_pending_capture',
  PENDING_VIDEO: 'kreoon_pending_video',
  NOTIFICATION_COUNT: 'kreoon_notif_count',
} as const

export async function saveSession(session: AuthSession): Promise<void> {
  await chrome.storage.local.set({ [KEYS.SESSION]: session })
}

export async function getSession(): Promise<AuthSession | null> {
  const result = await chrome.storage.local.get(KEYS.SESSION)
  const session = result[KEYS.SESSION] as AuthSession | undefined
  if (!session) return null
  if (Date.now() > session.expiresAt) {
    await clearSession()
    return null
  }
  return session
}

export async function clearSession(): Promise<void> {
  await chrome.storage.local.remove(KEYS.SESSION)
}

export async function savePendingCapture(video: VideoMetadata): Promise<void> {
  await chrome.storage.local.set({ [KEYS.PENDING_CAPTURE]: video })
}

export async function getPendingCapture(): Promise<VideoMetadata | null> {
  const result = await chrome.storage.local.get(KEYS.PENDING_CAPTURE)
  return result[KEYS.PENDING_CAPTURE] ?? null
}

export async function clearPendingCapture(): Promise<void> {
  await chrome.storage.local.remove(KEYS.PENDING_CAPTURE)
}

export async function getPendingVideoBytes(): Promise<PendingVideoData | null> {
  const result = await chrome.storage.local.get(KEYS.PENDING_VIDEO)
  return result[KEYS.PENDING_VIDEO] ?? null
}

export async function clearPendingVideoBytes(): Promise<void> {
  await chrome.storage.local.remove(KEYS.PENDING_VIDEO)
}

export async function getNotificationCount(): Promise<number> {
  const result = await chrome.storage.local.get(KEYS.NOTIFICATION_COUNT)
  return result[KEYS.NOTIFICATION_COUNT] ?? 0
}

export async function setNotificationCount(count: number): Promise<void> {
  await chrome.storage.local.set({ [KEYS.NOTIFICATION_COUNT]: count })
  if (count > 0) {
    await chrome.action.setBadgeText({ text: String(count) })
    await chrome.action.setBadgeBackgroundColor({ color: '#22c55e' })
  } else {
    await chrome.action.setBadgeText({ text: '' })
  }
}
