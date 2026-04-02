import { useState, useCallback, useMemo } from 'react';
import { Filter, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LeadCard } from './LeadCard';
import type {
  PlatformLeadSummary,
  LeadStage,
  LeadType,
  LeadSource,
  TalentCategory,
  SpecificRole,
  RegistrationIntent,
} from '@/types/crm.types';
import {
  LEAD_STAGE_LABELS,
  LEAD_STAGE_COLORS,
  LEAD_SOURCE_LABELS,
  LEAD_TYPE_LABELS,
  TALENT_CATEGORY_LABELS,
  SPECIFIC_ROLE_LABELS,
  CATEGORY_ROLES,
  REGISTRATION_INTENT_LABELS,
} from '@/types/crm.types';

interface LeadKanbanProps {
  leads: PlatformLeadSummary[];
  onStageChange: (leadId: string, stage: LeadStage) => void;
  onEdit: (lead: PlatformLeadSummary) => void;
  onDelete: (leadId: string) => void;
  onClick?: (lead: PlatformLeadSummary) => void;
  onCreateLead?: () => void;
  isLoading?: boolean;
}

const STAGES: LeadStage[] = ['new', 'contacted', 'interested', 'demo_scheduled', 'converted', 'lost'];
const SOURCES: LeadSource[] = ['tiktok', 'instagram', 'referral', 'website', 'event', 'whatsapp'];
const LEAD_TYPES: LeadType[] = ['talent', 'brand', 'organization', 'other'];
const TALENT_CATEGORIES: TalentCategory[] = [
  'content_creation', 'post_production', 'strategy_marketing',
  'technology', 'education', 'client',
];
const REGISTRATION_INTENTS: RegistrationIntent[] = ['talent', 'brand', 'organization', 'join'];

const MAX_CARDS_PER_COLUMN = 8;

export function LeadKanban({
  leads,
  onStageChange,
  onEdit,
  onDelete,
  onClick,
  onCreateLead,
  isLoading,
}: LeadKanbanProps) {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [intentFilter, setIntentFilter] = useState<string>('all');
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [expandedColumns, setExpandedColumns] = useState<Set<LeadStage>>(new Set());

  // Dynamic roles based on selected category
  const availableRoles = useMemo(() => {
    if (categoryFilter !== 'all') {
      return CATEGORY_ROLES[categoryFilter as TalentCategory];
    }
    return Object.values(CATEGORY_ROLES).flat();
  }, [categoryFilter]);

  // Reset role filter when category changes and role is no longer valid
  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    if (value !== 'all' && roleFilter !== 'all') {
      const validRoles = CATEGORY_ROLES[value as TalentCategory];
      if (!validRoles.includes(roleFilter as SpecificRole)) {
        setRoleFilter('all');
      }
    }
  };

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    if (search) {
      const q = search.toLowerCase();
      const matchName = lead.full_name?.toLowerCase().includes(q);
      const matchEmail = lead.email?.toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }
    if (sourceFilter !== 'all' && lead.lead_source !== sourceFilter) return false;
    if (typeFilter !== 'all' && lead.lead_type !== typeFilter) return false;
    if (categoryFilter !== 'all' && lead.talent_category !== categoryFilter) return false;
    if (roleFilter !== 'all' && lead.specific_role !== roleFilter) return false;
    if (intentFilter !== 'all' && lead.registration_intent !== intentFilter) return false;
    return true;
  });

  // Group by stage
  const leadsByStage = STAGES.reduce<Record<LeadStage, PlatformLeadSummary[]>>((acc, stage) => {
    acc[stage] = filteredLeads.filter((l) => l.stage === stage);
    return acc;
  }, {} as Record<LeadStage, PlatformLeadSummary[]>);

  // Drag handlers
  const handleDragStart = useCallback((leadId: string) => (e: React.DragEvent) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((stage: LeadStage) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverStage(null);
  }, []);

  const handleDrop = useCallback(
    (stage: LeadStage) => (e: React.DragEvent) => {
      e.preventDefault();
      const leadId = e.dataTransfer.getData('text/plain');
      if (leadId) onStageChange(leadId, stage);
      setDragOverStage(null);
      setDraggedLeadId(null);
    },
    [onStageChange],
  );

  const toggleExpand = (stage: LeadStage) => {
    setExpandedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });
  };

  const hasActiveFilters = sourceFilter !== 'all' || typeFilter !== 'all' ||
    categoryFilter !== 'all' || roleFilter !== 'all' || intentFilter !== 'all' || !!search;

  const clearFilters = () => {
    setSearch('');
    setSourceFilter('all');
    setTypeFilter('all');
    setCategoryFilter('all');
    setRoleFilter('all');
    setIntentFilter('all');
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar - Row 1 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            placeholder="Buscar leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[150px] bg-white/5 border-white/10 text-white">
            <Filter className="h-3.5 w-3.5 mr-2 text-white/40" />
            <SelectValue placeholder="Fuente" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-[#8b5cf6]/30">
            <SelectItem value="all" className="text-white focus:bg-white/10">Todas</SelectItem>
            {SOURCES.map((s) => (
              <SelectItem key={s} value={s} className="text-white focus:bg-white/10">
                {LEAD_SOURCE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px] bg-white/5 border-white/10 text-white">
            <Filter className="h-3.5 w-3.5 mr-2 text-white/40" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-[#8b5cf6]/30">
            <SelectItem value="all" className="text-white focus:bg-white/10">Todos</SelectItem>
            {LEAD_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="text-white focus:bg-white/10">
                {LEAD_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {onCreateLead && (
          <Button
            onClick={onCreateLead}
            size="sm"
            className="bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:opacity-90 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nuevo lead
          </Button>
        )}
      </div>

      {/* Filters Bar - Row 2: Category, Role, Intent */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={categoryFilter} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-[200px] bg-white/5 border-white/10 text-white">
            <Filter className="h-3.5 w-3.5 mr-2 text-white/40" />
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-[#8b5cf6]/30">
            <SelectItem value="all" className="text-white focus:bg-white/10">Todas las categorías</SelectItem>
            {TALENT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="text-white focus:bg-white/10">
                {TALENT_CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[200px] bg-white/5 border-white/10 text-white">
            <Filter className="h-3.5 w-3.5 mr-2 text-white/40" />
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-[#8b5cf6]/30 max-h-[300px]">
            <SelectItem value="all" className="text-white focus:bg-white/10">Todos los roles</SelectItem>
            {availableRoles.map((r) => (
              <SelectItem key={r} value={r} className="text-white focus:bg-white/10">
                {SPECIFIC_ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={intentFilter} onValueChange={setIntentFilter}>
          <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-white">
            <Filter className="h-3.5 w-3.5 mr-2 text-white/40" />
            <SelectValue placeholder="Intent" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-[#8b5cf6]/30">
            <SelectItem value="all" className="text-white focus:bg-white/10">Todos</SelectItem>
            {REGISTRATION_INTENTS.map((i) => (
              <SelectItem key={i} value={i} className="text-white focus:bg-white/10">
                {REGISTRATION_INTENT_LABELS[i]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-[#a855f7] hover:text-[#c084fc] transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageLeads = leadsByStage[stage];
          const isExpanded = expandedColumns.has(stage);
          const visibleLeads = isExpanded ? stageLeads : stageLeads.slice(0, MAX_CARDS_PER_COLUMN);
          const hasMore = stageLeads.length > MAX_CARDS_PER_COLUMN && !isExpanded;

          return (
            <div
              key={stage}
              onDragOver={handleDragOver(stage)}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop(stage)}
              className={cn(
                'flex-shrink-0 w-[300px] rounded-sm border flex flex-col',
                'transition-all duration-200',
                dragOverStage === stage
                  ? 'ring-2 ring-[#a855f7]/60 shadow-[0_0_30px_rgba(168,85,247,0.15)]'
                  : '',
              )}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                borderColor: dragOverStage === stage ? 'rgba(168, 85, 247, 0.5)' : 'rgba(139, 92, 246, 0.2)',
                boxShadow: '0 0 20px rgba(139, 92, 246, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
              }}
            >
              {/* Column Header */}
              <div className="p-3 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold', LEAD_STAGE_COLORS[stage])}>
                    {LEAD_STAGE_LABELS[stage]}
                  </span>
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.5)' }}
                >
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-340px)]">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-[#8b5cf6]/30 border-t-[#8b5cf6] rounded-full animate-spin" />
                  </div>
                ) : visibleLeads.length === 0 ? (
                  <div className="text-center py-8 text-white/20 text-xs">Sin leads</div>
                ) : (
                  visibleLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onEdit={onEdit}
                      onStageChange={onStageChange}
                      onDelete={onDelete}
                      onClick={onClick}
                      draggable
                      onDragStart={handleDragStart(lead.id)}
                    />
                  ))
                )}
                {hasMore && (
                  <button
                    onClick={() => toggleExpand(stage)}
                    className="w-full py-2 text-xs text-[#a855f7] hover:text-[#c084fc] transition-colors rounded-sm hover:bg-white/5"
                  >
                    Ver {stageLeads.length - MAX_CARDS_PER_COLUMN} mas
                  </button>
                )}
                {isExpanded && stageLeads.length > MAX_CARDS_PER_COLUMN && (
                  <button
                    onClick={() => toggleExpand(stage)}
                    className="w-full py-2 text-xs text-white/30 hover:text-white/50 transition-colors rounded-sm hover:bg-white/5"
                  >
                    Ver menos
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
