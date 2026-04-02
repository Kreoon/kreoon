import { useState, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  Snowflake,
  Sun,
  Flame,
  DollarSign,
  Building2,
  Clock,
  Filter,
  ChevronDown,
  GripVertical,
} from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useOrgContacts,
  useUpdateOrgContact,
  useOrgPipelines,
} from '@/hooks/useCrm';
import type {
  OrgContact,
  ContactType,
  RelationshipStrength,
  PipelineStage,
} from '@/types/crm.types';
import {
  CONTACT_TYPE_LABELS,
  RELATIONSHIP_STRENGTH_LABELS,
} from '@/types/crm.types';

// =====================================================
// Constants
// =====================================================

const CONTACT_TYPES: ContactType[] = ['lead', 'client', 'partner', 'vendor', 'influencer', 'other'];
const STRENGTHS: RelationshipStrength[] = ['cold', 'warm', 'hot'];

const STRENGTH_ICON: Record<RelationshipStrength, typeof Snowflake> = {
  cold: Snowflake,
  warm: Sun,
  hot: Flame,
};

const STRENGTH_COLOR: Record<RelationshipStrength, string> = {
  cold: 'text-blue-400',
  warm: 'text-yellow-400',
  hot: 'text-red-400',
};

const MAX_CARDS_PER_COLUMN = 10;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// =====================================================
// Compact Kanban Card
// =====================================================

interface KanbanCardProps {
  contact: OrgContact;
  onClick: (contact: OrgContact) => void;
  onDragStart: (e: React.DragEvent, contact: OrgContact) => void;
}

function KanbanCard({ contact, onClick, onDragStart }: KanbanCardProps) {
  const daysInStage = contact.updated_at
    ? differenceInDays(new Date(), new Date(contact.updated_at))
    : 0;

  const StrengthIcon = contact.relationship_strength
    ? STRENGTH_ICON[contact.relationship_strength]
    : null;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, contact)}
      onClick={() => onClick(contact)}
      className={cn(
        'group rounded-sm p-3 cursor-grab active:cursor-grabbing',
        'transition-all duration-150',
        'hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]',
      )}
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Top row: avatar + name + grip */}
      <div className="flex items-start gap-2.5">
        <GripVertical className="h-3.5 w-3.5 text-white/10 group-hover:text-white/30 flex-shrink-0 mt-0.5 transition-colors" />
        {contact.avatar_url ? (
          <img
            src={contact.avatar_url}
            alt={contact.full_name}
            className="w-7 h-7 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
          >
            {getInitials(contact.full_name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">{contact.full_name}</p>
          {contact.company && (
            <p className="text-[10px] text-white/40 truncate flex items-center gap-1 mt-0.5">
              <Building2 className="h-2.5 w-2.5 flex-shrink-0" />
              {contact.company}
            </p>
          )}
        </div>
      </div>

      {/* Bottom row: deal value + days + strength */}
      <div className="flex items-center justify-between mt-2 pl-6">
        {/* Deal value */}
        {contact.deal_value != null && contact.deal_value > 0 ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-400">
            <DollarSign className="h-2.5 w-2.5" />
            {contact.deal_value >= 1000000
              ? `${(contact.deal_value / 1000000).toFixed(1)}M`
              : contact.deal_value >= 1000
                ? `${(contact.deal_value / 1000).toFixed(0)}k`
                : contact.deal_value.toLocaleString()}
          </span>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          {/* Days in stage */}
          {daysInStage > 0 && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-[10px]',
                daysInStage > 14 ? 'text-red-400/60' : daysInStage > 7 ? 'text-yellow-400/60' : 'text-white/30',
              )}
              title={`${daysInStage} días en esta etapa`}
            >
              <Clock className="h-2.5 w-2.5" />
              {daysInStage}d
            </span>
          )}

          {/* Strength */}
          {StrengthIcon && (
            <span title={RELATIONSHIP_STRENGTH_LABELS[contact.relationship_strength!]}>
              <StrengthIcon
                className={cn('h-3 w-3', STRENGTH_COLOR[contact.relationship_strength!])}
              />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// Kanban Column
// =====================================================

interface KanbanColumnProps {
  stage: PipelineStage;
  contacts: OrgContact[];
  onCardClick: (contact: OrgContact) => void;
  onDragStart: (e: React.DragEvent, contact: OrgContact) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stageName: string) => void;
  isDragOver: boolean;
}

function KanbanColumn({
  stage,
  contacts,
  onCardClick,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: KanbanColumnProps) {
  const [showAll, setShowAll] = useState(false);
  const displayedContacts = showAll ? contacts : contacts.slice(0, MAX_CARDS_PER_COLUMN);
  const hiddenCount = contacts.length - MAX_CARDS_PER_COLUMN;

  const totalDealValue = contacts.reduce(
    (sum, c) => sum + (c.deal_value || 0),
    0,
  );

  return (
    <div
      className={cn(
        'flex-shrink-0 w-[280px] flex flex-col rounded-sm overflow-hidden transition-all',
        isDragOver && 'ring-2 ring-[#8b5cf6]/50',
      )}
      style={{
        background: isDragOver
          ? 'rgba(139, 92, 246, 0.06)'
          : 'rgba(255, 255, 255, 0.02)',
        border: isDragOver
          ? '1px solid rgba(139, 92, 246, 0.3)'
          : '1px solid rgba(255, 255, 255, 0.05)',
      }}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage.name)}
    >
      {/* Column Header */}
      <div
        className="px-3 py-2.5 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: `2px solid ${stage.color || '#8B5CF6'}` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: stage.color || '#8B5CF6' }}
          />
          <span className="text-xs font-semibold text-white truncate">{stage.name}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {totalDealValue > 0 && (
            <span className="text-[10px] text-green-400/60 font-mono">
              ${totalDealValue >= 1000000
                ? `${(totalDealValue / 1000000).toFixed(1)}M`
                : totalDealValue >= 1000
                  ? `${(totalDealValue / 1000).toFixed(0)}k`
                  : totalDealValue}
            </span>
          )}
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: (stage.color || '#8B5CF6') + '20',
              color: stage.color || '#8B5CF6',
            }}
          >
            {contacts.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]">
        {displayedContacts.length === 0 ? (
          <div className="flex items-center justify-center h-[80px]">
            <p className="text-[10px] text-white/15">Arrastra contactos aquí</p>
          </div>
        ) : (
          displayedContacts.map((contact) => (
            <KanbanCard
              key={contact.id}
              contact={contact}
              onClick={onCardClick}
              onDragStart={onDragStart}
            />
          ))
        )}

        {/* Show more */}
        {!showAll && hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full py-1.5 text-[10px] text-[#a855f7] hover:text-[#c084fc] hover:bg-[#8b5cf6]/5 rounded transition-colors"
          >
            Ver {hiddenCount} más
          </button>
        )}
        {showAll && hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(false)}
            className="w-full py-1.5 text-[10px] text-white/30 hover:text-white/50 hover:bg-white/5 rounded transition-colors"
          >
            Mostrar menos
          </button>
        )}
      </div>
    </div>
  );
}

// =====================================================
// Main Component
// =====================================================

interface ContactKanbanProps {
  organizationId: string;
  onContactClick: (contact: OrgContact) => void;
}

export function ContactKanban({ organizationId, onContactClick }: ContactKanbanProps) {
  const { data: pipelines = [], isLoading: pipelinesLoading } = useOrgPipelines(organizationId);
  const { data: allContacts = [], isLoading: contactsLoading } = useOrgContacts(organizationId);
  const updateContact = useUpdateOrgContact(organizationId);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [strengthFilter, setStrengthFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Pipeline selection - default to the pipeline marked is_default
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');

  const selectedPipeline = useMemo(() => {
    if (!pipelines.length) return null;
    if (selectedPipelineId) return pipelines.find((p) => p.id === selectedPipelineId) || null;
    return pipelines.find((p) => p.is_default) || pipelines[0];
  }, [pipelines, selectedPipelineId]);

  const stages = useMemo(() => {
    if (!selectedPipeline) return [];
    return [...(selectedPipeline.stages || [])].sort((a, b) => a.order - b.order);
  }, [selectedPipeline]);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    let result = allContacts;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q),
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter((c) => c.contact_type === typeFilter);
    }

    if (strengthFilter !== 'all') {
      result = result.filter((c) => c.relationship_strength === strengthFilter);
    }

    return result;
  }, [allContacts, search, typeFilter, strengthFilter]);

  // Group contacts by stage
  const contactsByStage = useMemo(() => {
    const map: Record<string, OrgContact[]> = {};
    const stageNames = new Set(stages.map((s) => s.name));

    for (const stage of stages) {
      map[stage.name] = [];
    }

    // "Sin asignar" for contacts with no stage or stage not in this pipeline
    map['__unassigned'] = [];

    for (const contact of filteredContacts) {
      if (contact.pipeline_stage && stageNames.has(contact.pipeline_stage)) {
        map[contact.pipeline_stage].push(contact);
      } else {
        map['__unassigned'].push(contact);
      }
    }

    return map;
  }, [filteredContacts, stages]);

  // Drag and drop
  const dragContactRef = useRef<OrgContact | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, contact: OrgContact) => {
    dragContactRef.current = contact;
    e.dataTransfer.effectAllowed = 'move';
    // Set data for fallback
    e.dataTransfer.setData('text/plain', contact.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stageName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageName);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverStage(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, stageName: string) => {
      e.preventDefault();
      setDragOverStage(null);

      const contact = dragContactRef.current;
      if (!contact) return;

      // Skip if same stage
      const targetStage = stageName === '__unassigned' ? null : stageName;
      if (contact.pipeline_stage === targetStage) return;

      updateContact.mutate({
        id: contact.id,
        data: { pipeline_stage: targetStage },
      });

      dragContactRef.current = null;
    },
    [updateContact],
  );

  const isLoading = pipelinesLoading || contactsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 bg-white/5" />
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[300px] w-[280px] bg-white/5 rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (!selectedPipeline || stages.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-white/30">
          No hay pipelines configurados. Crea uno en la pestaña "Pipelines".
        </p>
      </div>
    );
  }

  const unassignedCount = contactsByStage['__unassigned']?.length || 0;

  return (
    <div className="space-y-4" onDragLeave={handleDragLeave}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Pipeline Selector */}
        <Select
          value={selectedPipeline.id}
          onValueChange={setSelectedPipelineId}
        >
          <SelectTrigger className="w-52 bg-white/5 border-white/10 text-white h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-[#8b5cf6]/30">
            {pipelines.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-white focus:bg-white/10">
                <span className="flex items-center gap-2">
                  {p.name}
                  {p.is_default && (
                    <span className="text-[9px] text-[#a855f7] font-medium">(default)</span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input
            placeholder="Buscar contactos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 text-sm"
          />
        </div>

        {/* Filter toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'h-9 px-3 text-xs gap-1.5',
            showFilters
              ? 'text-[#a855f7] bg-[#8b5cf6]/10'
              : 'text-white/40 hover:text-white/70 hover:bg-white/5',
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          Filtros
          {(typeFilter !== 'all' || strengthFilter !== 'all') && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" />
          )}
          <ChevronDown
            className={cn('h-3 w-3 transition-transform', showFilters && 'rotate-180')}
          />
        </Button>

        {/* Contact count */}
        <span className="text-xs text-white/30 ml-auto">
          {filteredContacts.length} contacto{filteredContacts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filters row */}
      {showFilters && (
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <span className="text-[10px] text-white/30 uppercase tracking-wider">Tipo</span>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-[#8b5cf6]/30">
                <SelectItem value="all" className="text-white focus:bg-white/10 text-xs">
                  Todos los tipos
                </SelectItem>
                {CONTACT_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="text-white focus:bg-white/10 text-xs">
                    {CONTACT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-white/30 uppercase tracking-wider">Relación</span>
            <Select value={strengthFilter} onValueChange={setStrengthFilter}>
              <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-[#8b5cf6]/30">
                <SelectItem value="all" className="text-white focus:bg-white/10 text-xs">
                  Todas
                </SelectItem>
                {STRENGTHS.map((s) => (
                  <SelectItem key={s} value={s} className="text-white focus:bg-white/10 text-xs">
                    {RELATIONSHIP_STRENGTH_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(typeFilter !== 'all' || strengthFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTypeFilter('all');
                setStrengthFilter('all');
              }}
              className="h-8 text-xs text-white/40 hover:text-white mt-4"
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 md:-mx-6 md:px-6">
        {/* Regular stage columns */}
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.name}
            stage={stage}
            contacts={contactsByStage[stage.name] || []}
            onCardClick={onContactClick}
            onDragStart={handleDragStart}
            onDragOver={(e) => handleDragOver(e, stage.name)}
            onDrop={handleDrop}
            isDragOver={dragOverStage === stage.name}
          />
        ))}

        {/* Unassigned column */}
        {unassignedCount > 0 && (
          <KanbanColumn
            stage={{ name: 'Sin asignar', order: 999, color: '#6B7280' }}
            contacts={contactsByStage['__unassigned'] || []}
            onCardClick={onContactClick}
            onDragStart={handleDragStart}
            onDragOver={(e) => handleDragOver(e, '__unassigned')}
            onDrop={handleDrop}
            isDragOver={dragOverStage === '__unassigned'}
          />
        )}
      </div>
    </div>
  );
}
