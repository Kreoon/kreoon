import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useMarketplaceCampaigns } from '@/hooks/useMarketplaceCampaigns';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle2, ArrowLeft, ArrowRight, Rocket, Loader2, Sparkles, CreditCard } from 'lucide-react';

// ── Tipos ────────────────────────────────────────────────────────────────────

type ContentChoice = { id: string; emoji: string; label: string; hint: string; category: string };
type PaymentChoice = { id: 'paid' | 'exchange' | 'hybrid'; emoji: string; label: string; hint: string };
type DeadlineChoice = { label: string; days: number };
type SimpleChoice = { label: string; value: number; emoji: string };
type CollabChoice = { id: 'ugc_only' | 'post_required' | 'post_optional'; emoji: string; label: string; hint: string };

// ── Constantes ────────────────────────────────────────────────────────────────

const CONTENT_CHOICES: ContentChoice[] = [
  { id: 'UGC', emoji: '🎬', label: 'Video UGC', hint: 'Videos naturales y auténticos', category: 'ugc' },
  { id: 'Reels/TikTok', emoji: '📱', label: 'Reels / TikTok', hint: 'Videos cortos para redes', category: 'ugc' },
  { id: 'Testimonio', emoji: '🎤', label: 'Testimonio', hint: 'Clientes reales hablan de tu marca', category: 'ugc' },
  { id: 'Unboxing', emoji: '📦', label: 'Unboxing', hint: 'Abriendo y mostrando el producto', category: 'ugc' },
  { id: 'Tutorial', emoji: '🎓', label: 'Tutorial', hint: 'Cómo usar tu producto paso a paso', category: 'ugc' },
  { id: 'Reseña', emoji: '⭐', label: 'Reseña', hint: 'Opinión honesta del producto', category: 'ugc' },
  { id: 'VSL', emoji: '🚀', label: 'Video de Ventas', hint: 'Video para convertir clientes', category: 'ugc' },
  { id: 'Otro', emoji: '✨', label: 'Otro', hint: 'Tengo una idea diferente', category: 'ugc' },
];

const PAYMENT_CHOICES: PaymentChoice[] = [
  { id: 'paid', emoji: '💰', label: 'Dinero', hint: 'Pago en efectivo por cada video' },
  { id: 'exchange', emoji: '🎁', label: 'Producto gratis', hint: 'Envías tu producto a cambio del contenido' },
  { id: 'hybrid', emoji: '💰🎁', label: 'Dinero + Producto', hint: 'Pagas y también envías el producto' },
];

const DEADLINE_CHOICES: DeadlineChoice[] = [
  { label: '1 semana', days: 7 },
  { label: '2 semanas', days: 14 },
  { label: '1 mes', days: 30 },
  { label: '2 meses', days: 60 },
];

const CREATORS_CHOICES: SimpleChoice[] = [
  { label: '1 creador', value: 1, emoji: '🧑' },
  { label: '3 creadores', value: 3, emoji: '👥' },
  { label: '5 creadores', value: 5, emoji: '👨‍👩‍👧‍👦' },
  { label: '10 creadores', value: 10, emoji: '🏟️' },
];

const VIDEOS_PER_CREATOR_CHOICES: SimpleChoice[] = [
  { label: '1 video', value: 1, emoji: '🎞️' },
  { label: '2 videos', value: 2, emoji: '🎞️🎞️' },
  { label: '3 videos', value: 3, emoji: '📼' },
  { label: '5 videos', value: 5, emoji: '🎬' },
];

const BUDGET_PRESETS = [30, 50, 100, 150, 200];

const COLLAB_CHOICES: CollabChoice[] = [
  { id: 'ugc_only', emoji: '📦', label: 'Solo entrega videos', hint: 'El creador graba y te entrega el archivo. No publica en sus redes.' },
  { id: 'post_required', emoji: '📣', label: 'Entrega + publicación obligatoria', hint: 'Debe publicarlo en sus redes sociales además de entregarte el video.' },
  { id: 'post_optional', emoji: '💫', label: 'Entrega + publicación opcional', hint: 'Te entrega el video. Si quiere publicarlo también, bienvenido.' },
];

// ── Componentes UI ────────────────────────────────────────────────────────────

function BigOption({ emoji, label, hint, selected, onClick }: {
  emoji: string; label: string; hint?: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 text-center w-full cursor-pointer select-none active:scale-95 hover:scale-[1.02]',
        selected
          ? 'border-purple-500 bg-purple-500/15 shadow-lg shadow-purple-500/20'
          : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10',
      )}
    >
      {selected && (
        <span className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-3 w-3 text-white" />
        </span>
      )}
      <span className="text-3xl leading-none">{emoji}</span>
      <span className={cn('font-semibold text-sm', selected ? 'text-purple-300' : 'text-white')}>{label}</span>
      {hint && <span className="text-xs text-muted-foreground leading-tight">{hint}</span>}
    </button>
  );
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="w-full flex items-center gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1.5 rounded-full flex-1 transition-all duration-300',
            i < step ? 'bg-purple-500' : i === step ? 'bg-purple-500/50' : 'bg-white/10',
          )}
        />
      ))}
    </div>
  );
}

// ── Wizard principal ──────────────────────────────────────────────────────────

// Steps 0-10 son formulario, step 11 es review
const TOTAL_STEPS = 12;

export default function EasyCampaignWizard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { createCampaign } = useMarketplaceCampaigns();
  const selectedClientId = localStorage.getItem('selectedClientId') ?? null;

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Datos del formulario
  const [contentType, setContentType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadlineDays, setDeadlineDays] = useState(14);
  const [creatorsValue, setCreatorsValue] = useState(3);
  const [videosPerCreator, setVideosPerCreator] = useState(1);
  const [paymentType, setPaymentType] = useState<'paid' | 'exchange' | 'hybrid'>('paid');
  const [budgetPerVideo, setBudgetPerVideo] = useState(100);
  const [customBudget, setCustomBudget] = useState('');
  const [showCustomBudget, setShowCustomBudget] = useState(false);
  const [customTotalBudget, setCustomTotalBudget] = useState('');
  const [useCustomTotal, setUseCustomTotal] = useState(false);
  const [productName, setProductName] = useState('');
  const [productValue, setProductValue] = useState('');
  const [collabType, setCollabType] = useState<'ugc_only' | 'post_required' | 'post_optional'>('ugc_only');

  // Cantidades personalizadas
  const [showCustomCreators, setShowCustomCreators] = useState(false);
  const [customCreatorsStr, setCustomCreatorsStr] = useState('');
  const [showCustomVPC, setShowCustomVPC] = useState(false);
  const [customVPCStr, setCustomVPCStr] = useState('');

  // Gestión de contenido
  const [managementType, setManagementType] = useState<'kreoon' | 'self'>('kreoon');

  // Comisión según modo de gestión
  // kreoon: 30% (KREOON escribe guiones, selecciona creadores, produce)
  // self:   15% (cliente gestiona su propio contenido, solo usa la plataforma)
  const commissionRate = managementType === 'kreoon' ? 30 : 15;

  // Imagen de portada 9:16
  const [campaignImageFile, setCampaignImageFile] = useState<File | null>(null);
  const [campaignImagePreview, setCampaignImagePreview] = useState('');
  const [campaignImageUrl, setCampaignImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const selectedContent = CONTENT_CHOICES.find(c => c.id === contentType);
  const totalVideos = creatorsValue * videosPerCreator;

  const effectiveBudgetPerVideo = showCustomBudget ? Number(customBudget) || 0 : budgetPerVideo;
  const autoTotal = paymentType !== 'exchange' ? effectiveBudgetPerVideo * totalVideos : 0;
  const effectiveTotal = useCustomTotal ? Number(customTotalBudget) || 0 : autoTotal;

  // ── IA ────────────────────────────────────────────────────────────────────
  const [aiTitles, setAiTitles] = useState<string[]>([]);
  const [loadingTitles, setLoadingTitles] = useState(false);
  const [loadingDesc, setLoadingDesc] = useState(false);

  const callWizardAI = useCallback(async (action: 'generate_titles' | 'generate_description') => {
    try {
      const payload: Record<string, string | null> = { action, contentType, clientId: selectedClientId };
      if (action === 'generate_description') payload.title = title;
      const { data, error } = await supabase.functions.invoke('campaign-wizard-ai', { body: payload });
      if (error) throw error;
      return data;
    } catch {
      return null;
    }
  }, [contentType, title, selectedClientId]);

  useEffect(() => {
    if (step !== 1 || !contentType) return;
    setLoadingTitles(true);
    setAiTitles([]);
    callWizardAI('generate_titles').then(data => {
      if (data?.titles?.length) setAiTitles(data.titles);
      setLoadingTitles(false);
    });
  }, [step, contentType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Validación por paso ───────────────────────────────────────────────────
  const canNext = () => {
    switch (step) {
      case 0: return !!contentType;
      case 1: return title.trim().length >= 3;
      case 2: return description.trim().length >= 10;
      case 3: return true;
      case 4: return true;
      case 5: return true;
      case 6: return true;
      case 7:
        if (paymentType === 'paid' || paymentType === 'hybrid') {
          return effectiveBudgetPerVideo > 0;
        }
        return paymentType === 'exchange' ? productName.trim().length > 0 : true;
      case 8: return true;
      case 9: return !!managementType; // gestión de contenido
      case 10: return true; // imagen opcional
      default: return true;
    }
  };

  const next = () => { if (step < TOTAL_STEPS - 1 && canNext()) setStep(s => s + 1); };
  const back = () => { if (step > 0) setStep(s => s - 1); };

  const getDeadlineISO = () => {
    const d = new Date();
    d.setDate(d.getDate() + deadlineDays);
    return d.toISOString().slice(0, 10);
  };

  const handleImageSelect = async (file: File) => {
    setCampaignImageFile(file);
    setCampaignImagePreview(URL.createObjectURL(file));
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `campaign-covers/${Date.now()}.${ext}`;
      const { data: up, error: upErr } = await supabase.storage
        .from('marketplace-media')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (!upErr && up) {
        const { data: { publicUrl } } = supabase.storage
          .from('marketplace-media')
          .getPublicUrl(up.path);
        setCampaignImageUrl(publicUrl);
      }
    } catch { /* imagen es opcional, no bloquear */ }
    setUploadingImage(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const category = selectedContent?.category || 'ugc';
    const requiresPayment = paymentType !== 'exchange' && effectiveTotal > 0;

    const campaignData: Record<string, any> = {
      title: title.trim(),
      description: description.trim(),
      category,
      campaign_type: paymentType,
      budget_mode: 'per_video',
      budget_per_video: paymentType !== 'exchange' ? effectiveBudgetPerVideo : 0,
      total_budget: effectiveTotal,
      max_creators: creatorsValue,
      deadline: getDeadlineISO(),
      visibility: 'public',
      // Campañas de pago/híbridas quedan en draft hasta que se pague
      status: requiresPayment ? 'draft' : 'active',
      content_requirements: [
        { content_type: contentType, quantity: totalVideos, description: `${videosPerCreator} video${videosPerCreator > 1 ? 's' : ''} por creador` },
      ],
      collaboration_type: collabType,
      requires_portfolio: false,
      auto_approve_applications: false,
      exchange_product_name: paymentType !== 'paid' ? productName : '',
      exchange_product_value: productValue ? Number(productValue) : 0,
      exchange_product_description: '',
      tags: [contentType.toLowerCase().replace(/\//g, '-')],
      // Gestión de contenido y comisión
      content_management_type: managementType,
      commission_rate: commissionRate,
      requires_agency_support: managementType === 'kreoon',
      // Cliente que crea la campaña
      ...(selectedClientId ? { client_id: selectedClientId } : {}),
      ...(campaignImageUrl ? { cover_image_url: campaignImageUrl } : {}),
    };

    const id = await createCampaign(campaignData);
    if (!id) { setSubmitting(false); return; }

    if (requiresPayment) {
      // Redirigir a Stripe para pagar anticipadamente
      try {
        const { data, error } = await supabase.functions.invoke(
          'campaign-checkout/create-publish-checkout',
          { body: { campaign_id: id } }
        );
        if (error || !data?.checkout_url) throw new Error(data?.error || 'Error al iniciar el pago');
        // Stripe maneja la redirección — no mostramos success screen aquí
        window.location.href = data.checkout_url;
        return;
      } catch (err: any) {
        toast.error(`No se pudo iniciar el pago: ${err.message}. La campaña quedó guardada como borrador.`);
        setSubmitting(false);
        navigate('/marketplace/my-campaigns');
        return;
      }
    }

    // Canje: sin pago monetario, activar directo
    setSubmitting(false);
    setDone(true);
    setTimeout(() => navigate('/marketplace/my-campaigns'), 2200);
  };

  // ── Pantalla de éxito ──────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center px-6">
        <div className="w-24 h-24 rounded-full bg-green-500/15 flex items-center justify-center animate-bounce">
          <span className="text-5xl">🎉</span>
        </div>
        <h2 className="text-2xl font-bold text-white">¡Campaña publicada!</h2>
        <p className="text-muted-foreground max-w-xs">
          Los creadores ya pueden ver tu campaña y aplicar. Te notificaremos cuando lleguen solicitudes.
        </p>
      </div>
    );
  }

  // ── Resumen final ──────────────────────────────────────────────────────────
  const renderReview = () => {
    const payment = PAYMENT_CHOICES.find(p => p.id === paymentType);
    const deadline = DEADLINE_CHOICES.find(d => d.days === deadlineDays);
    const creators = CREATORS_CHOICES.find(c => c.value === creatorsValue);
    const vpCreator = VIDEOS_PER_CREATOR_CHOICES.find(v => v.value === videosPerCreator);
    const creatorsLabel = showCustomCreators ? `${creatorsValue} creadores` : creators?.label;
    const vpcLabel = showCustomVPC ? `${videosPerCreator} videos` : vpCreator?.label;
    const collab = COLLAB_CHOICES.find(c => c.id === collabType);

    const rows = [
      { emoji: selectedContent?.emoji || '🎬', label: 'Tipo de contenido', value: selectedContent?.label },
      { emoji: '📝', label: 'Nombre de la campaña', value: title },
      { emoji: '⏰', label: 'Plazo de entrega', value: deadline?.label },
      { emoji: '👥', label: 'Creadores', value: creatorsLabel },
      { emoji: '🎞️', label: 'Videos por creador', value: vpcLabel },
      { emoji: '🎬', label: 'Total de videos', value: `${totalVideos} videos` },
      { emoji: payment?.emoji || '💰', label: 'Compensación', value: payment?.label },
      ...(paymentType !== 'exchange' ? [
        { emoji: '💵', label: 'Pago por video', value: `$${effectiveBudgetPerVideo} USD` },
        { emoji: '💼', label: 'Valor total de campaña', value: `$${effectiveTotal} USD` },
      ] : []),
      ...(paymentType !== 'paid' && productName ? [
        { emoji: '🎁', label: 'Producto a enviar', value: productName },
      ] : []),
      ...(productValue && paymentType !== 'paid' ? [
        { emoji: '🏷️', label: 'Valor aprox. del producto', value: `$${productValue} USD` },
      ] : []),
      { emoji: collab?.emoji || '📦', label: 'Tipo de colaboración', value: collab?.label },
      {
        emoji: managementType === 'kreoon' ? '🚀' : '📋',
        label: 'Gestión de contenido',
        value: managementType === 'kreoon' ? 'KREOON lo gestiona' : 'Yo gestiono',
      },
    ];

    return (
      <div className="space-y-4">
        <div>
          <p className="text-purple-400 font-medium text-sm uppercase tracking-wider mb-1">Revisa tu campaña</p>
          <h2 className="text-2xl font-bold text-white">¿Todo se ve bien? 👀</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {paymentType !== 'exchange' && effectiveTotal > 0
              ? 'Al confirmar serás redirigido a pagar. El pago es anticipado y activa la campaña.'
              : 'Al confirmar la campaña quedará activa para que los creadores apliquen.'}
          </p>
        </div>
        {campaignImagePreview && (
          <div className="flex justify-center">
            <div className="relative w-32 rounded-xl overflow-hidden border border-white/20" style={{ aspectRatio: '9/16' }}>
              <img src={campaignImagePreview} alt="Portada" className="w-full h-full object-cover" />
              {uploadingImage && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </div>
          </div>
        )}
        <div className="bg-white/5 rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden">
          {rows.map(row => (
            <div key={row.label} className="flex items-center gap-3 px-4 py-3">
              <span className="text-xl w-7 text-center">{row.emoji}</span>
              <span className="text-muted-foreground text-sm flex-1">{row.label}</span>
              <span className="text-white font-medium text-sm text-right max-w-[160px] truncate">{row.value}</span>
            </div>
          ))}
        </div>

        {/* Desglose de pago */}
        {paymentType !== 'exchange' && effectiveTotal > 0 && (() => {
          const commission = Math.round(effectiveTotal * commissionRate) / 100;
          const totalToPay = effectiveTotal + commission;
          return (
            <div className="bg-purple-500/8 border border-purple-500/25 rounded-2xl p-4 space-y-2">
              <p className="text-purple-300 font-semibold text-sm mb-3">💳 Resumen de pago</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pago a creadores ({totalVideos} videos × ${effectiveBudgetPerVideo})</span>
                <span className="text-white font-medium">${effectiveTotal} USD</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Comisión KREOON ({commissionRate}%{managementType === 'kreoon' ? ' — servicio completo' : ' — plataforma'})
                </span>
                <span className="text-white font-medium">${commission} USD</span>
              </div>
              <div className="border-t border-purple-500/20 pt-2 flex justify-between">
                <span className="text-white font-bold">Total a pagar hoy</span>
                <span className="text-purple-300 font-bold text-lg">${totalToPay} USD</span>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                El pago es anticipado y activa la campaña inmediatamente.
              </p>
            </div>
          );
        })()}
      </div>
    );
  };

  // ── Pasos ─────────────────────────────────────────────────────────────────
  const T = TOTAL_STEPS;

  const steps = [
    // 0 — Tipo de contenido
    <div key={0} className="space-y-5">
      <div>
        <p className="text-purple-400 font-medium text-sm uppercase tracking-wider mb-1">Paso 1 de {T}</p>
        <h2 className="text-2xl font-bold text-white">¿Qué tipo de contenido quieres? 🎬</h2>
        <p className="text-muted-foreground text-sm mt-1">Elige el formato que mejor se adapta a tu marca.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {CONTENT_CHOICES.map(c => (
          <BigOption key={c.id} emoji={c.emoji} label={c.label} hint={c.hint}
            selected={contentType === c.id} onClick={() => setContentType(c.id)} />
        ))}
      </div>
    </div>,

    // 1 — Nombre
    <div key={1} className="space-y-5">
      <div>
        <p className="text-purple-400 font-medium text-sm uppercase tracking-wider mb-1">Paso 2 de {T}</p>
        <h2 className="text-2xl font-bold text-white">¿Cómo se llama tu campaña? 📝</h2>
        <p className="text-muted-foreground text-sm mt-1">Ponle un nombre que recuerdes fácilmente.</p>
      </div>
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder={`Ej: ${selectedContent?.label || 'Videos'} para mi marca`}
        maxLength={80}
        className="w-full bg-white/5 border-2 border-white/10 focus:border-purple-500 rounded-2xl px-5 py-4 text-white text-base placeholder:text-muted-foreground outline-none transition-colors"
      />
      <div className="flex items-center gap-2 -mt-2">
        <Sparkles className="h-3.5 w-3.5 text-purple-400 shrink-0" />
        <p className="text-xs text-purple-400 font-medium">Sugerencias de IA:</p>
      </div>
      <div className="flex flex-col gap-2">
        {loadingTitles
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="w-full h-12 rounded-2xl border-2 border-white/10 bg-white/5 animate-pulse" />
            ))
          : (aiTitles.length > 0 ? aiTitles : [
              `${selectedContent?.label} para mi marca`,
              `Campaña UGC ${new Date().getFullYear()}`,
              `Creadores para mi producto`,
            ]).map(sug => (
              <button key={sug} onClick={() => setTitle(sug)}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-2xl border-2 text-sm font-medium transition-all active:scale-95',
                  title === sug
                    ? 'border-purple-500 bg-purple-500/15 text-purple-300'
                    : 'border-white/10 bg-white/5 text-white hover:border-white/25 hover:bg-white/10',
                )}>
                ✏️ {sug}
              </button>
            ))
        }
      </div>
    </div>,

    // 2 — Descripción
    <div key={2} className="space-y-5">
      <div>
        <p className="text-purple-400 font-medium text-sm uppercase tracking-wider mb-1">Paso 3 de {T}</p>
        <h2 className="text-2xl font-bold text-white">Cuéntanos de tu marca 🏷️</h2>
        <p className="text-muted-foreground text-sm mt-1">Di qué vendes y qué quieres que los creadores muestren.</p>
      </div>
      <button
        onClick={async () => {
          setLoadingDesc(true);
          const data = await callWizardAI('generate_description');
          if (data?.description) setDescription(data.description);
          setLoadingDesc(false);
        }}
        disabled={loadingDesc || !title}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 text-sm font-semibold transition-all active:scale-95',
          loadingDesc ? 'border-purple-500/50 bg-purple-500/10 text-purple-400 cursor-wait'
            : !title ? 'border-white/5 bg-white/3 text-muted-foreground cursor-not-allowed opacity-50'
            : 'border-purple-500/60 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:border-purple-500',
        )}
      >
        {loadingDesc
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Generando con IA...</>
          : <><Sparkles className="h-4 w-4" /> Escribir por mí con IA</>
        }
      </button>
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Ej: Tengo una marca de ropa deportiva para mujeres. Quiero videos mostrando cómo quedan los leggins en la vida cotidiana, con un look natural y auténtico..."
        rows={6}
        className="w-full bg-white/5 border-2 border-white/10 focus:border-purple-500 rounded-2xl px-5 py-4 text-white text-sm placeholder:text-muted-foreground outline-none transition-colors resize-none"
      />
      <p className="text-xs text-muted-foreground">{description.length}/500 caracteres</p>
    </div>,

    // 3 — Fecha límite
    <div key={3} className="space-y-5">
      <div>
        <p className="text-purple-400 font-medium text-sm uppercase tracking-wider mb-1">Paso 4 de {T}</p>
        <h2 className="text-2xl font-bold text-white">¿Para cuándo lo necesitas? ⏰</h2>
        <p className="text-muted-foreground text-sm mt-1">Los creadores tendrán ese tiempo para entregar el contenido.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {DEADLINE_CHOICES.map(d => (
          <BigOption key={d.days}
            emoji={d.days <= 7 ? '⚡' : d.days <= 14 ? '🗓️' : d.days <= 30 ? '📅' : '🕐'}
            label={d.label} selected={deadlineDays === d.days} onClick={() => setDeadlineDays(d.days)} />
        ))}
      </div>
    </div>,

    // 4 — Creadores
    <div key={4} className="space-y-5">
      <div>
        <p className="text-purple-400 font-medium text-sm uppercase tracking-wider mb-1">Paso 5 de {T}</p>
        <h2 className="text-2xl font-bold text-white">¿Cuántos creadores necesitas? 👥</h2>
        <p className="text-muted-foreground text-sm mt-1">Más creadores = más variedad de contenido.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {CREATORS_CHOICES.map(c => (
          <BigOption key={c.value} emoji={c.emoji} label={c.label}
            selected={!showCustomCreators && creatorsValue === c.value}
            onClick={() => { setCreatorsValue(c.value); setShowCustomCreators(false); }} />
        ))}
        <BigOption emoji="✏️" label="Personalizado" hint="Escribe la cantidad exacta"
          selected={showCustomCreators}
          onClick={() => { setShowCustomCreators(true); setCustomCreatorsStr(String(creatorsValue)); }} />
      </div>
      {showCustomCreators && (
        <div className="relative">
          <input
            type="number" min={1} max={999} value={customCreatorsStr} autoFocus
            onChange={e => { setCustomCreatorsStr(e.target.value); setCreatorsValue(Number(e.target.value) || 1); }}
            placeholder="Ej: 15"
            className="w-full bg-white/5 border-2 border-purple-500 rounded-2xl px-5 py-4 text-white text-xl font-bold outline-none text-center"
          />
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">creadores</span>
        </div>
      )}
    </div>,

    // 5 — Videos por creador
    <div key={5} className="space-y-5">
      <div>
        <p className="text-purple-400 font-medium text-sm uppercase tracking-wider mb-1">Paso 6 de {T}</p>
        <h2 className="text-2xl font-bold text-white">¿Cuántos videos por creador? 🎞️</h2>
        <p className="text-muted-foreground text-sm mt-1">
          {creatorsValue} creador{creatorsValue > 1 ? 'es' : ''} × {videosPerCreator} video{videosPerCreator > 1 ? 's' : ''} = <span className="text-purple-300 font-bold">{totalVideos} videos en total</span>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {VIDEOS_PER_CREATOR_CHOICES.map(v => (
          <BigOption key={v.value} emoji={v.emoji} label={v.label}
            selected={!showCustomVPC && videosPerCreator === v.value}
            onClick={() => { setVideosPerCreator(v.value); setShowCustomVPC(false); }} />
        ))}
        <BigOption emoji="✏️" label="Personalizado" hint="Escribe la cantidad exacta"
          selected={showCustomVPC}
          onClick={() => { setShowCustomVPC(true); setCustomVPCStr(String(videosPerCreator)); }} />
      </div>
      {showCustomVPC && (
        <div className="relative">
          <input
            type="number" min={1} max={99} value={customVPCStr} autoFocus
            onChange={e => { setCustomVPCStr(e.target.value); setVideosPerCreator(Number(e.target.value) || 1); }}
            placeholder="Ej: 4"
            className="w-full bg-white/5 border-2 border-purple-500 rounded-2xl px-5 py-4 text-white text-xl font-bold outline-none text-center"
          />
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">videos</span>
        </div>
      )}
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
        <span className="text-2xl">🎬</span>
        <div>
          <p className="text-purple-300 font-semibold text-sm">Total de la campaña</p>
          <p className="text-muted-foreground text-xs">{creatorsValue} creador{creatorsValue > 1 ? 'es' : ''} × {videosPerCreator} video{videosPerCreator > 1 ? 's' : ''} = <strong className="text-white">{totalVideos} videos</strong></p>
        </div>
      </div>
    </div>,

    // 6 — Tipo de pago
    <div key={6} className="space-y-5">
      <div>
        <p className="text-purple-400 font-medium text-sm uppercase tracking-wider mb-1">Paso 7 de {T}</p>
        <h2 className="text-2xl font-bold text-white">¿Cómo vas a compensar a los creadores? 💳</h2>
        <p className="text-muted-foreground text-sm mt-1">Elige cómo quieres reconocer su trabajo.</p>
      </div>
      <div className="flex flex-col gap-3">
        {PAYMENT_CHOICES.map(p => (
          <BigOption key={p.id} emoji={p.emoji} label={p.label} hint={p.hint}
            selected={paymentType === p.id} onClick={() => setPaymentType(p.id)} />
        ))}
      </div>
    </div>,

    // 7 — Presupuesto / Producto
    <div key={7} className="space-y-5">
      <div>
        <p className="text-purple-400 font-medium text-sm uppercase tracking-wider mb-1">Paso 8 de {T}</p>
        <h2 className="text-2xl font-bold text-white">
          {paymentType === 'exchange' ? '¿Qué producto vas a enviar? 🎁' : '¿Cuánto pagas por video? 💵'}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {paymentType === 'exchange'
            ? 'Los creadores necesitan saber qué recibirán a cambio.'
            : `El precio es en USD por cada video. Total de videos: ${totalVideos}`}
        </p>
      </div>

      {/* Bloque de dinero */}
      {paymentType !== 'exchange' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pago por video (USD)</p>
          <div className="grid grid-cols-5 gap-2">
            {BUDGET_PRESETS.map(amount => (
              <button key={amount}
                onClick={() => { setBudgetPerVideo(amount); setShowCustomBudget(false); }}
                className={cn(
                  'py-4 rounded-2xl border-2 font-bold text-sm transition-all active:scale-95',
                  !showCustomBudget && budgetPerVideo === amount
                    ? 'border-purple-500 bg-purple-500/15 text-purple-300'
                    : 'border-white/10 bg-white/5 text-white hover:border-white/25',
                )}
              >
                ${amount}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setShowCustomBudget(true); setCustomBudget(''); }}
            className={cn(
              'w-full py-3.5 rounded-2xl border-2 font-medium text-sm transition-all',
              showCustomBudget
                ? 'border-purple-500 bg-purple-500/15 text-purple-300'
                : 'border-white/10 bg-white/5 text-muted-foreground hover:border-white/25',
            )}
          >
            ✏️ Otro monto por video
          </button>
          {showCustomBudget && (
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
              <input type="number" min={5} value={customBudget} onChange={e => setCustomBudget(e.target.value)}
                placeholder="0"
                className="w-full bg-white/5 border-2 border-purple-500 rounded-2xl pl-10 pr-16 py-4 text-white text-xl font-bold outline-none"
                autoFocus />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">USD</span>
            </div>
          )}

          {/* Total de la campaña */}
          <div className="pt-1 space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Valor total de la campaña</p>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-muted-foreground text-sm">
                  ${effectiveBudgetPerVideo} × {totalVideos} videos
                </span>
                <span className="text-purple-300 font-bold text-lg">${autoTotal} USD</span>
              </div>
              <button
                onClick={() => { setUseCustomTotal(!useCustomTotal); setCustomTotalBudget(String(autoTotal)); }}
                className={cn(
                  'w-full py-2.5 rounded-xl border text-xs font-medium transition-all',
                  useCustomTotal
                    ? 'border-purple-500/60 bg-purple-500/10 text-purple-300'
                    : 'border-white/10 bg-white/5 text-muted-foreground hover:border-white/20',
                )}
              >
                {useCustomTotal ? '📌 Editando total manualmente' : '✏️ Editar valor total de la campaña'}
              </button>
              {useCustomTotal && (
                <div className="relative mt-3">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                  <input type="number" min={0} value={customTotalBudget}
                    onChange={e => setCustomTotalBudget(e.target.value)}
                    className="w-full bg-white/5 border-2 border-purple-500 rounded-xl pl-9 pr-16 py-3 text-white text-lg font-bold outline-none"
                    autoFocus />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">USD</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bloque de producto */}
      {paymentType !== 'paid' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {paymentType === 'exchange' ? 'Producto a entregar' : 'Producto adicional'}
          </p>
          <input
            type="text"
            value={productName}
            onChange={e => setProductName(e.target.value)}
            placeholder="Ej: Crema hidratante 200ml + serum de vitamina C"
            className="w-full bg-white/5 border-2 border-white/10 focus:border-purple-500 rounded-2xl px-5 py-4 text-white text-base placeholder:text-muted-foreground outline-none transition-colors"
          />
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">$</span>
            <input
              type="number"
              min={0}
              value={productValue}
              onChange={e => setProductValue(e.target.value)}
              placeholder="Valor aproximado del producto"
              className="w-full bg-white/5 border-2 border-white/10 focus:border-purple-500 rounded-2xl pl-9 pr-16 py-4 text-white text-base placeholder:text-muted-foreground outline-none transition-colors"
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">USD</span>
          </div>
          <p className="text-xs text-muted-foreground">El valor del producto ayuda a los creadores a evaluar si aplican.</p>
        </div>
      )}
    </div>,

    // 8 — Tipo de colaboración
    <div key={8} className="space-y-5">
      <div>
        <p className="text-purple-400 font-medium text-sm uppercase tracking-wider mb-1">Paso 9 de {T}</p>
        <h2 className="text-2xl font-bold text-white">¿Qué esperas del creador? 🤝</h2>
        <p className="text-muted-foreground text-sm mt-1">Define si el creador solo te entrega el video o también lo publica en sus redes.</p>
      </div>
      <div className="flex flex-col gap-3">
        {COLLAB_CHOICES.map(c => (
          <BigOption key={c.id} emoji={c.emoji} label={c.label} hint={c.hint}
            selected={collabType === c.id} onClick={() => setCollabType(c.id)} />
        ))}
      </div>
    </div>,

    // 9 — Gestión de contenido
    <div key={9} className="space-y-5">
      <div>
        <p className="text-purple-400 font-medium text-sm uppercase tracking-wider mb-1">Paso 10 de {T}</p>
        <h2 className="text-2xl font-bold text-white">¿Quién gestiona el contenido? 🎯</h2>
        <p className="text-muted-foreground text-sm mt-1">Esto define cómo trabajaremos juntos y la comisión de la plataforma.</p>
      </div>
      <div className="flex flex-col gap-3">
        <BigOption
          emoji="🚀"
          label="KREOON lo gestiona todo"
          hint="Nuestro equipo escribe los guiones, selecciona creadores y coordina el proceso completo. Comisión: 30%"
          selected={managementType === 'kreoon'}
          onClick={() => setManagementType('kreoon')}
        />
        <BigOption
          emoji="📋"
          label="Yo gestiono mi contenido"
          hint="Tú escribes los guiones y coordinas con los creadores. Nosotros proveemos la plataforma y los creadores. Comisión: 15%"
          selected={managementType === 'self'}
          onClick={() => setManagementType('self')}
        />
      </div>
      <div className={cn(
        'rounded-2xl border px-4 py-3 flex items-start gap-3',
        managementType === 'kreoon'
          ? 'bg-purple-500/10 border-purple-500/25'
          : 'bg-blue-500/10 border-blue-500/25',
      )}>
        <span className="text-xl mt-0.5">{managementType === 'kreoon' ? '✨' : 'ℹ️'}</span>
        <div>
          {managementType === 'kreoon' ? (
            <>
              <p className="text-purple-300 font-semibold text-sm">Comisión KREOON: 30%</p>
              <p className="text-muted-foreground text-xs mt-0.5">Incluye: guiones profesionales, selección de creadores, coordinación y seguimiento de entrega.</p>
            </>
          ) : (
            <>
              <p className="text-blue-300 font-semibold text-sm">Comisión plataforma: 15%</p>
              <p className="text-muted-foreground text-xs mt-0.5">Acceso a creadores verificados y sistema de entrega. Tú gestionas los guiones y la coordinación.</p>
            </>
          )}
        </div>
      </div>
    </div>,

    // 10 — Imagen de portada 9:16
    <div key={10} className="space-y-5">
      <div>
        <p className="text-purple-400 font-medium text-sm uppercase tracking-wider mb-1">Paso 11 de {T}</p>
        <h2 className="text-2xl font-bold text-white">Imagen de tu campaña 🖼️</h2>
        <p className="text-muted-foreground text-sm mt-1">Agrega una imagen en formato vertical 9:16 para destacar tu campaña. Es opcional pero recomendado.</p>
      </div>

      {/* Zona de carga */}
      <label className={cn(
        'relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all overflow-hidden',
        campaignImagePreview ? 'border-purple-500/40' : 'border-white/15 hover:border-purple-500/40 hover:bg-white/5',
      )} style={{ aspectRatio: '9/16', maxHeight: '55vh' }}>
        <input
          type="file" accept="image/jpeg,image/png,image/webp" className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleImageSelect(f); }}
        />
        {campaignImagePreview ? (
          <>
            <img src={campaignImagePreview} alt="Portada" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-3xl">🔄</span>
              <span className="text-white text-sm font-semibold">Cambiar imagen</span>
            </div>
            {uploadingImage && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                <span className="text-white text-sm">Subiendo...</span>
              </div>
            )}
            {!uploadingImage && campaignImageUrl && (
              <div className="absolute top-3 right-3 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
            )}
          </>
        ) : (
          <>
            <span className="text-5xl">📸</span>
            <div className="text-center px-6">
              <p className="text-white font-semibold text-sm">Sube tu imagen de portada</p>
              <p className="text-muted-foreground text-xs mt-1">Formato vertical 9:16 recomendado<br/>JPG, PNG o WEBP</p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30">
              <span className="text-purple-300 text-xs font-medium">Toca para seleccionar</span>
            </div>
          </>
        )}
      </label>

      <button
        onClick={() => { setCampaignImageFile(null); setCampaignImagePreview(''); setCampaignImageUrl(''); }}
        className={cn('w-full py-3 rounded-2xl border text-sm font-medium transition-all',
          campaignImagePreview
            ? 'border-white/15 text-muted-foreground hover:border-white/25 hover:text-white'
            : 'border-white/5 text-white/20 cursor-not-allowed'
        )}
        disabled={!campaignImagePreview}
      >
        🗑️ Quitar imagen
      </button>

      <p className="text-center text-xs text-muted-foreground">
        Puedes continuar sin imagen — los creadores verán el nombre y descripción de tu campaña.
      </p>
    </div>,
  ];

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <div className="min-h-full flex flex-col max-w-lg mx-auto px-4 py-6">
      <ProgressBar step={step + 1} total={TOTAL_STEPS} />

      <div className="flex-1 pb-6">
        {step < TOTAL_STEPS - 1 ? steps[step] : renderReview()}
      </div>


      <div className="flex gap-3 pt-4 border-t border-white/5 sticky bottom-0 bg-background/95 pb-2">
        {step > 0 && (
          <button onClick={back}
            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl border border-white/10 bg-white/5 text-white font-medium hover:bg-white/10 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Atrás
          </button>
        )}

        {!isLastStep ? (
          <button onClick={next} disabled={!canNext()}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold transition-all',
              canNext()
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25 active:scale-98'
                : 'bg-white/5 text-muted-foreground cursor-not-allowed',
            )}>
            Siguiente
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold shadow-lg transition-all active:scale-98 disabled:opacity-70',
              paymentType !== 'exchange' && effectiveTotal > 0
                ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/25'
                : 'bg-green-600 hover:bg-green-500 shadow-green-500/25'
            )}>
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> {paymentType !== 'exchange' ? 'Iniciando pago...' : 'Publicando...'}</>
              : paymentType !== 'exchange' && effectiveTotal > 0
                ? <><CreditCard className="h-4 w-4" /> Pagar y publicar · ${effectiveTotal + Math.round(effectiveTotal * commissionRate) / 100} USD</>
                : <><Rocket className="h-4 w-4" /> ¡Publicar campaña!</>
            }
          </button>
        )}
      </div>
    </div>
  );
}
