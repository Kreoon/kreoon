import { useState, useCallback, useRef, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  Globe,
  ExternalLink,
  Star,
  Zap,
  Award,
  Crown,
  Plus,
  ChevronDown,
  Trash2,
  Edit,
  UserCheck,
  Link as LinkIcon,
  MessageCircle,
  Settings,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InteractionTimeline } from './InteractionTimeline';
import { AddInteractionModal } from './AddInteractionModal';
import { CustomFieldsSection } from './detail-sections/CustomFieldsSection';
import { CrmFieldsConfigDialog } from './detail-sections/CrmFieldsConfigDialog';
import {
  useUpdateLead,
  useDeleteLead,
  useLeadInteractions,
  useAddLeadInteraction,
} from '@/hooks/useCrm';
import { useCrmCustomFieldDefs, useUpdateLeadCustomFields } from '@/hooks/useCrmCustomFields';
import type {
  PlatformLead,
  PlatformLeadSummary,
  LeadStage,
  ExperienceLevel,
} from '@/types/crm.types';
import {
  LEAD_STAGE_LABELS,
  LEAD_STAGE_COLORS,
  TALENT_CATEGORY_LABELS,
  TALENT_CATEGORY_COLORS,
  SPECIFIC_ROLE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_TYPE_LABELS,
  TALENT_SUBTYPE_LABELS,
  REGISTRATION_INTENT_LABELS,
  type LeadSource,
  type SpecificRole,
  type TalentSubtype,
  type RegistrationIntent,
} from '@/types/crm.types';

// =====================================================
// Constants
// =====================================================

const STAGES: LeadStage[] = ['new', 'contacted', 'interested', 'demo_scheduled', 'converted', 'lost'];

const EXPERIENCE_ICONS: Record<ExperienceLevel, { icon: typeof Star; label: string }> = {
  beginner: { icon: Star, label: 'Principiante' },
  intermediate: { icon: Zap, label: 'Intermedio' },
  advanced: { icon: Award, label: 'Avanzado' },
  expert: { icon: Crown, label: 'Experto' },
};

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// =====================================================
// Clipboard helper
// =====================================================

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors text-white/30 hover:text-white/60"
    >
      {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

// =====================================================
// Component
// =====================================================

interface LeadDetailPanelProps {
  lead: PlatformLead | PlatformLeadSummary;
  onClose: () => void;
  onUpdate: () => void;
}

export function LeadDetailPanel({ lead, onClose, onUpdate }: LeadDetailPanelProps) {
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const addInteraction = useAddLeadInteraction();
  const { data: interactions, isLoading: interactionsLoading } = useLeadInteractions(lead.id);
  const { data: fieldDefs = [] } = useCrmCustomFieldDefs(
    (lead as any).organization_id || undefined,
    'lead',
  );
  const updateCustomFields = useUpdateLeadCustomFields();

  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [tags, setTags] = useState<string[]>(lead.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState(lead.notes || '');
  const [showUtm, setShowUtm] = useState(false);
  const [stageNote, setStageNote] = useState('');
  const [showStageNote, setShowStageNote] = useState(false);
  const [pendingStage, setPendingStage] = useState<LeadStage | null>(null);

  // Custom fields
  const customFieldsRef = useRef<Record<string, unknown>>((lead as any).custom_fields || {});

  const handleCustomFieldChange = useCallback((key: string, value: unknown) => {
    const updated = { ...customFieldsRef.current, [key]: value };
    customFieldsRef.current = updated;
    updateCustomFields.mutate({ leadId: lead.id, fields: updated });
  }, [lead.id, updateCustomFields]);

  // Debounced notes save
  const notesTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const saveNotes = useCallback(
    (value: string) => {
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
      notesTimerRef.current = setTimeout(() => {
        updateLead.mutate(
          { id: lead.id, data: { notes: value } },
          { onSuccess: onUpdate },
        );
      }, 1500);
    },
    [lead.id, updateLead, onUpdate],
  );

  useEffect(() => {
    return () => {
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    };
  }, []);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    saveNotes(value);
  };

  // Tags
  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      setTags(newTags);
      setTagInput('');
      updateLead.mutate(
        { id: lead.id, data: { tags: newTags } },
        { onSuccess: onUpdate },
      );
    }
  };

  const removeTag = (tag: string) => {
    const newTags = tags.filter((t) => t !== tag);
    setTags(newTags);
    updateLead.mutate(
      { id: lead.id, data: { tags: newTags } },
      { onSuccess: onUpdate },
    );
  };

  // Stage change
  const handleStageSelect = (stage: LeadStage) => {
    if (stage === lead.stage) return;
    setPendingStage(stage);
    setShowStageNote(true);
  };

  const confirmStageChange = () => {
    if (!pendingStage) return;
    updateLead.mutate(
      { id: lead.id, data: { stage: pendingStage } },
      {
        onSuccess: () => {
          // Log the stage change as an interaction
          addInteraction.mutate({
            leadId: lead.id,
            data: {
              interaction_type: 'note',
              subject: `Cambio de etapa: ${LEAD_STAGE_LABELS[lead.stage]} → ${LEAD_STAGE_LABELS[pendingStage!]}`,
              content: stageNote || undefined,
            },
          });
          onUpdate();
          setShowStageNote(false);
          setStageNote('');
          setPendingStage(null);
        },
      },
    );
  };

  const cancelStageChange = () => {
    setShowStageNote(false);
    setStageNote('');
    setPendingStage(null);
  };

  // Delete
  const handleDelete = () => {
    if (!confirm('¿Eliminar este lead permanentemente?')) return;
    deleteLead.mutate(lead.id, {
      onSuccess: () => {
        onUpdate();
        onClose();
      },
    });
  };

  // Interaction submit
  const handleInteractionSubmit = (data: {
    interaction_type: string;
    subject?: string;
    content?: string;
    outcome?: string;
    next_action?: string;
    next_action_date?: string;
  }) => {
    addInteraction.mutate(
      {
        leadId: lead.id,
        data: {
          interaction_type: data.interaction_type as any,
          subject: data.subject,
          content: data.content,
        },
      },
      {
        onSuccess: () => setShowInteractionModal(false),
      },
    );
  };

  const experienceInfo = lead.experience_level ? EXPERIENCE_ICONS[lead.experience_level] : null;
  const ExperienceIcon = experienceInfo?.icon;
  const hasUtm = lead.utm_source || lead.utm_medium || lead.utm_campaign;
  const socialProfiles = (lead as PlatformLead).social_profiles || {};
  const hasSocials = socialProfiles.instagram || socialProfiles.tiktok || socialProfiles.linkedin || lead.portfolio_url;

  return (
    <>
      <div
        className="w-[440px] h-full flex flex-col overflow-hidden border-l"
        style={{
          background: 'rgba(10, 1, 24, 0.95)',
          backdropFilter: 'blur(24px) saturate(180%)',
          borderColor: 'rgba(139, 92, 246, 0.2)',
        }}
      >
        {/* ======================== HEADER ======================== */}
        <div
          className="p-4 flex items-start gap-3 border-b"
          style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
        >
          {/* Avatar */}
          <div
            className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
          >
            {getInitials(lead.full_name)}
          </div>

          {/* Name + Badges */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold truncate">
              {lead.full_name || 'Sin nombre'}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', LEAD_STAGE_COLORS[lead.stage])}>
                {LEAD_STAGE_LABELS[lead.stage]}
              </span>
              {lead.talent_category && (
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', TALENT_CATEGORY_COLORS[lead.talent_category])}>
                  {TALENT_CATEGORY_LABELS[lead.talent_category]}
                </span>
              )}
              {ExperienceIcon && (
                <span title={experienceInfo!.label}>
                  <ExperienceIcon className="h-3.5 w-3.5 text-amber-400" />
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/10">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-popover border-[#8b5cf6]/30">
                <DropdownMenuItem className="gap-2 text-white focus:bg-white/10">
                  <Edit className="h-4 w-4 text-[#a855f7]" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 text-white focus:bg-white/10">
                  <UserCheck className="h-4 w-4 text-green-400" />
                  Convertir a usuario
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={handleDelete} className="gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-400">
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ======================== SCROLLABLE CONTENT ======================== */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-5">

            {/* ---- Contact Info ---- */}
            <section className="space-y-2.5">
              <h4 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">Contacto</h4>

              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-white/30 flex-shrink-0" />
                  <span className="text-sm text-white/70 truncate flex-1">{lead.email}</span>
                  <CopyButton text={lead.email} />
                </div>
              )}

              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-white/30 flex-shrink-0" />
                  <span className="text-sm text-white/70 truncate flex-1">{lead.phone}</span>
                  <CopyButton text={lead.phone} />
                  <a
                    href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors text-green-400/60 hover:text-green-400"
                  >
                    <MessageCircle className="h-3 w-3" />
                  </a>
                </div>
              )}

              {(lead.city || lead.country) && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-white/30 flex-shrink-0" />
                  <span className="text-sm text-white/70">
                    {[lead.city, lead.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </section>

            {/* ---- Details ---- */}
            <section className="space-y-2.5">
              <h4 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">Detalles</h4>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {lead.lead_type && (
                  <>
                    <span className="text-white/40">Tipo</span>
                    <span className="text-white/70">{LEAD_TYPE_LABELS[lead.lead_type]}</span>
                  </>
                )}
                {lead.specific_role && (
                  <>
                    <span className="text-white/40">Rol</span>
                    <span className="text-white/70">{SPECIFIC_ROLE_LABELS[lead.specific_role as SpecificRole] ?? lead.specific_role}</span>
                  </>
                )}
                {lead.experience_level && (
                  <>
                    <span className="text-white/40">Experiencia</span>
                    <span className="text-white/70">{EXPERIENCE_LEVEL_LABELS[lead.experience_level]}</span>
                  </>
                )}
                {(lead as PlatformLead).talent_subtype && (
                  <>
                    <span className="text-white/40">Subtipo</span>
                    <span className="text-white/70">{TALENT_SUBTYPE_LABELS[(lead as PlatformLead).talent_subtype as TalentSubtype]}</span>
                  </>
                )}
                {(lead as PlatformLead).registration_intent && (
                  <>
                    <span className="text-white/40">Intencion</span>
                    <span className="text-white/70">{REGISTRATION_INTENT_LABELS[(lead as PlatformLead).registration_intent as RegistrationIntent]}</span>
                  </>
                )}
                {lead.lead_source && (
                  <>
                    <span className="text-white/40">Fuente</span>
                    <span className="text-white/70">{LEAD_SOURCE_LABELS[lead.lead_source as LeadSource] ?? lead.lead_source}</span>
                  </>
                )}
                <span className="text-white/40">Creado</span>
                <span className="text-white/70">
                  {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: es })}
                </span>
              </div>

              {/* Lead Score */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">Lead Score</span>
                  <span className="text-xs font-bold text-white/80">{lead.lead_score}/100</span>
                </div>
                <Progress
                  value={lead.lead_score}
                  className="h-1.5 bg-white/5 [&>div]:bg-gradient-to-r [&>div]:from-[#8b5cf6] [&>div]:to-[#ec4899]"
                />
              </div>
            </section>

            {/* ---- Social & Portfolio ---- */}
            {hasSocials && (
              <section className="space-y-2">
                <h4 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">Redes y Portfolio</h4>
                <div className="flex flex-wrap gap-2">
                  {socialProfiles.instagram && (
                    <a
                      href={`https://instagram.com/${socialProfiles.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:border-pink-500/40 hover:bg-pink-500/10 transition-all"
                    >
                      <Globe className="h-3 w-3" />
                      Instagram
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                  {socialProfiles.tiktok && (
                    <a
                      href={`https://tiktok.com/@${socialProfiles.tiktok.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all"
                    >
                      <Globe className="h-3 w-3" />
                      TikTok
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                  {socialProfiles.linkedin && (
                    <a
                      href={socialProfiles.linkedin.startsWith('http') ? socialProfiles.linkedin : `https://linkedin.com/in/${socialProfiles.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:border-blue-500/40 hover:bg-blue-500/10 transition-all"
                    >
                      <Globe className="h-3 w-3" />
                      LinkedIn
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                  {lead.portfolio_url && (
                    <a
                      href={lead.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:border-purple-500/40 hover:bg-purple-500/10 transition-all"
                    >
                      <LinkIcon className="h-3 w-3" />
                      Portfolio
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </section>
            )}

            {/* ---- Stage Change ---- */}
            <section className="space-y-2">
              <h4 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">Etapa</h4>
              <Select
                value={lead.stage}
                onValueChange={(v) => handleStageSelect(v as LeadStage)}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-[#8b5cf6]/30">
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s} className="text-white focus:bg-white/10">
                      <span className="flex items-center gap-2">
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', LEAD_STAGE_COLORS[s])}>
                          {LEAD_STAGE_LABELS[s]}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Stage change note */}
              {showStageNote && pendingStage && (
                <div
                  className="p-3 rounded-lg space-y-2"
                  style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
                >
                  <p className="text-xs text-white/60">
                    Mover a <span className="font-semibold text-white/80">{LEAD_STAGE_LABELS[pendingStage]}</span>
                  </p>
                  <Input
                    value={stageNote}
                    onChange={(e) => setStageNote(e.target.value)}
                    placeholder="Nota opcional sobre el cambio..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs h-8"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={cancelStageChange}
                      className="h-7 text-xs text-white/50 hover:text-white hover:bg-white/10"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={confirmStageChange}
                      disabled={updateLead.isPending}
                      className="h-7 text-xs bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
                    >
                      {updateLead.isPending ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />
                      ) : null}
                      Confirmar
                    </Button>
                  </div>
                </div>
              )}
            </section>

            {/* ---- Tags ---- */}
            <section className="space-y-2">
              <h4 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">Etiquetas</h4>
              <div className="flex items-center gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Agregar etiqueta..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs h-8 flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={addTag}
                  className="h-8 w-8 bg-white/5 hover:bg-white/10 text-white/50"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => removeTag(tag)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#8b5cf6]/20 text-[#c084fc] border border-[#8b5cf6]/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-colors"
                      title="Click para eliminar"
                    >
                      {tag}
                      <X className="h-2.5 w-2.5" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* ---- Notes ---- */}
            <section className="space-y-2">
              <h4 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">Notas</h4>
              <Textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Notas sobre este lead..."
                rows={3}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none text-xs"
              />
              {updateLead.isPending && (
                <p className="text-[10px] text-white/30">Guardando...</p>
              )}
            </section>

            {/* ---- UTM (collapsible) ---- */}
            {hasUtm && (
              <section>
                <button
                  onClick={() => setShowUtm(!showUtm)}
                  className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/30 font-semibold hover:text-white/50 transition-colors"
                >
                  <ChevronDown className={cn('h-3 w-3 transition-transform', showUtm && 'rotate-180')} />
                  UTM Tracking
                </button>
                {showUtm && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {lead.utm_source && (
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-white/30">source</span>
                        <p className="text-xs text-white/60 bg-white/5 px-2 py-1 rounded">{lead.utm_source}</p>
                      </div>
                    )}
                    {lead.utm_medium && (
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-white/30">medium</span>
                        <p className="text-xs text-white/60 bg-white/5 px-2 py-1 rounded">{lead.utm_medium}</p>
                      </div>
                    )}
                    {lead.utm_campaign && (
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-white/30">campaign</span>
                        <p className="text-xs text-white/60 bg-white/5 px-2 py-1 rounded">{lead.utm_campaign}</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* ---- Custom Fields ---- */}
            {fieldDefs.length > 0 && (
              <CustomFieldsSection
                customFields={customFieldsRef.current}
                fieldDefs={fieldDefs.filter(d => d.is_active)}
                onChange={handleCustomFieldChange}
                configAction={
                  (lead as any).organization_id ? (
                    <button
                      onClick={() => setShowFieldsConfig(true)}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                      title="Configurar campos"
                    >
                      <Settings className="h-3.5 w-3.5 text-white/40 hover:text-white/60" />
                    </button>
                  ) : undefined
                }
              />
            )}

            {/* ---- Interactions Timeline ---- */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">
                  Interacciones
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInteractionModal(true)}
                  className="h-6 px-2 text-[10px] text-[#a855f7] hover:text-[#c084fc] hover:bg-[#8b5cf6]/10"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar
                </Button>
              </div>
              <InteractionTimeline
                interactions={interactions || []}
                isLoading={interactionsLoading}
              />
            </section>
          </div>
        </div>
      </div>

      {/* Custom Fields Config Dialog */}
      {showFieldsConfig && (lead as any).organization_id && (
        <CrmFieldsConfigDialog
          open={showFieldsConfig}
          onOpenChange={setShowFieldsConfig}
          entityType="lead"
          organizationId={(lead as any).organization_id}
        />
      )}

      {/* Interaction Modal */}
      <AddInteractionModal
        open={showInteractionModal}
        onOpenChange={setShowInteractionModal}
        onSubmit={handleInteractionSubmit}
        isSubmitting={addInteraction.isPending}
        variant="lead"
      />
    </>
  );
}
