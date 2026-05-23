import type { VideoMetadata, CaptureResult } from './types'

export type ExtensionMessage =
  | { type: 'CAPTURE_VIDEO'; payload: VideoMetadata }
  | { type: 'OPEN_SIDEPANEL' }
  | { type: 'SIDEPANEL_READY' }
  | { type: 'VIDEO_CAPTURED'; payload: VideoMetadata }
  | { type: 'CAPTURE_STARTED' }
  | { type: 'CAPTURE_COMPLETE'; payload: CaptureResult }
  | { type: 'CAPTURE_ERROR'; payload: { error: string } }
  | { type: 'AUTH_CHANGED'; payload: { isLoggedIn: boolean } }
  | { type: 'NOTIFICATION_COUNT'; payload: { count: number } }
  | { type: 'GET_AUTH_STATE' }
  | { type: 'AUTH_STATE_RESPONSE'; payload: { isLoggedIn: boolean; email?: string } }

export function sendToBackground(message: ExtensionMessage): Promise<void> {
  return chrome.runtime.sendMessage(message)
}

export function sendToTab(tabId: number, message: ExtensionMessage): Promise<void> {
  return chrome.tabs.sendMessage(tabId, message)
}
