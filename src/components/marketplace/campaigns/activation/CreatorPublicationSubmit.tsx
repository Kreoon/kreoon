import { useState } from 'react';
import {
  ArrowLeft, Link2, Hash, AtSign, Camera, Send,
  Loader2, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrandActivation } from '@/hooks/useBrandActivation';
import { SOCIAL_PLATFORMS, VERIFICATION_STATUS_CONFIG } from '@/components/marketplace/types/brandActivation';
import type { ActivationPublication } from '@/components/marketplace/types/brandActivation';

interface CreatorPublicationSubmitProps {
  publication: ActivationPublication;
  onBack: () => void;
  onSuccess: () => void;
}

export function CreatorPublicationSubmit({ publication, onBack, onSuccess }: CreatorPublicationSubmitProps) {
  const { submitContentForApproval, loading } = useBrandActivation();

  const [url, setUrl] = useState(publication.publication_url || '');
  const [caption, setCaption] = useState(publication.caption || '');
  const [hashtags, setHashtags] = useState(publication.hashtags_used.join(', '));
  const [mentions, setMentions] = useState(publication.mentions_used.join(', '));
  const [screenshotUrl, setScreenshotUrl] = useState(publication.publication_screenshot_url || '');

  const platformInfo = SOCIAL_PLATFORMS[publication.platform];
  const statusConfig = VERIFICATION_STATUS_CONFIG[publication.verification_status];

  const isSubmittable = publication.verification_status === 'pending_content'
    || publication.verification_status === 'content_approved'
    || publication.verification_status === 'pending_publication';

  const handleSubmit = async () => {
    if (!url.trim()) return;

    const hashtagList = hashtags
      .split(',')
      .map(h => h.trim())
      .filter(Boolean)
      .map(h => h.startsWith('#') ? h : `#${h}`);

    const mentionList = mentions
      .split(',')
      .map(m => m.trim())
      .filter(Boolean)
      .map(m => m.startsWith('@') ? m : `@${m}`);

    const ok = await submitContentForApproval(publication.id, {
      publication_url: url.trim(),
      caption: caption.trim() || undefined,
      hashtags_used: hashtagList,
      mentions_used: mentionList,
      publication_screenshot_url: screenshotUrl.trim() || undefined,
    });

    if (ok) onSuccess();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', platformInfo.bgColor)}>
            <span className="text-white font-bold">{platformInfo.label.charAt(0)}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{platformInfo.label}</h2>
            <span className={cn('text-xs px-2 py-0.5 rounded-full', statusConfig.bgColor, statusConfig.color)}>
              {statusConfig.label}
            </span>
          </div>
        </div>
      </div>

      {/* Status info */}
      {publication.verification_status === 'verified' && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
          <div>
            <p className="text-green-300 text-sm font-medium">Publicación verificada</p>
            <p className="text-green-300/70 text-xs">Tu post fue verificado exitosamente. Mantén el post activo hasta la fecha límite.</p>
          </div>
        </div>
      )}

      {publication.verification_status === 'violation' && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <div>
            <p className="text-red-300 text-sm font-medium">Violación detectada</p>
            <p className="text-red-300/70 text-xs">{publication.verification_notes || 'El post fue eliminado antes de la fecha límite.'}</p>
          </div>
        </div>
      )}

      {publication.verification_status === 'pending_verification' && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-purple-400 shrink-0" />
          <div>
            <p className="text-purple-300 text-sm font-medium">En verificación</p>
            <p className="text-purple-300/70 text-xs">La marca está revisando tu publicación. Recibirás una notificación cuando sea aprobada.</p>
          </div>
        </div>
      )}

      {/* Duration reminder */}
      {publication.must_stay_until && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500 shrink-0" />
          <p className="text-gray-400 text-xs">
            El post debe permanecer activo hasta{' '}
            <span className="text-white font-medium">
              {new Date(publication.must_stay_until).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </p>
        </div>
      )}

      {/* Form */}
      {isSubmittable && (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5 mb-1.5">
              <Link2 className="h-3.5 w-3.5" />
              URL de la publicación *
            </label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://instagram.com/p/..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5 mb-1.5">
              <Hash className="h-3.5 w-3.5" />
              Hashtags usados
            </label>
            <input
              type="text"
              value={hashtags}
              onChange={e => setHashtags(e.target.value)}
              placeholder="#ad, #publi, #tumarca"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
            />
            <p className="text-xs text-gray-600 mt-1">Separados por coma</p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5 mb-1.5">
              <AtSign className="h-3.5 w-3.5" />
              Menciones usadas
            </label>
            <input
              type="text"
              value={mentions}
              onChange={e => setMentions(e.target.value)}
              placeholder="@marca"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5 mb-1.5">
              Caption (opcional)
            </label>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Texto de tu publicación..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5 mb-1.5">
              <Camera className="h-3.5 w-3.5" />
              URL de screenshot (opcional)
            </label>
            <input
              type="url"
              value={screenshotUrl}
              onChange={e => setScreenshotUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !url.trim()}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar para verificación
              </>
            )}
          </button>
        </div>
      )}

      {/* Existing submission info (read-only) */}
      {!isSubmittable && publication.publication_url && (
        <div className="space-y-3">
          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <p className="text-gray-500 text-xs mb-1">URL de publicación</p>
            <a
              href={publication.publication_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 text-sm hover:text-purple-300 break-all"
            >
              {publication.publication_url}
            </a>
          </div>
          {publication.hashtags_used.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {publication.hashtags_used.map(h => (
                <span key={h} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">{h}</span>
              ))}
            </div>
          )}
          {publication.mentions_used.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {publication.mentions_used.map(m => (
                <span key={m} className="text-xs px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-400">{m}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
