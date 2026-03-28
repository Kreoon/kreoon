import { useState } from 'react';
import {
  Mail,
  Phone,
  Video,
  MessageSquare,
  FileText,
  FileSignature,
  StickyNote,
  ChevronDown,
  ChevronUp,
  MousePointer,
  Eye,
  MailOpen,
  Send,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type {
  PlatformLeadInteraction,
  OrgContactInteraction,
  LeadInteractionType,
  OrgInteractionType,
} from '@/types/crm.types';
import { INTERACTION_OUTCOME_LABELS } from '@/types/crm.types';

type AnyInteraction = PlatformLeadInteraction | OrgContactInteraction;

interface InteractionTimelineProps {
  interactions: AnyInteraction[];
  isLoading?: boolean;
}

const ICON_MAP: Record<string, typeof Mail> = {
  email_sent: Send,
  email_opened: MailOpen,
  email_clicked: MousePointer,
  email: Mail,
  whatsapp_sent: MessageSquare,
  whatsapp_reply: MessageSquare,
  whatsapp: MessageSquare,
  call: Phone,
  meeting: Video,
  demo: Video,
  form_submitted: FileText,
  page_visited: Eye,
  proposal_sent: FileText,
  contract_signed: FileSignature,
  note: StickyNote,
};

const COLOR_MAP: Record<string, string> = {
  email_sent: 'text-blue-400 bg-blue-500/15',
  email_opened: 'text-blue-300 bg-blue-500/10',
  email_clicked: 'text-blue-200 bg-blue-500/10',
  email: 'text-blue-400 bg-blue-500/15',
  whatsapp_sent: 'text-green-400 bg-green-500/15',
  whatsapp_reply: 'text-green-300 bg-green-500/10',
  whatsapp: 'text-green-400 bg-green-500/15',
  call: 'text-yellow-400 bg-yellow-500/15',
  meeting: 'text-purple-400 bg-purple-500/15',
  demo: 'text-purple-400 bg-purple-500/15',
  form_submitted: 'text-cyan-400 bg-cyan-500/15',
  page_visited: 'text-gray-400 bg-gray-500/15',
  proposal_sent: 'text-orange-400 bg-orange-500/15',
  contract_signed: 'text-emerald-400 bg-emerald-500/15',
  note: 'text-white/50 bg-white/10',
};

const TYPE_LABELS: Record<string, string> = {
  email_sent: 'Email enviado',
  email_opened: 'Email abierto',
  email_clicked: 'Click en email',
  email: 'Email',
  whatsapp_sent: 'WhatsApp enviado',
  whatsapp_reply: 'Respuesta WhatsApp',
  whatsapp: 'WhatsApp',
  call: 'Llamada',
  meeting: 'Reunión',
  demo: 'Demo',
  form_submitted: 'Formulario',
  page_visited: 'Visita web',
  proposal_sent: 'Propuesta enviada',
  contract_signed: 'Contrato firmado',
  note: 'Nota',
};

function InteractionItem({ interaction }: { interaction: AnyInteraction }) {
  const [expanded, setExpanded] = useState(false);
  const type = 'interaction_type' in interaction ? (interaction.interaction_type as string) : 'note';
  const Icon = ICON_MAP[type] ?? StickyNote;
  const colors = COLOR_MAP[type] ?? COLOR_MAP.note;
  const hasContent = interaction.content && interaction.content.length > 0;
  const outcome = 'outcome' in interaction ? (interaction as OrgContactInteraction).outcome : null;
  const nextAction = 'next_action' in interaction ? (interaction as OrgContactInteraction).next_action : null;

  return (
    <div className="relative flex gap-3 group">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', colors)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="w-px flex-1 bg-white/10 mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-white/90">
                {TYPE_LABELS[type] ?? type}
              </span>
              {outcome && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] font-medium',
                    outcome === 'positive' && 'bg-green-500/15 text-green-400',
                    outcome === 'neutral' && 'bg-gray-500/15 text-gray-400',
                    outcome === 'negative' && 'bg-red-500/15 text-red-400',
                  )}
                >
                  {INTERACTION_OUTCOME_LABELS[outcome as keyof typeof INTERACTION_OUTCOME_LABELS]}
                </span>
              )}
            </div>
            {interaction.subject && (
              <p className="text-xs text-white/60 mt-0.5">{interaction.subject}</p>
            )}
          </div>
          <span className="text-[10px] text-white/30 flex-shrink-0 whitespace-nowrap">
            {formatDistanceToNow(new Date(interaction.created_at), { addSuffix: true, locale: es })}
          </span>
        </div>

        {/* Expandable content */}
        {hasContent && (
          <div className="mt-1.5">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[11px] text-[#a855f7] hover:text-[#c084fc] transition-colors"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? 'Ocultar' : 'Ver detalle'}
            </button>
            {expanded && (
              <div
                className="mt-2 p-3 rounded-sm text-xs text-white/70 leading-relaxed whitespace-pre-wrap"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                {interaction.content}
              </div>
            )}
          </div>
        )}

        {/* Next action */}
        {nextAction && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-[10px] text-yellow-400/70 font-medium">Siguiente:</span>
            <span className="text-[10px] text-white/50">{nextAction}</span>
            {'next_action_date' in interaction && (interaction as OrgContactInteraction).next_action_date && (
              <span className="text-[10px] text-white/30">
                ({format(new Date((interaction as OrgContactInteraction).next_action_date!), 'd MMM', { locale: es })})
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function InteractionTimeline({ interactions, isLoading }: InteractionTimelineProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#8b5cf6]/30 border-t-[#8b5cf6] rounded-full animate-spin" />
      </div>
    );
  }

  if (interactions.length === 0) {
    return (
      <div className="text-center py-12">
        <StickyNote className="h-8 w-8 text-white/15 mx-auto mb-2" />
        <p className="text-sm text-white/30">Sin interacciones registradas</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {interactions.map((interaction) => (
        <InteractionItem key={interaction.id} interaction={interaction} />
      ))}
    </div>
  );
}
