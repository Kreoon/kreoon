import type { VideoMetadata } from '../shared/types'

console.log('[Kreoon] TikTok Ads content script loaded')

const btnMap = new WeakMap<HTMLElement, HTMLButtonElement>()

function extractAdData(container: HTMLElement): VideoMetadata {
  const video = container.querySelector('video')
  const videoUrl = video?.src || video?.currentSrc

  const adCopy =
    container.querySelector('[class*="text"]')?.textContent?.trim() ||
    container.querySelector('p')?.textContent?.trim() ||
    ''

  const advertiser =
    container.querySelector('[class*="brand"]')?.textContent?.trim() ||
    container.querySelector('[class*="advertiser"]')?.textContent?.trim() ||
    ''

  return {
    platform: 'tiktok-ads',
    url: window.location.href,
    videoUrl: videoUrl || undefined,
    author: advertiser,
    adCopy: adCopy.substring(0, 800),
    adType: video ? 'video' : 'image',
    capturedAt: new Date().toISOString(),
  }
}

function mountBtnOnContainer(container: HTMLElement) {
  if (btnMap.has(container)) return
  const rect = container.getBoundingClientRect()
  if (rect.width < 100) return

  const btn = document.createElement('button')
  btn.className = 'kreoon-capture-btn'
  btn.title = 'Capturar en Kreoon'
  btn.textContent = 'K'
  btn.style.top = `${rect.top + window.scrollY + 12}px`
  btn.style.left = `${rect.left + window.scrollX + 12}px`
  document.body.appendChild(btn)
  btnMap.set(container, btn)

  btn.addEventListener('click', async (e) => {
    e.stopPropagation()
    e.preventDefault()
    const metadata = extractAdData(container)
    btn.classList.add('capturing')
    btn.textContent = '⟳'
    try {
      await chrome.runtime.sendMessage({ type: 'CAPTURE_VIDEO', payload: metadata })
      btn.classList.remove('capturing')
      btn.classList.add('done')
      btn.textContent = '✓'
      setTimeout(() => { btn.classList.remove('done'); btn.textContent = 'K' }, 3000)
    } catch {
      btn.classList.remove('capturing')
      btn.textContent = 'K'
    }
  })
}

function repositionAll() {
  btnMap.forEach((btn, container) => {
    const r = container.getBoundingClientRect()
    if (r.width > 0) {
      btn.style.top = `${r.top + window.scrollY + 12}px`
      btn.style.left = `${r.left + window.scrollX + 12}px`
    }
  })
}

function scanAds() {
  const selectors = [
    '[class*="creative-card"]',
    '[class*="CreativeCard"]',
    'li[class*="creative"]',
    'div[data-creative-id]',
  ]
  selectors.forEach(sel => {
    document.querySelectorAll<HTMLElement>(sel).forEach(el => mountBtnOnContainer(el))
  })

  // Fallback for videos
  document.querySelectorAll<HTMLVideoElement>('video').forEach(v => {
    const r = v.getBoundingClientRect()
    if (r.width >= 150) {
      let parent = v.parentElement as HTMLElement
      for (let i = 0; i < 4 && parent; i++) {
        if (parent.getBoundingClientRect().width > 200) {
          mountBtnOnContainer(parent)
          break
        }
        parent = parent.parentElement as HTMLElement
      }
    }
  })
}

window.addEventListener('scroll', repositionAll, { passive: true })
window.addEventListener('resize', repositionAll, { passive: true })

setInterval(scanAds, 800)
scanAds()
