import type { VideoMetadata } from '../shared/types'
import { prefetchVideoForAnalysis } from './video-capture-util'

console.log('[Kreoon] Instagram content script loaded')

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
  // Walk up to find the article/post container
  let container: Element | null = video
  for (let i = 0; i < 10; i++) {
    if (!container?.parentElement) break
    container = container.parentElement
    if (container.tagName === 'ARTICLE') break
  }

  const caption =
    container?.querySelector('span[class*="Caption"]')?.textContent?.trim() ||
    container?.querySelector('div._a9zs span')?.textContent?.trim() ||
    container?.querySelector('div[class*="Caption"] span')?.textContent?.trim() ||
    document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
    ''

  const authorMatch = window.location.pathname.match(/^\/([^/]+)\//)
  const author = authorMatch?.[1] || ''

  const likesEl = container?.querySelector('button[class*="like"] span') ||
    container?.querySelector('span[class*="like"]')

  return {
    platform: 'instagram',
    url: window.location.href,
    videoUrl: video.src || video.currentSrc || undefined,
    caption: caption.substring(0, 500),
    author,
    likes: likesEl ? parseNum(likesEl.textContent || '') : undefined,
    capturedAt: new Date().toISOString(),
  }
}

function mountBtnOnVideo(video: HTMLVideoElement) {
  if (btnMap.has(video)) return
  const rect = video.getBoundingClientRect()
  if (rect.width < 100 || rect.height < 100) return

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
    } catch (err) {
      console.error('[Kreoon] sendMessage failed:', err)
      btn.classList.remove('capturing')
      btn.textContent = 'K'
    }
  })

  console.log('[Kreoon] Button mounted on Instagram video')
}

function repositionAll() {
  btnMap.forEach((btn, video) => {
    const r = video.getBoundingClientRect()
    if (r.width > 0) {
      btn.style.top = `${r.top + window.scrollY + 12}px`
      btn.style.left = `${r.left + window.scrollX + 12}px`
    }
  })
}

function scanVideos() {
  document.querySelectorAll<HTMLVideoElement>('video').forEach(v => {
    const r = v.getBoundingClientRect()
    if (r.width >= 100 && r.height >= 100) mountBtnOnVideo(v)
  })
}

window.addEventListener('scroll', repositionAll, { passive: true })
window.addEventListener('resize', repositionAll, { passive: true })

setInterval(scanVideos, 800)
scanVideos()
