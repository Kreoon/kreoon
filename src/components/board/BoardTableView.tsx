import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
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

interface BoardTableViewProps {
  content: Content[];
  onContentClick: (content: Content) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

type SortField = 'title' | 'status' | 'client' | 'creator' | 'deadline' | 'created_at';
type SortDirection = 'asc' | 'desc';

export function BoardTableView({
  content,
  onContentClick,
  selectedIds = [],
  onSelectionChange
}: BoardTableViewProps) {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
            <TableHead className="cursor-pointer" onClick={() => toggleSort('title')}>
              <div className="flex items-center">
                Título <SortIcon field="title" />
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => toggleSort('status')}>
              <div className="flex items-center">
                Estado <SortIcon field="status" />
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => toggleSort('client')}>
              <div className="flex items-center">
                Cliente <SortIcon field="client" />
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => toggleSort('creator')}>
              <div className="flex items-center">
                Creador <SortIcon field="creator" />
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => toggleSort('deadline')}>
              <div className="flex items-center">
                Fecha límite <SortIcon field="deadline" />
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => toggleSort('created_at')}>
              <div className="flex items-center">
                Creado <SortIcon field="created_at" />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedContent.map(c => {
            const isOverdue = c.deadline && new Date(c.deadline) < new Date() && !['approved', 'paid', 'delivered'].includes(c.status);
            
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
                <TableCell>
                  <div className="flex items-center gap-2">
                    {c.thumbnail_url && (
                      <img 
                        src={c.thumbnail_url} 
                        alt="" 
                        className="h-8 w-12 rounded object-cover"
                      />
                    )}
                    <span className="font-medium line-clamp-1">{c.title}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[c.status])}>
                    {STATUS_LABELS[c.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.client?.name || '-'}
                </TableCell>
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
                <TableCell className={cn(isOverdue && "text-destructive font-medium")}>
                  {c.deadline 
                    ? format(new Date(c.deadline), 'dd MMM yyyy', { locale: es })
                    : '-'
                  }
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(c.created_at), 'dd MMM yyyy', { locale: es })}
                </TableCell>
              </TableRow>
            );
          })}
          
          {content.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No hay contenido para mostrar
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
