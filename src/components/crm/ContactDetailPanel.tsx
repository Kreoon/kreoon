import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
  Plus,
  Trash2,
  Edit,
  Snowflake,
  Sun,
  Flame,
  Building2,
  Briefcase,
  DollarSign,
  CalendarClock,
  MessageCircle,
  Link as LinkIcon,
  Settings,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  useUpdateOrgContact,
  useDeleteOrgContact,
  useContactInteractions,
  useAddContactInteraction,
  useOrgPipelines,
} from '@/hooks/useCrm';
import { useCrmCustomFieldDefs, useUpdateContactCustomFields } from '@/hooks/useCrmCustomFields';
import type { OrgContact, RelationshipStrength, ContactType } from '@/types/crm.types';
import {
  CONTACT_TYPE_LABELS,
  RELATIONSHIP_STRENGTH_LABELS,
  RELATIONSHIP_STRENGTH_COLORS,
} from '@/types/crm.types';

// =====================================================
// Constants
// =====================================================

const STRENGTH_CYCLE: RelationshipStrength[] = ['cold', 'warm', 'hot'];

const STRENGTH_CONFIG: Record<
  RelationshipStrength,
  { icon: typeof Snowflake; color: string; activeColor: string; glowColor: string }
> = {
  cold: {
    icon: Snowflake,
    color: 'text-blue-400/40',
    activeColor: 'text-blue-400',
    glowColor: 'shadow-[0_0_12px_rgba(59,130,246,0.25)]',
  },
  warm: {
    icon: Sun,
    color: 'text-yellow-400/40',
    activeColor: 'text-yellow-400',
    glowColor: 'shadow-[0_0_12px_rgba(234,179,8,0.25)]',
  },
  hot: {
    icon: Flame,
    color: 'text-red-400/40',
    activeColor: 'text-red-400',
    glowColor: 'shadow-[0_0_12px_rgba(239,68,68,0.25)]',
  },
};

const CONTACT_TYPE_COLORS: Record<ContactType, string> = {
  lead: 'bg-yellow-500/20 text-yellow-400',
  client: 'bg-green-500/20 text-green-400',
  partner: 'bg-blue-500/20 text-blue-400',
  vendor: 'bg-orange-500/20 text-orange-400',
  influencer: 'bg-pink-500/20 text-pink-400',
  other: 'bg-white/10 text-white/60',
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

interface ContactDetailPanelProps {
  contact: OrgContact;
  organizationId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function ContactDetailPanel({
  contact,
  organizationId,
  onClose,
  onUpdate,
}: ContactDetailPanelProps) {
  const updateContact = useUpdateOrgContact(organizationId);
  const deleteContact = useDeleteOrgContact(organizationId);
  const addInteraction = useAddContactInteraction(organizationId);
  const { data: interactions, isLoading: interactionsLoading } = useContactInteractions(contact.id);
  const { data: pipelines } = useOrgPipelines(organizationId);
  const { data: fieldDefs = [] } = useCrmCustomFieldDefs(organizationId, 'contact');
  const updateCustomFields = useUpdateContactCustomFields(organizationId);

  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [tags, setTags] = useState<string[]>(contact.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState(contact.notes || '');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(contact.full_name);
  const [dealValue, setDealValue] = useState(contact.deal_value?.toString() || '');
  const [expectedClose, setExpectedClose] = useState(contact.expected_close_date || '');

  // Custom fields
  const customFieldsRef = useRef<Record<string, unknown>>((contact as any).custom_fields || {});

  const handleCustomFieldChange = useCallback((key: string, value: unknown) => {
    const updated = { ...customFieldsRef.current, [key]: value };
    customFieldsRef.current = updated;
    updateCustomFields.mutate({ contactId: contact.id, fields: updated });
  }, [contact.id, updateCustomFields]);

  // Reset local state when contact changes
  useEffect(() => {
    setTags(contact.tags || []);
    setNotes(contact.notes || '');
    setNameValue(contact.full_name);
    setDealValue(contact.deal_value?.toString() || '');
    setExpectedClose(contact.expected_close_date || '');
    setEditingName(false);
    customFieldsRef.current = (contact as any).custom_fields || {};
  }, [contact.id]);

  // Pipeline stages
  const allStages = useMemo(() => {
    if (!pipelines || pipelines.length === 0) return [];
    const defaultPipeline = pipelines.find((p) => p.is_default) || pipelines[0];
    return (defaultPipeline.stages || []).sort((a, b) => a.order - b.order);
  }, [pipelines]);

  const isLead = contact.contact_type === 'lead';

  // Debounced notes save
  const notesTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const saveNotes = useCallback(
    (value: string) => {
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
      notesTimerRef.current = setTimeout(() => {
        updateContact.mutate(
          { id: contact.id, data: { notes: value } },
          { onSuccess: onUpdate },
        );
      }, 1500);
    },
    [contact.id, updateContact, onUpdate],
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

  // Name edit
  const saveName = () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === contact.full_name) {
      setEditingName(false);
      setNameValue(contact.full_name);
      return;
    }
    updateContact.mutate(
      { id: contact.id, data: { full_name: trimmed } },
      {
        onSuccess: () => {
          setEditingName(false);
          onUpdate();
        },
      },
    );
  };

  // Tags
  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      setTags(newTags);
      setTagInput('');
      updateContact.mutate(
        { id: contact.id, data: { tags: newTags } },
        { onSuccess: onUpdate },
      );
    }
  };

  const removeTag = (tag: string) => {
    const newTags = tags.filter((t) => t !== tag);
    setTags(newTags);
    updateContact.mutate(
      { id: contact.id, data: { tags: newTags } },
      { onSuccess: onUpdate },
    );
  };

  // Relationship strength cycle
  const handleStrengthClick = (strength: RelationshipStrength) => {
    updateContact.mutate(
      { id: contact.id, data: { relationship_strength: strength } },
      { onSuccess: onUpdate },
    );
  };

  // Pipeline stage change
  const handleStageChange = (stage: string) => {
    updateContact.mutate(
      { id: contact.id, data: { pipeline_stage: stage } },
      { onSuccess: onUpdate },
    );
  };

  // Deal value save
  const dealTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const saveDealValue = useCallback(
    (value: string) => {
      if (dealTimerRef.current) clearTimeout(dealTimerRef.current);
      dealTimerRef.current = setTimeout(() => {
        const num = parseFloat(value);
        updateContact.mutate(
          { id: contact.id, data: { deal_value: isNaN(num) ? null : num } },
          { onSuccess: onUpdate },
        );
      }, 1500);
    },
    [contact.id, updateContact, onUpdate],
  );

  useEffect(() => {
    return () => {
      if (dealTimerRef.current) clearTimeout(dealTimerRef.current);
    };
  }, []);

  // Expected close date save
  const handleExpectedCloseChange = (value: string) => {
    setExpectedClose(value);
    updateContact.mutate(
      { id: contact.id, data: { expected_close_date: value || null } },
      { onSuccess: onUpdate },
    );
  };

  // Delete
  const handleDelete = () => {
    if (!confirm('¿Eliminar este contacto permanentemente?')) return;
    deleteContact.mutate(contact.id, {
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
        contactId: contact.id,
        data: {
          interaction_type: data.interaction_type as any,
          subject: data.subject,
          content: data.content,
          outcome: data.outcome as any,
          next_action: data.next_action,
          next_action_date: data.next_action_date || undefined,
        },
      },
      {
        onSuccess: () => setShowInteractionModal(false),
      },
    );
  };

  const socialLinks = contact.social_links || {};
  const hasSocials = socialLinks.instagram || socialLinks.tiktok || socialLinks.linkedin;
  const currentStrength = contact.relationship_strength || 'cold';

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
          {contact.avatar_url ? (
            <img
              src={contact.avatar_url}
              alt={contact.full_name}
              className="flex-shrink-0 w-11 h-11 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
            >
              {getInitials(contact.full_name)}
            </div>
          )}

          {/* Name + Badges */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <Input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName();
                  if (e.key === 'Escape') {
                    setEditingName(false);
                    setNameValue(contact.full_name);
                  }
                }}
                autoFocus
                className="bg-white/5 border-white/10 text-white text-sm h-7 px-2"
              />
            ) : (
              <h3
                className="text-white font-semibold truncate cursor-pointer hover:text-white/80 transition-colors"
                onClick={() => setEditingName(true)}
                title="Click para editar nombre"
              >
                {contact.full_name || 'Sin nombre'}
              </h3>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              {contact.contact_type && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                    CONTACT_TYPE_COLORS[contact.contact_type],
                  )}
                >
                  {CONTACT_TYPE_LABELS[contact.contact_type]}
                </span>
              )}
              {contact.relationship_strength && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-medium',
                    RELATIONSHIP_STRENGTH_COLORS[contact.relationship_strength],
                  )}
                >
                  {RELATIONSHIP_STRENGTH_LABELS[contact.relationship_strength]}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/10"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-[#0a0118] border-[#8b5cf6]/30">
                <DropdownMenuItem
                  onClick={() => setEditingName(true)}
                  className="gap-2 text-white focus:bg-white/10"
                >
                  <Edit className="h-4 w-4 text-[#a855f7]" />
                  Editar nombre
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-400"
                >
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
              <h4 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">
                Contacto
              </h4>

              {contact.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-white/30 flex-shrink-0" />
                  <span className="text-sm text-white/70 truncate flex-1">{contact.email}</span>
                  <CopyButton text={contact.email} />
                </div>
              )}

              {contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-white/30 flex-shrink-0" />
                  <span className="text-sm text-white/70 truncate flex-1">{contact.phone}</span>
                  <CopyButton text={contact.phone} />
                  <a
                    href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors text-green-400/60 hover:text-green-400"
                  >
                    <MessageCircle className="h-3 w-3" />
                  </a>
                </div>
              )}

              {contact.company && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-white/30 flex-shrink-0" />
                  <span className="text-sm text-white/70">{contact.company}</span>
                </div>
              )}

              {contact.position && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 text-white/30 flex-shrink-0" />
                  <span className="text-sm text-white/70">{contact.position}</span>
                </div>
              )}
            </section>

            {/* ---- Relationship Strength ---- */}
            <section className="space-y-2">
              <h4 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">
                Temperatura de relacion
              </h4>
              <div className="flex items-center gap-2">
                {STRENGTH_CYCLE.map((strength) => {
                  const config = STRENGTH_CONFIG[strength];
                  const Icon = config.icon;
                  const isActive = currentStrength === strength;
                  return (
                    <button
                      key={strength}
                      type="button"
                      onClick={() => handleStrengthClick(strength)}
                      className={cn(
                        'flex flex-col items-center gap-1 px-4 py-2.5 rounded-lg border transition-all',
                        isActive
                          ? cn(
                              'border-white/20 bg-white/5',
                              config.glowColor,
                            )
                          : 'border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-5 w-5 transition-colors',
                          isActive ? config.activeColor : config.color,
                        )}
                      />
                      <span
                        className={cn(
                          'text-[10px] font-medium transition-colors',
                          isActive ? 'text-white/80' : 'text-white/30',
                        )}
                      >
                        {RELATIONSHIP_STRENGTH_LABELS[strength]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ---- Pipeline Info (leads only) ---- */}
            {isLead && allStages.length > 0 && (
              <section className="space-y-3">
                <h4 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">
                  Pipeline
                </h4>

                {/* Stage */}
                <div className="space-y-1.5">
                  <span className="text-xs text-white/40">Etapa</span>
                  <Select
                    value={contact.pipeline_stage || ''}
                    onValueChange={handleStageChange}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-9">
                      <SelectValue placeholder="Seleccionar etapa" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0118] border-[#8b5cf6]/30">
                      {allStages.map((s) => (
                        <SelectItem
                          key={s.name}
                          value={s.name}
                          className="text-white focus:bg-white/10"
                        >
                          <span className="flex items-center gap-2">
                            {s.color && (
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: s.color }}
                              />
                            )}
                            {s.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Deal value & Close date */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-xs text-white/40">Valor del deal</span>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                      <Input
                        type="number"
                        value={dealValue}
                        onChange={(e) => {
                          setDealValue(e.target.value);
                          saveDealValue(e.target.value);
                        }}
                        placeholder="0"
                        className="bg-white/5 border-white/10 text-white pl-8 h-9 text-sm placeholder:text-white/30"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs text-white/40">Cierre esperado</span>
                    <div className="relative">
                      <CalendarClock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                      <Input
                        type="date"
                        value={expectedClose}
                        onChange={(e) => handleExpectedCloseChange(e.target.value)}
                        className="bg-white/5 border-white/10 text-white pl-8 h-9 text-sm [color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ---- Details Grid ---- */}
            <section className="space-y-2.5">
              <h4 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">
                Detalles
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {contact.contact_type && (
                  <>
                    <span className="text-white/40">Tipo</span>
                    <span className="text-white/70">
                      {CONTACT_TYPE_LABELS[contact.contact_type]}
                    </span>
                  </>
                )}
                {contact.company && (
                  <>
                    <span className="text-white/40">Empresa</span>
                    <span className="text-white/70">{contact.company}</span>
                  </>
                )}
                {contact.position && (
                  <>
                    <span className="text-white/40">Cargo</span>
                    <span className="text-white/70">{contact.position}</span>
                  </>
                )}
                {isLead && contact.deal_value != null && contact.deal_value > 0 && (
                  <>
                    <span className="text-white/40">Valor deal</span>
                    <span className="text-white/70 font-medium">
                      ${contact.deal_value.toLocaleString()}
                    </span>
                  </>
                )}
                {isLead && contact.expected_close_date && (
                  <>
                    <span className="text-white/40">Cierre esperado</span>
                    <span className="text-white/70">
                      {format(new Date(contact.expected_close_date), 'd MMM yyyy', { locale: es })}
                    </span>
                  </>
                )}
                <span className="text-white/40">Creado</span>
                <span className="text-white/70">
                  {formatDistanceToNow(new Date(contact.created_at), {
                    addSuffix: true,
                    locale: es,
                  })}
                </span>
              </div>
            </section>

            {/* ---- Social Links ---- */}
            {hasSocials && (
              <section className="space-y-2">
                <h4 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">
                  Redes sociales
                </h4>
                <div className="flex flex-wrap gap-2">
                  {socialLinks.instagram && (
                    <a
                      href={`https://instagram.com/${socialLinks.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:border-pink-500/40 hover:bg-pink-500/10 transition-all"
                    >
                      <Globe className="h-3 w-3" />
                      Instagram
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                  {socialLinks.tiktok && (
                    <a
                      href={`https://tiktok.com/@${socialLinks.tiktok.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all"
                    >
                      <Globe className="h-3 w-3" />
                      TikTok
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                  {socialLinks.linkedin && (
                    <a
                      href={
                        socialLinks.linkedin.startsWith('http')
                          ? socialLinks.linkedin
                          : `https://linkedin.com/in/${socialLinks.linkedin}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:border-blue-500/40 hover:bg-blue-500/10 transition-all"
                    >
                      <Globe className="h-3 w-3" />
                      LinkedIn
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </section>
            )}

            {/* ---- Tags ---- */}
            <section className="space-y-2">
              <h4 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">
                Etiquetas
              </h4>
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
              <h4 className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">
                Notas
              </h4>
              <Textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Notas sobre este contacto..."
                rows={3}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none text-xs"
              />
              {updateContact.isPending && (
                <p className="text-[10px] text-white/30">Guardando...</p>
              )}
            </section>

            {/* ---- Custom Fields ---- */}
            {fieldDefs.length > 0 && (
              <CustomFieldsSection
                customFields={customFieldsRef.current}
                fieldDefs={fieldDefs.filter(d => d.is_active)}
                onChange={handleCustomFieldChange}
                configAction={
                  <button
                    onClick={() => setShowFieldsConfig(true)}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    title="Configurar campos"
                  >
                    <Settings className="h-3.5 w-3.5 text-white/40 hover:text-white/60" />
                  </button>
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
      {showFieldsConfig && (
        <CrmFieldsConfigDialog
          open={showFieldsConfig}
          onOpenChange={setShowFieldsConfig}
          entityType="contact"
          organizationId={organizationId}
        />
      )}

      {/* Interaction Modal */}
      <AddInteractionModal
        open={showInteractionModal}
        onOpenChange={setShowInteractionModal}
        onSubmit={handleInteractionSubmit}
        isSubmitting={addInteraction.isPending}
        variant="contact"
      />
    </>
  );
}
