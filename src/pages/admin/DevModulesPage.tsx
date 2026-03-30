/**
 * DevModulesPage - Módulos en Desarrollo
 *
 * Panel exclusivo para root que muestra todos los módulos
 * que están en desarrollo y ocultos para usuarios normales.
 */

import { useNavigate } from 'react-router-dom';
import { DEVELOPMENT_MODULES, type DevelopmentModule } from '@/lib/developmentModules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Blocks, ExternalLink } from 'lucide-react';

function ModuleCard({ module }: { module: DevelopmentModule }) {
  const navigate = useNavigate();
  const Icon = module.icon;

  const statusColors = {
    development: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    beta: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    paused: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
  };

  const statusLabels = {
    development: 'En Desarrollo',
    beta: 'Beta',
    paused: 'Pausado'
  };

  return (
    <Card className="bg-[#14141f] border-zinc-800 hover:border-purple-500/30 transition-colors duration-150">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="p-2 rounded-lg bg-purple-500/10 w-fit">
            <Icon className="w-5 h-5 text-purple-400" />
          </div>
          <Badge
            variant="outline"
            className={statusColors[module.status]}
          >
            {statusLabels[module.status]}
          </Badge>
        </div>
        <CardTitle className="text-zinc-100 text-lg mt-3">
          {module.name}
        </CardTitle>
        <CardDescription className="text-zinc-400">
          {module.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">Rutas cubiertas:</p>
            <div className="flex flex-wrap gap-1">
              {module.routes.slice(0, 3).map((route) => (
                <code
                  key={route}
                  className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400"
                >
                  {route}
                </code>
              ))}
              {module.routes.length > 3 && (
                <span className="text-xs text-zinc-500">
                  +{module.routes.length - 3} más
                </span>
              )}
            </div>
          </div>

          <Button
            onClick={() => navigate(module.routes[0])}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white"
            size="sm"
          >
            Acceder
            <ExternalLink className="w-3.5 h-3.5 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DevModulesPage() {
  const devModules = DEVELOPMENT_MODULES.filter(m => m.status === 'development');
  const betaModules = DEVELOPMENT_MODULES.filter(m => m.status === 'beta');
  const pausedModules = DEVELOPMENT_MODULES.filter(m => m.status === 'paused');

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Blocks className="w-6 h-6 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">
            Módulos en Desarrollo
          </h1>
        </div>
        <p className="text-zinc-400 max-w-2xl">
          Estos módulos están ocultos para usuarios normales mientras se terminan de desarrollar.
          Solo tú (root) puedes acceder a ellos para testing y revisión.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8 max-w-md">
        <div className="bg-[#14141f] border border-zinc-800 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{devModules.length}</p>
          <p className="text-xs text-zinc-500">En Desarrollo</p>
        </div>
        <div className="bg-[#14141f] border border-zinc-800 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-500">{betaModules.length}</p>
          <p className="text-xs text-zinc-500">Beta</p>
        </div>
        <div className="bg-[#14141f] border border-zinc-800 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-zinc-500">{pausedModules.length}</p>
          <p className="text-xs text-zinc-500">Pausados</p>
        </div>
      </div>

      {/* Modules Grid */}
      {devModules.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            En Desarrollo ({devModules.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {devModules.map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        </section>
      )}

      {betaModules.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Beta ({betaModules.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {betaModules.map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        </section>
      )}

      {pausedModules.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zinc-500" />
            Pausados ({pausedModules.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pausedModules.map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
