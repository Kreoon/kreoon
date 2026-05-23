import type { VideoMetadata } from '../shared/types'

console.log('[Kreoon] Meta Ads content script loaded')

const btnMap = new WeakMap<HTMLElement, HTMLButtonElement>()

function extractAdData(container: HTMLElement): VideoMetadata {
  const video = container.querySelector('video')
  const videoUrl = video?.src || video?.currentSrc

  const adCopy =
    container.querySelector('[data-testid="ad_card_body"]')?.textContent?.trim() ||
    container.querySelector('[class*="adBody"]')?.textContent?.trim() ||
    container.textContent?.trim().substring(0, 600) ||
    ''

  const advertiser =
    container.querySelector('a[data-testid="ad_archive_page_link"]')?.textContent?.trim() ||
    container.querySelector('[class*="AdvertiserName"]')?.textContent?.trim() ||
    ''

  return {
    platform: 'meta-ads',
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
  btn.title = 'Capturar anuncio en Kreoon'
  btn.textContent = 'K'
  btn.style.top = `${rect.top + window.scrollY + 12}px`
  btn.style.right = 'auto'
  btn.style.left = `${rect.right + window.scrollX - 52}px`
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

  console.log('[Kreoon] Button mounted on Meta ad card')
}

function repositionAll() {
  btnMap.forEach((btn, container) => {
    const r = container.getBoundingClientRect()
    if (r.width > 0) {
      btn.style.top = `${r.top + window.scrollY + 12}px`
      btn.style.left = `${r.right + window.scrollX - 52}px`
    }
  })
}

function scanAds() {
  // Facebook Ads Library
  const selectors = [
    'div[data-testid="ad-archive-renderer"]',
    'div._7jyr',
    'div[class*="adCard"]',
    'div[class*="AdCard"]',
    // Generic: any div with a video inside that's reasonably sized
  ]
  selectors.forEach(sel => {
    document.querySelectorAll<HTMLElement>(sel).forEach(el => mountBtnOnContainer(el))
  })

  // Fallback: any video that's large enough
  document.querySelectorAll<HTMLVideoElement>('video').forEach(v => {
    const r = v.getBoundingClientRect()
    if (r.width >= 200) {
      let parent = v.parentElement as HTMLElement
      for (let i = 0; i < 5 && parent; i++) {
        if (parent.getBoundingClientRect().width > 300) {
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
