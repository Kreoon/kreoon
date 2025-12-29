import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown, ChevronUp, ArrowUpDown, Star, Video, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Content, STATUS_COLORS, STATUS_LABELS } from "@/types/database";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { OrganizationStatus, getStatusLabel, getStatusColorStyle, getStatusFallbackClass, getStatusProgress } from "@/lib/statusUtils";

interface BoardTableViewProps {
  content: Content[];
  onContentClick: (content: Content) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  visibleFields?: string[];
  organizationStatuses?: OrganizationStatus[];
}

type SortField = 'title' | 'status' | 'client' | 'creator' | 'deadline' | 'created_at';
type SortDirection = 'asc' | 'desc';

// Column config based on visibleFields
const COLUMN_CONFIG = {
  title: { label: 'Título', sortable: true },
  thumbnail: { label: 'Miniatura', sortable: false },
  status: { label: 'Estado', sortable: true },
  client: { label: 'Cliente', sortable: true },
  responsible: { label: 'Responsable', sortable: true },
  deadline: { label: 'Fecha límite', sortable: true },
  progress: { label: 'Progreso', sortable: false },
  points: { label: 'Puntos', sortable: false },
  indicators: { label: 'Indicadores', sortable: false },
};

export function BoardTableView({
  content,
  onContentClick,
  selectedIds = [],
  onSelectionChange,
  visibleFields = ['title', 'thumbnail', 'status', 'client', 'responsible', 'deadline'],
  organizationStatuses = []
}: BoardTableViewProps) {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const showField = (field: string) => visibleFields.includes(field);

  const sortedContent = useMemo(() => {
    return [...content].sort((a, b) => {
      let aVal: string | number | null = null;
      let bVal: string | number | null = null;

      switch (sortField) {
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'client':
          aVal = a.client?.name?.toLowerCase() || '';
          bVal = b.client?.name?.toLowerCase() || '';
          break;
        case 'creator':
          aVal = a.creator?.full_name?.toLowerCase() || '';
          bVal = b.creator?.full_name?.toLowerCase() || '';
          break;
        case 'deadline':
          aVal = a.deadline ? new Date(a.deadline).getTime() : 0;
          bVal = b.deadline ? new Date(b.deadline).getTime() : 0;
          break;
        case 'created_at':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
      }

      if (aVal === null || bVal === null) return 0;
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [content, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (selectedIds.length === content.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(content.map(c => c.id));
    }
  };

  const toggleOne = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3 w-3 ml-1" />
      : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  // Build visible columns based on configuration
  const visibleColumns = visibleFields.filter(f => f in COLUMN_CONFIG);

  return (
    <div className="border rounded-xl overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {onSelectionChange && (
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedIds.length === content.length && content.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
            )}
            {visibleColumns.map(field => {
              const config = COLUMN_CONFIG[field as keyof typeof COLUMN_CONFIG];
              if (!config) return null;
              
              if (config.sortable) {
                return (
                  <TableHead 
                    key={field}
                    className="cursor-pointer" 
                    onClick={() => toggleSort(field as SortField)}
                  >
                    <div className="flex items-center">
                      {config.label} <SortIcon field={field as SortField} />
                    </div>
                  </TableHead>
                );
              }
              return <TableHead key={field}>{config.label}</TableHead>;
            })}
            <TableHead>Creado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedContent.map(c => {
            const isOverdue = c.deadline && new Date(c.deadline) < new Date() && !['approved', 'paid', 'delivered'].includes(c.status);
            const hasVideo = c.video_url || (c.video_urls && c.video_urls.length > 0);
            const hasRawVideo = c.raw_video_urls && c.raw_video_urls.length > 0;
            
            return (
              <TableRow 
                key={c.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onContentClick(c)}
              >
                {onSelectionChange && (
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedIds.includes(c.id)}
                      onCheckedChange={() => toggleOne(c.id)}
                    />
                  </TableCell>
                )}

                {/* Title column (with or without thumbnail) */}
                {showField('title') && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {showField('thumbnail') && c.thumbnail_url && (
                        <img 
                          src={c.thumbnail_url} 
                          alt="" 
                          className="h-8 w-12 rounded object-cover"
                        />
                      )}
                      <span className="font-medium line-clamp-1">{c.title}</span>
                    </div>
                  </TableCell>
                )}

                {/* Thumbnail only (if title not visible) */}
                {!showField('title') && showField('thumbnail') && (
                  <TableCell>
                    {c.thumbnail_url ? (
                      <img src={c.thumbnail_url} alt="" className="h-8 w-12 rounded object-cover" />
                    ) : (
                      <div className="h-8 w-12 rounded bg-muted" />
                    )}
                  </TableCell>
                )}

                {/* Status */}
                {showField('status') && (() => {
                  const statusStyle = getStatusColorStyle(c.status, organizationStatuses);
                  const statusClass = getStatusFallbackClass(c.status, organizationStatuses);
                  const label = getStatusLabel(c.status, organizationStatuses);
                  return (
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={cn("text-xs", statusClass)}
                        style={statusStyle || undefined}
                      >
                        {label}
                      </Badge>
                    </TableCell>
                  );
                })()}

                {/* Client */}
                {showField('client') && (
                  <TableCell className="text-muted-foreground">
                    {c.client?.name || '-'}
                  </TableCell>
                )}

                {/* Responsible */}
                {showField('responsible') && (
                  <TableCell>
                    {c.creator ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={c.creator.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {c.creator.full_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{c.creator.full_name?.split(' ')[0]}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                )}

                {/* Deadline */}
                {showField('deadline') && (
                  <TableCell className={cn(isOverdue && "text-destructive font-medium")}>
                    {c.deadline 
                      ? format(new Date(c.deadline), 'dd MMM yyyy', { locale: es })
                      : '-'
                    }
                  </TableCell>
                )}

                {/* Progress */}
                {showField('progress') && (
                  <TableCell>
                    <div className="w-20">
                      <Progress value={getStatusProgress(c.status, organizationStatuses)} className="h-1.5" />
                    </div>
                  </TableCell>
                )}

                {/* Points */}
                {showField('points') && (
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs text-amber-500">
                      <Star className="h-3 w-3 fill-current" />
                      <span>100</span>
                    </div>
                  </TableCell>
                )}

                {/* Indicators */}
                {showField('indicators') && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {hasRawVideo && <div className="h-2 w-2 rounded-full bg-orange-500" />}
                      {hasVideo && <div className="h-2 w-2 rounded-full bg-green-500" />}
                      {c.script && <div className="h-2 w-2 rounded-full bg-blue-500" />}
                    </div>
                  </TableCell>
                )}

                <TableCell className="text-muted-foreground">
                  {format(new Date(c.created_at), 'dd MMM yyyy', { locale: es })}
                </TableCell>
              </TableRow>
            );
          })}
          
          {content.length === 0 && (
            <TableRow>
              <TableCell colSpan={visibleColumns.length + 2} className="text-center py-8 text-muted-foreground">
                No hay contenido para mostrar
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
