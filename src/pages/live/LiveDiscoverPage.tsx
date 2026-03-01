/**
 * LiveDiscoverPage - Página de descubrimiento de transmisiones en vivo
 */

import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useActiveLives } from '@/hooks/useLiveStream';
import { useAuth } from '@/hooks/useAuth';
import {
  LivesGrid,
  GoLiveModal,
} from '@/components/live-streaming';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Radio, Search, Plus } from 'lucide-react';
import { LIVE_CATEGORIES } from '@/types/live-streaming.types';
import type { LiveStreamWithCreator } from '@/types/live-streaming.types';

export default function LiveDiscoverPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showGoLiveModal, setShowGoLiveModal] = useState(false);

  const { data: streams = [], isLoading } = useActiveLives({
    category: category === 'all' ? undefined : category,
    limit: 50,
  });

  // Filtrar por búsqueda
  const filteredStreams = (streams as LiveStreamWithCreator[]).filter((stream) => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    return (
      stream.title.toLowerCase().includes(searchLower) ||
      stream.creator?.full_name?.toLowerCase().includes(searchLower) ||
      stream.description?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      <Helmet>
        <title>En Vivo | KREOON</title>
        <meta
          name="description"
          content="Descubre transmisiones en vivo de creadores en KREOON"
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="container max-w-7xl mx-auto p-4 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Radio className="h-8 w-8 text-red-500" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">En Vivo</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredStreams.length} {filteredStreams.length === 1 ? 'transmisión activa' : 'transmisiones activas'}
                </p>
              </div>
            </div>

            {user && (
              <Button onClick={() => setShowGoLiveModal(true)} className="bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4 mr-2" />
                Ir en Vivo
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar streams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Category filter - Desktop */}
            <div className="hidden sm:block">
              <Tabs value={category} onValueChange={setCategory}>
                <TabsList>
                  <TabsTrigger value="all">Todos</TabsTrigger>
                  {LIVE_CATEGORIES.slice(0, 5).map((cat) => (
                    <TabsTrigger key={cat.value} value={cat.value}>
                      {cat.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Category filter - Mobile */}
            <div className="sm:hidden">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {LIVE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grid */}
          <LivesGrid
            streams={filteredStreams}
            isLoading={isLoading}
            emptyMessage={
              search
                ? 'No se encontraron transmisiones con esa búsqueda'
                : category !== 'all'
                ? 'No hay transmisiones en esta categoría'
                : 'No hay transmisiones en vivo en este momento'
            }
          />
        </div>
      </div>

      {/* Go Live Modal */}
      <GoLiveModal
        open={showGoLiveModal}
        onOpenChange={setShowGoLiveModal}
        onLiveStarted={() => {
          setShowGoLiveModal(false);
          // Navegar a página de broadcast
          navigate('/live/broadcast');
        }}
      />
    </>
  );
}
