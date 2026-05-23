import { getSession, saveSession, setNotificationCount, savePendingCapture } from '../shared/storage'
import { getNotifications, refreshSession } from '../shared/kreoon-api'
import type { ExtensionMessage } from '../shared/messages'
import type { VideoMetadata } from '../shared/types'

const ALARM_POLL = 'kreoon_poll_notifications'

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_POLL, { periodInMinutes: 1 })
  chrome.sidePanel.setOptions({ enabled: true }).catch(console.error)
  console.log('[Kreoon SW] Installed')
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_POLL) return
  pollNotifications().catch(console.error)
})

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) chrome.sidePanel.open({ tabId: tab.id }).catch(console.error)
})

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    if (message.type === 'CAPTURE_VIDEO') {
      // Open side panel SYNCHRONOUSLY while still in user gesture context
      if (sender.tab?.id) {
        chrome.sidePanel.open({ tabId: sender.tab.id }).catch(console.error)
      }
      handleCapture(message.payload, sendResponse)
      return true
    }

    // All other messages
    handleOther(message)
      .then(r => sendResponse(r ?? { ok: true }))
      .catch(err => sendResponse({ error: String(err) }))
    return true
  }
)

function handleCapture(payload: VideoMetadata, sendResponse: (r: any) => void) {
  // Step 1: auth check (fast, just reads chrome.storage)
  getSession()
    .then(session => {
      if (!session) {
        sendResponse({ error: 'no_auth' })
        return
      }
      // Step 2: save pending capture (fast, just writes chrome.storage)
      return savePendingCapture(payload).then(() => {
        // Step 3: respond NOW — before any slow Chrome API calls
        sendResponse({ ok: true })
        console.log('[Kreoon SW] Capture saved, opening side panel...')
        // Step 4: open side panel independently (fire and forget)
        openSidePanel(payload)
      })
    })
    .catch(err => {
      console.error('[Kreoon SW] handleCapture error:', err)
      sendResponse({ error: String(err) })
    })
}

function openSidePanel(payload: VideoMetadata) {
  // Panel was opened synchronously in the message listener.
  // Notify it once it finishes mounting — use callback form to access
  // lastError explicitly so Chrome doesn't emit "Unchecked runtime.lastError".
  setTimeout(() => {
    chrome.runtime.sendMessage({ type: 'VIDEO_CAPTURED', payload }, () => {
      void chrome.runtime.lastError // suppress "Receiving end does not exist"
    })
  }, 1000)
}

async function handleOther(message: ExtensionMessage): Promise<any> {
  console.log('[Kreoon SW] Message:', message.type)
  switch (message.type) {
    case 'GET_AUTH_STATE': {
      const session = await getSession()
      return { isLoggedIn: !!session, email: session?.user.email }
    }
    case 'AUTH_CHANGED': {
      if (!message.payload.isLoggedIn) {
        await setNotificationCount(0)
      } else {
        pollNotifications().catch(console.error)
      }
      return { ok: true }
    }
    default:
      return { ok: true }
  }
}

async function pollNotifications() {
  let session = await getSession()
  if (!session) return

  if (Date.now() > session.expiresAt - 300_000) {
    try {
      const refreshed = await refreshSession(session.refresh_token)
      refreshed.organizationId = session.organizationId
      refreshed.organizationName = session.organizationName
      await saveSession(refreshed)
      session = refreshed
    } catch {
      return
    }
  }

  const notifications = await getNotifications(session.access_token, session.user.id)
  await setNotificationCount(notifications.length)
  if (notifications.length > 0) {
    chrome.runtime.sendMessage({
      type: 'NOTIFICATION_COUNT',
      payload: { count: notifications.length },
    }).catch(() => {})
  }
}
