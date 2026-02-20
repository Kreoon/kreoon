import { useState } from 'react';
import { Sparkles, Check, Copy, MessageSquare, Hash, Loader2, BookOpen, HelpCircle, Zap, TrendingUp, RefreshCw, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAIContentGenerator, CAPTION_STYLE_LABELS } from '../../hooks/useAIContentGenerator';
import type { AICaption } from '../../hooks/useAIContentGenerator';
import type { SocialPlatform, SocialPostType } from '../../types/social.types';
import { toast } from 'sonner';

interface AICaptionSelectorProps {
  contentId: string;
  targetPlatform: SocialPlatform;
  postType: SocialPostType;
  accountClientId?: string | null;
  onSelect: (caption: string, hashtags: string[], firstComment: string) => void;
}

const STYLE_ICONS: Record<AICaption['style'], typeof BookOpen> = {
  storytelling: BookOpen,
  question_value: HelpCircle,
  direct: Zap,
  social_proof: TrendingUp,
};

const STYLE_COLORS: Record<AICaption['style'], string> = {
  storytelling: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  question_value: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  direct: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  social_proof: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

export function AICaptionSelector({
  contentId,
  targetPlatform,
  postType,
  accountClientId,
  onSelect,
}: AICaptionSelectorProps) {
  const { generate, isGenerating, result, error, insufficientTokens } = useAIContentGenerator();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerate = async () => {
    setSelectedIdx(null);
    const res = await generate(contentId, targetPlatform, postType, accountClientId);
    if (res) {
      setHasGenerated(true);
    }
  };

  const handleSelect = (idx: number) => {
    if (!result?.captions[idx]) return;
    const c = result.captions[idx];
    setSelectedIdx(idx);
    onSelect(c.caption, c.hashtags, c.first_comment);
    toast.success('Caption aplicado');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  // Not yet generated - show generate button
  if (!hasGenerated && !isGenerating && !error) {
    return (
      <Button
        variant="outline"
        className="w-full gap-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5"
        onClick={handleGenerate}
      >
        <Sparkles className="w-4 h-4 text-primary" />
        Generar captions con IA
        <span className="text-[10px] text-muted-foreground ml-1">(60 coins)</span>
      </Button>
    );
  }

  // Loading state
  if (isGenerating) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Generando captions con IA...</p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn(
        'border-red-500/20 bg-red-500/5',
        insufficientTokens && 'border-amber-500/20 bg-amber-500/5'
      )}>
        <CardContent className="py-4 space-y-2">
          <div className="flex items-center gap-2">
            {insufficientTokens && <Coins className="w-4 h-4 text-amber-400" />}
            <p className={cn('text-sm', insufficientTokens ? 'text-amber-400' : 'text-red-400')}>
              {error}
            </p>
          </div>
          {insufficientTokens ? (
            <p className="text-xs text-muted-foreground">
              Compra mas Kreoon Coins en Configuracion &gt; Tokens de IA
            </p>
          ) : (
            <Button variant="outline" size="sm" onClick={handleGenerate} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Reintentar
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Results
  if (!result?.captions?.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Captions generados</span>
          {result.tokens_consumed && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-1">
              <Coins className="w-2.5 h-2.5" />
              -{result.tokens_consumed}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-muted-foreground"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          <RefreshCw className="w-3 h-3" />
          Regenerar
        </Button>
      </div>

      <div className="grid gap-2">
        {result.captions.map((cap, idx) => {
          const meta = CAPTION_STYLE_LABELS[cap.style];
          const Icon = STYLE_ICONS[cap.style] || Sparkles;
          const colorClass = STYLE_COLORS[cap.style] || '';
          const isSelected = selectedIdx === idx;

          return (
            <Card
              key={cap.style}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                isSelected
                  ? 'ring-2 ring-primary border-primary/40'
                  : 'border-border hover:border-primary/20',
              )}
              onClick={() => handleSelect(idx)}
            >
              <CardContent className="p-3 space-y-2">
                {/* Style header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-6 h-6 rounded-md flex items-center justify-center border', colorClass)}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{meta?.label || cap.style}</p>
                      <p className="text-[10px] text-muted-foreground">{meta?.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(cap.caption);
                      }}
                      className="p-1 rounded hover:bg-muted transition-colors"
                      title="Copiar caption"
                    >
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    </button>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Caption preview */}
                <p className="text-[11px] leading-relaxed text-foreground/90 whitespace-pre-wrap line-clamp-4">
                  {cap.caption}
                </p>

                {/* Hashtags */}
                {cap.hashtags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <Hash className="w-3 h-3 text-muted-foreground shrink-0" />
                    <p className="text-[10px] text-muted-foreground truncate">
                      {cap.hashtags.slice(0, 6).map(h => `#${h}`).join(' ')}
                      {cap.hashtags.length > 6 && ` +${cap.hashtags.length - 6}`}
                    </p>
                  </div>
                )}

                {/* First comment */}
                {cap.first_comment && (
                  <div className="flex items-start gap-1">
                    <MessageSquare className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                      {cap.first_comment}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
