import { useState, useEffect, useRef } from 'react'
import { getSession, saveSession, getPendingCapture, clearPendingCapture, getPendingVideoBytes, clearPendingVideoBytes } from '../shared/storage'
import { getProductDetails, getProducts, saveContentItem, fetchOrganizationId } from '../shared/kreoon-api'
import { analyzeViralContent, generateScript } from '../shared/gemini-api'
import type { AuthSession, VideoMetadata, KreoonProduct } from '../shared/types'
import type { ExtensionMessage } from '../shared/messages'
import type { ViralAnalysis, ProductContext } from '../shared/gemini-api'

// Steps: idle → analyzing → editing → saving → done | error
type Step = 'idle' | 'analyzing' | 'editing' | 'saving' | 'done' | 'error'

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  'meta-ads': 'Meta Ads',
  'tiktok-ads': 'TikTok Ads',
}

export default function SidePanel() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [video, setVideo] = useState<VideoMetadata | null>(null)
  const [step, setStep] = useState<Step>('idle')
  const [analysis, setAnalysis] = useState<ViralAnalysis | null>(null)
  const [script, setScript] = useState('')
  const [savedId, setSavedId] = useState('')
  const [products, setProducts] = useState<KreoonProduct[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    init()
    const listener = (msg: ExtensionMessage) => {
      if (msg.type === 'VIDEO_CAPTURED') {
        setVideo(msg.payload)
        setStep('idle')
        setAnalysis(null)
        setScript('')
        setSavedId('')
        setError('')
        setSelectedProduct('')
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  async function init() {
    let s = await getSession()
    if (s && !s.organizationId) {
      const result = await fetchOrganizationId(s.access_token, s.user.id)
      if (result) {
        const [orgId, orgName] = result.split('||')
        s = { ...s, organizationId: orgId, organizationName: orgName || s.organizationName }
        await saveSession(s)
      }
    }
    setSession(s)
    setLoading(false)
    if (s) {
      const pending = await getPendingCapture()
      if (pending) setVideo(pending)
      if (s.organizationId) {
        const prods = await getProducts(s.access_token, s.organizationId).catch(() => [])
        setProducts(prods)
      }
    }
  }

  // ── STEP 1: Analyze (Gemini called directly from browser) ──
  async function handleAnalyze() {
    if (!session || !video || !selectedProduct) return
    setStep('analyzing')
    setError('')
    setStatusMsg('Analizando estructura viral...')

    try {
      // Get pending video bytes (frame or full video from content script)
      const pendingVideo = await getPendingVideoBytes()

      setStatusMsg('Gemini está analizando el contenido...')
      const result = await analyzeViralContent(
        video.platform,
        video.videoUrl || video.url,
        pendingVideo?.data,
        pendingVideo?.mimeType,
        {
          title: video.title,
          caption: video.caption,
          author: video.author,
          views: video.views,
          likes: video.likes,
          comments: video.comments,
          adCopy: video.adCopy,
        }
      )
      await clearPendingVideoBytes()
      setAnalysis(result)

      // Generate script using product details
      setStatusMsg('Generando guión para el producto...')
      const productDetails = await getProductDetails(session.access_token, selectedProduct)
      const product: ProductContext = productDetails || {
        id: selectedProduct,
        name: products.find(p => p.id === selectedProduct)?.name || '',
        client_id: products.find(p => p.id === selectedProduct)?.client_id || '',
        client_name: products.find(p => p.id === selectedProduct)?.client_name,
      }

      const generatedScript = await generateScript(result, product, video.platform, {
        title: video.title, caption: video.caption, author: video.author,
        views: video.views, likes: video.likes, adCopy: video.adCopy,
      })

      setScript(generatedScript)
      setStep('editing')
    } catch (err: any) {
      setStep('error')
      setError(err.message || 'Error al analizar el video')
    }
  }

  // ── STEP 2: Save to Kreoon (lightweight INSERT) ──
  async function handleSave() {
    if (!session || !video || !analysis || !selectedProduct) return
    setStep('saving')
    setStatusMsg('Guardando en Kreoon...')

    try {
      const productDetails = await getProductDetails(session.access_token, selectedProduct)
      const product: ProductContext = productDetails || {
        id: selectedProduct,
        name: products.find(p => p.id === selectedProduct)?.name || '',
        client_id: products.find(p => p.id === selectedProduct)?.client_id || '',
        client_name: products.find(p => p.id === selectedProduct)?.client_name,
      }

      const saved = await saveContentItem(
        session.access_token,
        session.organizationId!,
        product,
        video,
        analysis,
        script,
      )
      setSavedId(saved?.id || '')
      await clearPendingCapture()
      setStep('done')
    } catch (err: any) {
      setStep('error')
      setError(err.message || 'Error al guardar en Kreoon')
    }
  }

  function reset() {
    setStep('idle')
    setAnalysis(null)
    setScript('')
    setSavedId('')
    setVideo(null)
    setError('')
    setSelectedProduct('')
    setProductSearch('')
    setStatusMsg('')
  }

  const filteredProducts = products.filter(p => {
    if (!productSearch) return true
    const q = productSearch.toLowerCase()
    return p.name.toLowerCase().includes(q) || (p.client_name || '').toLowerCase().includes(q)
  })

  if (loading) {
    return (
      <div className="h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="h-screen bg-[#0a0a0a] flex items-center justify-center p-6 text-center">
        <div>
          <KreoonLogo className="mx-auto mb-4" />
          <p className="text-white text-sm font-semibold mb-1">Inicia sesión</p>
          <p className="text-gray-500 text-xs mb-4">Haz click en el icono de la extensión para autenticarte</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1f1f1f] flex-shrink-0">
        <KreoonLogo />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{session.organizationName || session.user.email}</p>
          <p className="text-[10px] text-gray-500">
            {session.organizationId
              ? `${products.length} productos`
              : '⚠ Sin organización — cierra sesión y vuelve a entrar'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Video card — always visible if captured */}
        {video && <VideoCard video={video} />}
        {!video && step === 'idle' && <EmptyState />}

        {/* ── IDLE: product selector + analyze button ── */}
        {video && step === 'idle' && (
          <div className="space-y-3">
            {products.length === 0 ? (
              <div className="bg-yellow-950 border border-yellow-700 rounded-xl p-4">
                <p className="text-yellow-300 text-xs font-semibold mb-1">Sin productos disponibles</p>
                <p className="text-yellow-400 text-[10px] leading-relaxed">
                  Crea un cliente con productos en Kreoon para activar el Guionizador.
                </p>
                <a href="https://kreoon.com/clients" target="_blank" rel="noopener noreferrer"
                  className="inline-block mt-2 text-[10px] text-yellow-300 hover:text-yellow-200 underline">
                  Ir a Kreoon → Clientes
                </a>
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">
                  ¿Para qué producto es este guión? <span className="text-green-500">*</span>
                </label>
                {products.length > 6 && (
                  <input
                    type="text"
                    placeholder="Buscar producto o cliente..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-500 mb-1.5"
                  />
                )}
                <select
                  value={selectedProduct}
                  onChange={e => setSelectedProduct(e.target.value)}
                  className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                  size={Math.min(filteredProducts.length + 1, 6)}
                >
                  <option value="" disabled>— Selecciona un producto —</option>
                  {filteredProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.client_name ? `${p.client_name} — ` : ''}{p.name}
                    </option>
                  ))}
                </select>
                {selectedProduct
                  ? <p className="text-[10px] text-green-400 mt-1.5">✓ Gemini analizará y generará el guión para este producto</p>
                  : <p className="text-[10px] text-gray-600 mt-1.5">Selecciona para activar el análisis con IA</p>
                }
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!selectedProduct}
              className="w-full bg-green-500 hover:bg-green-400 disabled:bg-[#1a1a1a] disabled:text-gray-600 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl text-sm transition-colors"
            >
              {!selectedProduct ? 'Selecciona un producto primero' : 'Analizar con IA y generar guión'}
            </button>
          </div>
        )}

        {/* ── ANALYZING ── */}
        {step === 'analyzing' && (
          <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5 text-center">
            <Spinner className="mx-auto mb-3" />
            <p className="text-sm text-white font-semibold mb-1">Analizando con Gemini AI</p>
            <p className="text-xs text-green-400 animate-pulse">{statusMsg}</p>
            <p className="text-[10px] text-gray-600 mt-2">Kreoon no se ve afectado — todo corre en tu browser</p>
          </div>
        )}

        {/* ── EDITING: analysis + editable script ── */}
        {step === 'editing' && analysis && (
          <EditingCard
            analysis={analysis}
            script={script}
            onScriptChange={setScript}
            onSave={handleSave}
            onDiscard={reset}
          />
        )}

        {/* ── SAVING ── */}
        {step === 'saving' && (
          <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5 text-center">
            <Spinner className="mx-auto mb-3" />
            <p className="text-sm text-white font-semibold mb-1">Guardando en Kreoon</p>
            <p className="text-xs text-gray-500 animate-pulse">{statusMsg}</p>
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div className="space-y-3">
            <div className="bg-green-950 border border-green-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-green-400 text-lg">✓</span>
                <p className="text-green-300 text-sm font-semibold">Guardado en Kreoon</p>
              </div>
              <p className="text-[10px] text-green-500">
                El guión y la referencia viral están listos. Abre el item para usar el Guionizador.
              </p>
            </div>
            {savedId && (
              <a
                href={`https://kreoon.com/board?item=${savedId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-green-500 hover:bg-green-400 text-black text-xs font-bold py-3 rounded-xl transition-colors"
              >
                Abrir en Kreoon → Guionizador
              </a>
            )}
            <button onClick={reset} className="w-full text-xs text-gray-600 hover:text-gray-400 py-1 transition-colors">
              Capturar otro video
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
        {step === 'error' && (
          <div className="bg-red-950 border border-red-800 rounded-xl p-4">
            <p className="text-red-300 text-sm font-semibold mb-1">Error</p>
            <p className="text-red-400 text-xs leading-relaxed">{error}</p>
            <button onClick={reset} className="mt-3 text-xs text-red-300 hover:text-red-200 underline">
              Intentar de nuevo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// EditingCard — shows analysis summary + editable script
// ─────────────────────────────────────────────────────────────

function EditingCard({
  analysis, script, onScriptChange, onSave, onDiscard
}: {
  analysis: ViralAnalysis
  script: string
  onScriptChange: (s: string) => void
  onSave: () => void
  onDiscard: () => void
}) {
  const [showAnalysis, setShowAnalysis] = useState(false)

  return (
    <div className="space-y-3">
      {/* Analysis summary */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-green-400 text-xs font-bold">Score viral: {analysis.viral_score}/100</span>
          </div>
          <button
            onClick={() => setShowAnalysis(s => !s)}
            className="text-[10px] text-gray-500 hover:text-gray-300"
          >
            {showAnalysis ? 'Ocultar análisis' : 'Ver análisis ↓'}
          </button>
        </div>

        {analysis.hooks.length > 0 && (
          <div className="mb-2">
            <p className="text-[10px] text-gray-500 mb-0.5">Hook detectado:</p>
            <p className="text-xs text-white">"{analysis.hooks[0]}"</p>
          </div>
        )}

        {analysis.narrative_formula && (
          <p className="text-[10px] text-gray-400">
            Fórmula: <span className="text-green-400">{analysis.narrative_formula}</span>
          </p>
        )}

        {showAnalysis && (
          <div className="mt-3 space-y-2 border-t border-[#1f1f1f] pt-3">
            {analysis.structure && (
              <div>
                <p className="text-[10px] text-gray-500 mb-0.5">Estructura:</p>
                <p className="text-[10px] text-gray-300">{analysis.structure}</p>
              </div>
            )}
            {analysis.emotion_triggers.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-500 mb-0.5">Triggers emocionales:</p>
                {analysis.emotion_triggers.slice(0, 3).map((t, i) => (
                  <p key={i} className="text-[10px] text-gray-300">• {t}</p>
                ))}
              </div>
            )}
            {analysis.whats_working.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-500 mb-0.5">Qué funciona:</p>
                {analysis.whats_working.slice(0, 2).map((w, i) => (
                  <p key={i} className="text-[10px] text-gray-300">• {w}</p>
                ))}
              </div>
            )}
            {analysis.transcription && (
              <div>
                <p className="text-[10px] text-gray-500 mb-0.5">Transcripción:</p>
                <p className="text-[10px] text-gray-400 line-clamp-4">{analysis.transcription}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editable script */}
      <div>
        <label className="text-xs text-gray-400 block mb-1.5">
          Guión generado <span className="text-[10px] text-gray-600">(edita antes de guardar)</span>
        </label>
        <textarea
          value={script}
          onChange={e => onScriptChange(e.target.value)}
          rows={12}
          className="w-full bg-[#111] border border-[#1f1f1f] rounded-xl px-3 py-2.5 text-xs text-white leading-relaxed focus:outline-none focus:border-green-500 resize-none"
          placeholder="El guión aparecerá aquí..."
        />
      </div>

      <button
        onClick={onSave}
        className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-xl text-sm transition-colors"
      >
        Guardar en Kreoon
      </button>
      <button
        onClick={onDiscard}
        className="w-full text-xs text-gray-600 hover:text-gray-400 py-1 transition-colors"
      >
        Descartar y capturar otro
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────

function VideoCard({ video }: { video: VideoMetadata }) {
  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <PlatformBadge platform={video.platform} />
        <span className="text-[10px] text-gray-500">
          {new Date(video.capturedAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      {video.title && <p className="text-sm font-semibold text-white leading-snug line-clamp-2">{video.title}</p>}
      {video.author && <p className="text-xs text-gray-400">@{video.author}</p>}
      {video.caption && !video.title && (
        <p className="text-xs text-gray-400 line-clamp-3">{video.caption}</p>
      )}
      {(video.views || video.likes) && (
        <div className="flex gap-3 pt-1">
          {video.views && <Metric label="Vistas" value={fmtNum(video.views)} />}
          {video.likes && <Metric label="Likes" value={fmtNum(video.likes)} />}
          {video.comments && <Metric label="Comentarios" value={fmtNum(video.comments)} />}
        </div>
      )}
      {video.adCopy && (
        <div className="bg-[#0a0a0a] rounded-lg p-2 mt-1">
          <p className="text-[10px] text-gray-500 mb-0.5">Copy del anuncio</p>
          <p className="text-xs text-gray-300 line-clamp-3">{video.adCopy}</p>
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-8 px-4">
      <div className="text-4xl mb-3">🎯</div>
      <p className="text-sm font-semibold text-white mb-1">Listo para capturar</p>
      <p className="text-xs text-gray-500 leading-relaxed">
        Navega por YouTube, Instagram, TikTok o Ads Manager. Aparecerá un botón K sobre los videos para capturarlos aquí.
      </p>
    </div>
  )
}

function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    youtube: 'bg-red-900 text-red-300',
    instagram: 'bg-purple-900 text-purple-300',
    tiktok: 'bg-gray-900 text-gray-300 border border-gray-700',
    'meta-ads': 'bg-blue-900 text-blue-300',
    'tiktok-ads': 'bg-gray-900 text-gray-300',
  }
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${colors[platform] || 'bg-gray-800 text-gray-400'}`}>
      {PLATFORM_LABELS[platform] || platform}
    </span>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className="text-xs font-semibold text-white">{value}</p>
    </div>
  )
}

function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin ${className}`} />
  )
}

function KreoonLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 ${className}`}>
      <span className="text-black font-bold text-xs">K</span>
    </div>
  )
}

function fmtNum(n?: number): string {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}
