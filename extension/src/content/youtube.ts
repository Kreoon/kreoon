import type { VideoMetadata } from '../shared/types'

console.log('[Kreoon] YouTube content script loaded')

let btn: HTMLButtonElement | null = null
let lastVideoId: string | null = null
let rafId: number | null = null

function getVideoId(): string | null {
  return new URLSearchParams(window.location.search).get('v')
}

function getMetadata(): VideoMetadata | null {
  const videoId = getVideoId()
  if (!videoId) return null

  const title =
    (document.querySelector('h1.ytd-watch-metadata yt-formatted-string') as HTMLElement)?.innerText?.trim() ||
    document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    document.title.replace(' - YouTube', '').trim()

  const author =
    (document.querySelector('ytd-channel-name a') as HTMLElement)?.innerText?.trim() ||
    (document.querySelector('#owner #channel-name a') as HTMLElement)?.innerText?.trim() ||
    ''

  const viewsEl = document.querySelector('.view-count') ||
    document.querySelector('[class*="view-count"]')
  const views = parseNum(viewsEl?.textContent || '')

  return {
    platform: 'youtube',
    url: window.location.href,
    videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
    title,
    author: author.replace(/^@/, ''),
    views: views || undefined,
    capturedAt: new Date().toISOString(),
  }
}

function parseNum(text: string): number {
  const s = text.replace(/[^0-9.,KMBkmb]/gi, '').trim()
  const n = parseFloat(s.replace(',', '.'))
  if (isNaN(n)) return 0
  if (/m/i.test(s)) return Math.round(n * 1_000_000)
  if (/k/i.test(s)) return Math.round(n * 1_000)
  return Math.round(n)
}

function getPlayerRect(): DOMRect | null {
  const player =
    document.querySelector('#movie_player video') as HTMLVideoElement ||
    document.querySelector('.html5-video-container video') as HTMLVideoElement ||
    document.querySelector('video') as HTMLVideoElement
  if (!player) return null
  const r = player.getBoundingClientRect()
  if (r.width === 0 || r.height === 0) return null
  return r
}

function positionBtn(rect: DOMRect) {
  if (!btn) return
  btn.style.top = `${rect.top + 12}px`
  btn.style.left = `${rect.left + 12}px`
}

function trackBtn() {
  if (!btn) return
  const rect = getPlayerRect()
  if (rect) positionBtn(rect)
  rafId = requestAnimationFrame(trackBtn)
}

function mountBtn() {
  if (btn) btn.remove()
  const rect = getPlayerRect()
  if (!rect) return

  btn = document.createElement('button')
  btn.className = 'kreoon-capture-btn'
  btn.title = 'Capturar en Kreoon'
  btn.textContent = 'K'
  document.body.appendChild(btn)
  positionBtn(rect)

  btn.addEventListener('click', async (e) => {
    e.stopPropagation()
    e.preventDefault()
    const metadata = getMetadata()
    if (!metadata || !btn) return
    btn.classList.add('capturing')
    btn.textContent = '⟳'
    try {
      const result = await chrome.runtime.sendMessage({ type: 'CAPTURE_VIDEO', payload: metadata })
      btn.classList.remove('capturing')
      if (result?.error === 'no_auth') {
        btn.textContent = '!'
        btn.title = 'Inicia sesión en la extensión Kreoon'
        setTimeout(() => { if (btn) { btn.textContent = 'K'; btn.title = 'Capturar en Kreoon' } }, 3000)
      } else {
        btn.classList.add('done')
        btn.textContent = '✓'
        setTimeout(() => { if (btn) { btn.classList.remove('done'); btn.textContent = 'K' } }, 3000)
      }
    } catch (err) {
      console.error('[Kreoon] sendMessage error:', err)
      btn.classList.remove('capturing')
      btn.textContent = 'K'
    }
  })

  if (rafId) cancelAnimationFrame(rafId)
  trackBtn()
  console.log('[Kreoon] Button mounted on YouTube player')
}

function checkAndMount() {
  const videoId = getVideoId()
  if (!videoId) {
    btn?.remove()
    btn = null
    if (rafId) cancelAnimationFrame(rafId)
    return
  }
  if (videoId !== lastVideoId || !btn || !document.body.contains(btn)) {
    lastVideoId = videoId
    mountBtn()
  }
}

// Poll every 500ms — handles SPA navigation and late DOM load
setInterval(checkAndMount, 500)
checkAndMount()
