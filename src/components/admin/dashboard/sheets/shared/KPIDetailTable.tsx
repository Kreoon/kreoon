import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
}

interface KPIDetailTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  pageSize?: number;
  emptyMessage?: string;
  getRowKey: (item: T, index: number) => string;
}

export function KPIDetailTable<T>({
  data,
  columns,
  pageSize = 20,
  emptyMessage = "Sin datos",
  getRowKey,
}: KPIDetailTableProps<T>) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const pageData = data.slice(page * pageSize, (page + 1) * pageSize);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-white/30 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wide sticky top-0 bg-[#1a1a2e]",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((item, idx) => (
              <tr
                key={getRowKey(item, page * pageSize + idx)}
                className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("py-2.5 px-3 text-white/80", col.className)}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-auto">
        <span className="text-xs text-white/40">
          {data.length} {data.length === 1 ? "item" : "items"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="h-7 w-7 p-0 text-white/50 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-white/50">
            {page + 1} de {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="h-7 w-7 p-0 text-white/50 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
