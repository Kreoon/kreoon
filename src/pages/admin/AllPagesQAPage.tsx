/**
 * AllPagesQAPage - Todas las Páginas
 *
 * Panel exclusivo para root que lista todas las páginas/módulos
 * internos navegables de la app, agrupados por sección, para
 * poder validarlos rápido.
 */

import { Link } from 'react-router-dom';
import { ALL_APP_PAGES, countAllAppPages } from '@/lib/allAppPages';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, LayoutList } from 'lucide-react';

export default function AllPagesQAPage() {
  const total = countAllAppPages();

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6 md:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <LayoutList className="w-6 h-6 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">Todas las Páginas</h1>
        </div>
        <p className="text-zinc-400 max-w-2xl">
          {total} páginas/módulos internos de la app, agrupados por sección. Panel solo para
          root — pensado para validar rápido que todo carga bien. No incluye rutas públicas,
          legales, ni rutas que requieren un ID específico (esas se validan entrando desde su
          flujo normal).
        </p>
      </div>

      <div className="space-y-8">
        {ALL_APP_PAGES.map((section) => (
          <section key={section.label}>
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-3 flex items-center gap-2">
              {section.label}
              <span className="text-xs text-zinc-600 font-normal normal-case">
                ({section.items.length})
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {section.items.map((page) => {
                const Icon = page.icon;
                return (
                  <Link
                    key={page.path}
                    to={page.path}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#14141f] border border-zinc-800 hover:border-purple-500/40 hover:bg-[#191927] transition-colors duration-150 group"
                  >
                    <Icon className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 shrink-0" />
                    <span className="text-sm text-zinc-300 group-hover:text-zinc-100 truncate flex-1">
                      {page.name}
                    </span>
                    {page.note && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-500 shrink-0"
                      >
                        {page.note}
                      </Badge>
                    )}
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 shrink-0" />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
