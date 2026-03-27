import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Star, Crown, Settings2, DollarSign, CheckCircle2, XCircle, Package, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Content } from "@/types/database";
import { cn } from "@/lib/utils";
import { useState, useMemo, useCallback, useEffect } from "react";
import { OrganizationStatus, getStatusLabel, getStatusColorStyle, getStatusFallbackClass, getStatusProgress } from "@/lib/statusUtils";
import { ResizableTableHeader, useColumnConfig } from "./ResizableTableHeader";
import { TableColumnsManager } from "./TableColumnsManager";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

interface BoardTableViewProps {
  content: Content[];
  onContentClick: (content: Content) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  visibleFields?: string[];
  organizationStatuses?: OrganizationStatus[];
  ambassadorIds?: Set<string>;
  // Props para personalización estilo Notion
  columnOrder?: string[];
  columnWidths?: Record<string, number>;
  onColumnOrderChange?: (order: string[]) => void;
  onColumnWidthsChange?: (widths: Record<string, number>) => void;
  onVisibleFieldsChange?: (fields: string[]) => void;
  enableReorder?: boolean;
  enableResize?: boolean;
  // Sort state persistente
  initialSortField?: SortField;
  initialSortDirection?: SortDirection;
  onSortChange?: (field: SortField, direction: SortDirection) => void;
}

type SortField = 'title' | 'status' | 'client' | 'creator' | 'deadline' | 'created_at';
type SortDirection = 'asc' | 'desc';

// Column config based on visibleFields
const COLUMN_CONFIG: Record<string, { label: string; sortable: boolean }> = {
  title: { label: 'Título', sortable: true },
  thumbnail: { label: 'Miniatura', sortable: false },
  status: { label: 'Estado', sortable: true },
  client: { label: 'Cliente', sortable: true },
  responsible: { label: 'Equipo', sortable: true },
  creator: { label: 'Creador', sortable: true },
  editor: { label: 'Editor', sortable: true },
  deadline: { label: 'Fecha límite', sortable: true },
  created_at: { label: 'Creado', sortable: true },
  progress: { label: 'Progreso', sortable: false },
  points: { label: 'Puntos UP', sortable: true },
  indicators: { label: 'Indicadores', sortable: false },
  // Nuevos campos de proyecto
  sphere_phase: { label: 'Fase Esfera', sortable: true },
  campaign_week: { label: 'Semana', sortable: true },
  start_date: { label: 'Fecha Inicio', sortable: true },
  creator_payment: { label: 'Pago Creador', sortable: true },
  editor_payment: { label: 'Pago Editor', sortable: true },
  payment_status: { label: 'Estado Pago', sortable: false },
  invoiced: { label: 'Facturado', sortable: false },
  product: { label: 'Producto', sortable: true },
  sales_angle: { label: 'Ángulo Ventas', sortable: false },
  views_count: { label: 'Vistas', sortable: true },
};

function BoardTableViewInner({
  content,
  onContentClick,
  selectedIds = [],
  onSelectionChange,
  visibleFields = ['title', 'thumbnail', 'status', 'client', 'responsible', 'deadline'],
  organizationStatuses = [],
  ambassadorIds = new Set(),
  columnOrder: externalColumnOrder,
  columnWidths: externalColumnWidths,
  onColumnOrderChange,
  onColumnWidthsChange,
  onVisibleFieldsChange,
  enableReorder = true,
  enableResize = true,
  initialSortField = 'created_at',
  initialSortDirection = 'desc',
  onSortChange,
}: BoardTableViewProps) {
  const [sortField, setSortField] = useState<SortField>(initialSortField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);

  // Usar configuración externa o local
  const {
    columnOrder: localColumnOrder,
    columnWidths: localColumnWidths,
    moveColumn: localMoveColumn,
    resizeColumn: localResizeColumn,
    setColumnOrder: setLocalColumnOrder,
    setColumnWidths: setLocalColumnWidths,
  } = useColumnConfig(visibleFields, externalColumnWidths || {});

  // Sincronizar con props externas
  useEffect(() => {
    if (externalColumnOrder) {
      setLocalColumnOrder(externalColumnOrder);
    }
  }, [externalColumnOrder, setLocalColumnOrder]);

  useEffect(() => {
    if (externalColumnWidths) {
      setLocalColumnWidths(externalColumnWidths);
    }
  }, [externalColumnWidths, setLocalColumnWidths]);

  const columnOrder = externalColumnOrder || localColumnOrder;
  const columnWidths = externalColumnWidths || localColumnWidths;

  const handleMoveColumn = useCallback((dragIndex: number, hoverIndex: number) => {
    localMoveColumn(dragIndex, hoverIndex);
    if (onColumnOrderChange) {
      const newOrder = [...columnOrder];
      const [removed] = newOrder.splice(dragIndex, 1);
      newOrder.splice(hoverIndex, 0, removed);
      onColumnOrderChange(newOrder);
    }
  }, [localMoveColumn, columnOrder, onColumnOrderChange]);

  const handleResizeColumn = useCallback((field: string, width: number) => {
    localResizeColumn(field, width);
    if (onColumnWidthsChange) {
      onColumnWidthsChange({ ...columnWidths, [field]: width });
    }
  }, [localResizeColumn, columnWidths, onColumnWidthsChange]);

  // Handler para ocultar columna - estilo Notion
  const handleHideColumn = useCallback((field: string) => {
    if (onVisibleFieldsChange) {
      const newFields = visibleFields.filter(f => f !== field);
      onVisibleFieldsChange(newFields);
    }
  }, [visibleFields, onVisibleFieldsChange]);

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

  const toggleSort = (field: string) => {
    let newField: SortField;
    let newDirection: SortDirection;

    if (sortField === field) {
      newField = field as SortField;
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      newField = field as SortField;
      newDirection = 'asc';
    }

    setSortField(newField);
    setSortDirection(newDirection);

    // Persistir cambio de ordenamiento
    if (onSortChange) {
      onSortChange(newField, newDirection);
    }
  };

  // Build visible columns based on configuration, respecting order
  const visibleColumns = useMemo(() => {
    const orderedFields = columnOrder.filter(f => visibleFields.includes(f) && f in COLUMN_CONFIG);
    // Add any visible fields not in columnOrder
    visibleFields.forEach(f => {
      if (f in COLUMN_CONFIG && !orderedFields.includes(f)) {
        orderedFields.push(f);
      }
    });

    // Filtrar columnas que se renderizan dentro de otras:
    // - thumbnail se muestra dentro de title, no como columna separada
    // - creator/editor se muestran dentro de responsible
    return orderedFields.filter(f => {
      if (f === 'thumbnail' && orderedFields.includes('title')) return false;
      if (f === 'creator' && orderedFields.includes('responsible')) return false;
      if (f === 'editor' && orderedFields.includes('responsible')) return false;
      return true;
    });
  }, [columnOrder, visibleFields]);

  // Función para renderizar celdas dinámicamente según el campo
  const renderCell = useCallback((field: string, c: Content) => {
    const isOverdue = c.deadline && new Date(c.deadline) < new Date() && !['approved', 'paid', 'delivered', 'corrected'].includes(c.status);
    const hasVideo = c.video_url || (c.video_urls && c.video_urls.length > 0);
    const hasRawVideo = c.raw_video_urls && c.raw_video_urls.length > 0;

    switch (field) {
      case 'title':
        return (
          <TableCell key={field} style={{ width: columnWidths[field] }}>
            <div className="flex items-center gap-2">
              {showField('thumbnail') && c.thumbnail_url && (
                <img
                  src={c.thumbnail_url}
                  alt=""
                  className="h-8 w-12 rounded object-cover flex-shrink-0"
                />
              )}
              <span className="font-medium line-clamp-1">{c.title}</span>
            </div>
          </TableCell>
        );

      case 'thumbnail':
        // Si title está visible, thumbnail se muestra dentro de title
        if (showField('title')) return null;
        return (
          <TableCell key={field} style={{ width: columnWidths[field] }}>
            {c.thumbnail_url ? (
              <img src={c.thumbnail_url} alt="" className="h-8 w-12 rounded object-cover" />
            ) : (
              <div className="h-8 w-12 rounded bg-muted" />
            )}
          </TableCell>
        );

      case 'status': {
        const statusStyle = getStatusColorStyle(c.status, organizationStatuses);
        const statusClass = getStatusFallbackClass(c.status, organizationStatuses);
        const label = getStatusLabel(c.status, organizationStatuses);
        return (
          <TableCell key={field} style={{ width: columnWidths[field] }}>
            <Badge
              variant="secondary"
              className={cn("text-xs", statusClass)}
              style={statusStyle || undefined}
            >
              {label}
            </Badge>
          </TableCell>
        );
      }

      case 'client':
        return (
          <TableCell key={field} className="text-muted-foreground" style={{ width: columnWidths[field] }}>
            {c.client?.name || '-'}
          </TableCell>
        );

      case 'responsible':
        return (
          <TableCell key={field} style={{ width: columnWidths[field] }}>
            <div className="flex items-center gap-2">
              {c.creator && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <div className="relative">
                        <Avatar className="h-6 w-6 ring-2 ring-cyan-500/50">
                          <AvatarImage src={c.creator.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-cyan-500/20 text-cyan-600">
                            {c.creator.full_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {c.creator_id && ambassadorIds.has(c.creator_id) && (
                          <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5">
                            <Crown className="h-2 w-2 text-white fill-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-cyan-500">C:</span> {c.creator.full_name}
                      {c.creator_id && ambassadorIds.has(c.creator_id) && (
                        <Crown className="h-3 w-3 text-amber-500 fill-amber-500" />
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
              {c.editor && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Avatar className="h-6 w-6 ring-2 ring-purple-500/50">
                        <AvatarImage src={c.editor.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-purple-500/20 text-purple-600">
                          {c.editor.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <span className="font-medium text-purple-500">E:</span> {c.editor.full_name}
                  </TooltipContent>
                </Tooltip>
              )}
              {!c.creator && !c.editor && (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
          </TableCell>
        );

      case 'creator':
        // Si 'responsible' está visible, no mostrar creator separado
        if (showField('responsible')) return null;
        return (
          <TableCell key={field} style={{ width: columnWidths[field] }}>
            {c.creator ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6 ring-2 ring-cyan-500/50">
                      <AvatarImage src={c.creator.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{c.creator.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{c.creator.full_name?.split(' ')[0]}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{c.creator.full_name}</TooltipContent>
              </Tooltip>
            ) : <span className="text-muted-foreground">-</span>}
          </TableCell>
        );

      case 'editor':
        // Si 'responsible' está visible, no mostrar editor separado
        if (showField('responsible')) return null;
        return (
          <TableCell key={field} style={{ width: columnWidths[field] }}>
            {c.editor ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6 ring-2 ring-purple-500/50">
                      <AvatarImage src={c.editor.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{c.editor.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{c.editor.full_name?.split(' ')[0]}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{c.editor.full_name}</TooltipContent>
              </Tooltip>
            ) : <span className="text-muted-foreground">-</span>}
          </TableCell>
        );

      case 'deadline':
        return (
          <TableCell key={field} className={cn(isOverdue && "text-destructive font-medium")} style={{ width: columnWidths[field] }}>
            {c.deadline
              ? format(new Date(c.deadline), 'dd MMM yyyy', { locale: es })
              : '-'
            }
          </TableCell>
        );

      case 'progress':
        return (
          <TableCell key={field} style={{ width: columnWidths[field] }}>
            <div className="w-20">
              <Progress value={getStatusProgress(c.status, organizationStatuses)} className="h-1.5" />
            </div>
          </TableCell>
        );

      case 'points':
        return (
          <TableCell key={field} style={{ width: columnWidths[field] }}>
            <div className="flex items-center gap-1 text-xs text-amber-500">
              <Star className="h-3 w-3 fill-current" />
              <span>{c.up_points || 0}</span>
            </div>
          </TableCell>
        );

      case 'indicators':
        return (
          <TableCell key={field} style={{ width: columnWidths[field] }}>
            <div className="flex items-center gap-1">
              {hasRawVideo && <div className="h-2 w-2 rounded-full bg-orange-500" />}
              {hasVideo && <div className="h-2 w-2 rounded-full bg-green-500" />}
              {c.script && <div className="h-2 w-2 rounded-full bg-blue-500" />}
            </div>
          </TableCell>
        );

      // === Nuevos campos de proyecto ===

      case 'sphere_phase':
        return (
          <TableCell key={field} style={{ width: columnWidths[field] }}>
            {c.sphere_phase ? (
              <Badge variant="outline" className="text-xs">
                {c.sphere_phase}
              </Badge>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
        );

      case 'campaign_week':
        return (
          <TableCell key={field} style={{ width: columnWidths[field] }}>
            {c.campaign_week ? (
              <Badge variant="secondary" className="text-xs">
                S{c.campaign_week}
              </Badge>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
        );

      case 'start_date':
        return (
          <TableCell key={field} style={{ width: columnWidths[field] }}>
            {c.start_date
              ? format(new Date(c.start_date), 'dd MMM yyyy', { locale: es })
              : <span className="text-muted-foreground">-</span>
            }
          </TableCell>
        );

      case 'creator_payment':
        return (
          <TableCell key={field} style={{ width: columnWidths[field] }}>
            {c.creator_payment != null ? (
              <div className="flex items-center gap-1 text-xs">
                <DollarSign className="h-3 w-3 text-emerald-500" />
                <span className="font-medium">{c.creator_payment.toLocaleString()}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
        );

      case 'editor_payment':
        return (
          <TableCell key={field} style={{ width: columnWidths[field] }}>
            {c.editor_payment != null ? (
              <div className="flex items-center gap-1 text-xs">
                <DollarSign className="h-3 w-3 text-emerald-500" />
                <span className="font-medium">{c.editor_payment.toLocaleString()}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
        );

      case 'payment_status':
        return (
          <TableCell key={field} style={{ width: columnWidths[field] }}>
            <div className="flex items-center gap-2">
              {c.creator_paid && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-0.5 text-xs text-emerald-500">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>C</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Creador pagado</TooltipContent>
                </Tooltip>
              )}
              {c.editor_paid && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-0.5 text-xs text-emerald-500">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>E</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Editor pagado</TooltipContent>
                </Tooltip>
              )}
              {!c.creator_paid && !c.editor_paid && (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
          </TableCell>
        );

      case 'invoiced':
        return (
          <TableCell key={field} style={{ width: columnWidths[field] }}>
            {c.invoiced ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground/50" />
            )}
          </TableCell>
        );

      case 'product':
        return (
          <TableCell key={field} style={{ width: columnWidths[field] }}>
            {c.product ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs">
                    <Package className="h-3 w-3 text-blue-500" />
                    <span className="truncate max-w-[100px]">{c.product.name}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{c.product.name}</TooltipContent>
              </Tooltip>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
        );

      case 'sales_angle':
        return (
          <TableCell key={field} style={{ width: columnWidths[field] }}>
            {c.sales_angle ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs truncate max-w-[120px] block">{c.sales_angle}</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px]">{c.sales_angle}</TooltipContent>
              </Tooltip>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
        );

      case 'views_count':
        return (
          <TableCell key={field} style={{ width: columnWidths[field] }}>
            {c.views_count != null ? (
              <span className="text-xs font-medium">{c.views_count.toLocaleString()}</span>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
        );

      default:
        return null;
    }
  }, [columnWidths, showField, organizationStatuses, ambassadorIds]);

  // Calcular totales para la fila de footer
  const totals = useMemo(() => ({
    count: content.length,
    creator_payment: content.reduce((sum, c) => sum + (c.creator_payment || 0), 0),
    editor_payment: content.reduce((sum, c) => sum + (c.editor_payment || 0), 0),
    up_points: content.reduce((sum, c) => sum + (c.up_points || 0), 0),
    views_count: content.reduce((sum, c) => sum + (c.views_count || 0), 0),
    invoiced_count: content.filter(c => c.invoiced).length,
    creator_paid_count: content.filter(c => c.creator_paid).length,
    editor_paid_count: content.filter(c => c.editor_paid).length,
  }), [content]);

  // Renderizar celda de totales según el campo
  const renderTotalCell = useCallback((field: string) => {
    switch (field) {
      case 'title':
        return (
          <TableCell key={field} className="font-semibold">
            {totals.count} proyectos
          </TableCell>
        );
      case 'creator_payment':
        return (
          <TableCell key={field}>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <DollarSign className="h-3 w-3" />
              {totals.creator_payment.toLocaleString()}
            </div>
          </TableCell>
        );
      case 'editor_payment':
        return (
          <TableCell key={field}>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <DollarSign className="h-3 w-3" />
              {totals.editor_payment.toLocaleString()}
            </div>
          </TableCell>
        );
      case 'points':
        return (
          <TableCell key={field}>
            <div className="flex items-center gap-1 text-xs font-semibold text-amber-500">
              <Star className="h-3 w-3 fill-current" />
              {totals.up_points.toLocaleString()}
            </div>
          </TableCell>
        );
      case 'views_count':
        return (
          <TableCell key={field} className="text-xs font-semibold">
            {totals.views_count.toLocaleString()}
          </TableCell>
        );
      case 'invoiced':
        return (
          <TableCell key={field} className="text-xs">
            {totals.invoiced_count}/{totals.count}
          </TableCell>
        );
      case 'payment_status':
        return (
          <TableCell key={field} className="text-xs">
            <div className="flex items-center gap-2">
              <span className="text-cyan-500">C: {totals.creator_paid_count}</span>
              <span className="text-purple-500">E: {totals.editor_paid_count}</span>
            </div>
          </TableCell>
        );
      default:
        return <TableCell key={field}>-</TableCell>;
    }
  }, [totals]);

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-[#14141f] overflow-x-auto">
      <Table className="min-w-[700px]">
        <TableHeader>
          <TableRow className="bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 group">
            {onSelectionChange && (
              <TableCell className="w-12 p-2">
                <Checkbox
                  checked={selectedIds.length === content.length && content.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableCell>
            )}
            {visibleColumns.map((field, index) => {
              const config = COLUMN_CONFIG[field as keyof typeof COLUMN_CONFIG];
              if (!config) return null;

              return (
                <ResizableTableHeader
                  key={field}
                  field={field}
                  label={config.label}
                  index={index}
                  sortable={config.sortable}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={() => toggleSort(field)}
                  width={columnWidths[field]}
                  onResize={enableResize ? handleResizeColumn : undefined}
                  onDragEnd={enableReorder ? handleMoveColumn : undefined}
                  isDraggable={enableReorder}
                  minWidth={80}
                  onHideColumn={onVisibleFieldsChange ? handleHideColumn : undefined}
                  canHide={field !== 'title'} // title siempre visible
                />
              );
            })}
            <ResizableTableHeader
              field="created_at"
              label="Creado"
              index={visibleColumns.length}
              sortable={true}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={() => toggleSort('created_at')}
              isDraggable={false}
              minWidth={100}
            />
            {/* Botón "+" para agregar columnas ocultas - estilo Notion */}
            {onVisibleFieldsChange && (
              <TableHead className="w-10 p-1">
                <TableColumnsManager
                  allFields={Object.keys(COLUMN_CONFIG).filter(f => {
                    // No mostrar campos redundantes que se renderizan dentro de otros
                    if (f === 'thumbnail' && visibleFields.includes('title')) return false;
                    if (f === 'creator' && visibleFields.includes('responsible')) return false;
                    if (f === 'editor' && visibleFields.includes('responsible')) return false;
                    return true;
                  })}
                  visibleFields={visibleFields}
                  onAddColumn={(field) => {
                    onVisibleFieldsChange([...visibleFields, field]);
                  }}
                />
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedContent.map(c => (
            <TableRow
              key={c.id}
              className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors duration-150"
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

              {/* Renderizado dinámico basado en visibleColumns */}
              {visibleColumns.map(field => renderCell(field, c))}

              {/* Columna fija: created_at */}
              <TableCell className="text-muted-foreground">
                {format(new Date(c.created_at), 'dd MMM yyyy', { locale: es })}
              </TableCell>
            </TableRow>
          ))}

          {content.length === 0 && (
            <TableRow>
              <TableCell colSpan={visibleColumns.length + 3} className="text-center py-8 text-muted-foreground">
                No hay contenido para mostrar
              </TableCell>
            </TableRow>
          )}
        </TableBody>

        {/* Fila de totales */}
        {content.length > 0 && (
          <TableFooter>
            <TableRow className="bg-zinc-100 dark:bg-zinc-800/50 font-medium">
              {onSelectionChange && <TableCell className="w-12">Σ</TableCell>}
              {visibleColumns.map(field => renderTotalCell(field))}
              <TableCell className="text-muted-foreground">-</TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}

// Wrapper con DndProvider para drag-drop
export function BoardTableView(props: BoardTableViewProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <BoardTableViewInner {...props} />
    </DndProvider>
  );
}
