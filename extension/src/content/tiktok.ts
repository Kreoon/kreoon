import type { VideoMetadata } from '../shared/types'
import { prefetchVideoForAnalysis } from './video-capture-util'

console.log('[Kreoon] TikTok content script loaded')

const btnMap = new WeakMap<HTMLVideoElement, HTMLButtonElement>()

function parseNum(text: string): number {
  const s = text.replace(/[^0-9.,KMBkmb]/gi, '').trim()
  const n = parseFloat(s.replace(',', '.'))
  if (isNaN(n)) return 0
  if (/m/i.test(s)) return Math.round(n * 1_000_000)
  if (/k/i.test(s)) return Math.round(n * 1_000)
  return Math.round(n)
}

function extractMetadata(video: HTMLVideoElement): VideoMetadata {
  const pageUrl = window.location.href

  const caption =
    document.querySelector('[data-e2e="browse-video-desc"]')?.textContent?.trim() ||
    document.querySelector('[data-e2e="video-desc"]')?.textContent?.trim() ||
    document.querySelector('h1[data-e2e="video-title"]')?.textContent?.trim() ||
    ''

  const author =
    document.querySelector('[data-e2e="browse-username"]')?.textContent?.trim() ||
    document.querySelector('[data-e2e="video-author-uniqueid"]')?.textContent?.trim() ||
    document.querySelector('a[data-e2e="video-author-avatar"]')?.getAttribute('href')?.replace('/@', '') ||
    ''

  const likesEl = document.querySelector('[data-e2e="like-count"]') ||
    document.querySelector('[data-e2e="browse-like-count"]')
  const commentsEl = document.querySelector('[data-e2e="comment-count"]') ||
    document.querySelector('[data-e2e="browse-comment-count"]')

  return {
    platform: 'tiktok',
    url: pageUrl,
    videoUrl: video.src || video.currentSrc || undefined,
    caption: caption.substring(0, 500),
    author: author.replace(/^@/, ''),
    likes: likesEl ? parseNum(likesEl.textContent || '') : undefined,
    comments: commentsEl ? parseNum(commentsEl.textContent || '') : undefined,
    capturedAt: new Date().toISOString(),
  }
}

function mountBtnOnVideo(video: HTMLVideoElement) {
  if (btnMap.has(video)) {
    // Update position in case it moved
    const existingBtn = btnMap.get(video)!
    const r = video.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) {
      existingBtn.style.top = `${r.top + window.scrollY + 12}px`
      existingBtn.style.left = `${r.left + window.scrollX + 12}px`
    }
    return
  }

  const rect = video.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return

  const btn = document.createElement('button')
  btn.className = 'kreoon-capture-btn'
  btn.title = 'Capturar en Kreoon'
  btn.textContent = 'K'
  btn.style.top = `${rect.top + window.scrollY + 12}px`
  btn.style.left = `${rect.left + window.scrollX + 12}px`
  document.body.appendChild(btn)
  btnMap.set(video, btn)

  btn.addEventListener('click', async (e) => {
    e.stopPropagation()
    e.preventDefault()
    const metadata = extractMetadata(video)
    btn.classList.add('capturing')
    btn.textContent = '⟳'

    // Capture frame sync + start video download async (non-blocking, no page freeze)
    prefetchVideoForAnalysis(video, metadata.videoUrl || '').catch(console.warn)

    try {
      const result = await chrome.runtime.sendMessage({ type: 'CAPTURE_VIDEO', payload: metadata })
      btn.classList.remove('capturing')
      if (result?.error === 'no_auth') {
        btn.textContent = '!'
        btn.title = 'Inicia sesión en la extensión Kreoon'
        setTimeout(() => { btn.textContent = 'K'; btn.title = 'Capturar en Kreoon' }, 3000)
      } else {
        btn.classList.add('done')
        btn.textContent = '✓'
        setTimeout(() => { btn.classList.remove('done'); btn.textContent = 'K' }, 3000)
      }
    } catch {
      btn.classList.remove('capturing')
      btn.textContent = 'K'
    }
  })

  console.log('[Kreoon] Button mounted on TikTok video')
}

function scanVideos() {
  const videos = document.querySelectorAll<HTMLVideoElement>('video')
  videos.forEach(v => {
    const r = v.getBoundingClientRect()
    if (r.width > 200 && r.height > 200) mountBtnOnVideo(v)
  })
}

// Reposition all buttons on scroll/resize
function repositionAll() {
  btnMap.forEach((btn, video) => {
    const r = video.getBoundingClientRect()
    if (r.width > 0) {
      btn.style.top = `${r.top + window.scrollY + 12}px`
      btn.style.left = `${r.left + window.scrollX + 12}px`
    }
  })
}

window.addEventListener('scroll', repositionAll, { passive: true })
window.addEventListener('resize', repositionAll, { passive: true })

setInterval(scanVideos, 800)
scanVideos()
