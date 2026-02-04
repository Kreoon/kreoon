import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  TrendingUp,
  Clock,
  Star,
  Filter,
  Grid3X3,
  List,
  Heart,
  History,
  Bookmark,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIRecommendations } from '@/components/marketplace/AIRecommendations';
import { CompanyOnboarding } from '@/components/marketplace/CompanyOnboarding';
import { CreatorMatchingCard, CreatorMatchingGrid } from '@/components/marketplace/CreatorMatchingCard';
import { useCompanyProfile } from '@/hooks/useCompanyProfile';
import { useMarketplaceFavorites } from '@/hooks/useMarketplaceFavorites';
import { useSavedSearches } from '@/hooks/useCreatorMatching';
import type { CreatorMatch, IndustryId } from '@/types/ai-matching';

type ViewMode = 'grid' | 'list';

export default function ExploreCreatorsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'discover';
  const initialIndustry = searchParams.get('industry') as IndustryId | undefined;

  const { companyProfile, hasProfile, getProfileProgress } = useCompanyProfile();
  const { favorites, isLoading: favoritesLoading } = useMarketplaceFavorites();
  const { savedSearches, deleteSearch, runSavedSearch, isRunning } = useSavedSearches();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [savedSearchResults, setSavedSearchResults] = useState<CreatorMatch[] | null>(null);

  const profileProgress = getProfileProgress();

  const handleCreatorSelect = (match: CreatorMatch) => {
    navigate(`/social/profile/${match.creator.username || match.creator.id}`);
  };

  const handleContactCreator = (match: CreatorMatch) => {
    navigate(`/marketplace/chat?creator=${match.creator.id}`);
  };

  const handleRunSavedSearch = async (searchId: string) => {
    const results = await runSavedSearch(searchId);
    if (results) {
      setSavedSearchResults(results.matches);
    }
  };

  // Show onboarding if no profile
  if (!hasProfile && showOnboarding) {
    return (
      <div className="min-h-screen bg-social-background p-6">
        <CompanyOnboarding
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-social-background">
      {/* Header */}
      <div className="border-b border-social-border bg-social-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-social-foreground flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-social-accent" />
                Explorar creadores
              </h1>
              <p className="text-social-muted-foreground mt-1">
                Encuentra el talento perfecto para tu marca
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Profile completion prompt */}
              {hasProfile && profileProgress < 80 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOnboarding(true)}
                  className="hidden md:flex gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  Completar perfil ({profileProgress}%)
                </Button>
              )}

              {!hasProfile && (
                <Button
                  onClick={() => setShowOnboarding(true)}
                  className="gap-2 bg-gradient-to-r from-social-accent to-purple-600"
                >
                  <Sparkles className="h-4 w-4" />
                  Configurar perfil
                </Button>
              )}

              {/* View mode toggle */}
              <div className="flex rounded-lg border border-social-border overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 transition-colors",
                    viewMode === 'grid'
                      ? "bg-social-accent text-white"
                      : "bg-social-card text-social-muted-foreground hover:text-social-foreground"
                  )}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 transition-colors",
                    viewMode === 'list'
                      ? "bg-social-accent text-white"
                      : "bg-social-card text-social-muted-foreground hover:text-social-foreground"
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="discover" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Descubrir
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-2">
              <Heart className="h-4 w-4" />
              Favoritos
              {favorites.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {favorites.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <Bookmark className="h-4 w-4" />
              Búsquedas guardadas
            </TabsTrigger>
            <TabsTrigger value="recent" className="gap-2">
              <Clock className="h-4 w-4" />
              Recientes
            </TabsTrigger>
          </TabsList>

          {/* Discover tab */}
          <TabsContent value="discover">
            <AIRecommendations
              onCreatorSelect={handleCreatorSelect}
              onContactCreator={handleContactCreator}
              initialIndustry={initialIndustry}
            />
          </TabsContent>

          {/* Favorites tab */}
          <TabsContent value="favorites">
            {favoritesLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-social-accent border-t-transparent rounded-full mx-auto" />
              </div>
            ) : favorites.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-social-muted mb-4">
                  <Heart className="h-8 w-8 text-social-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-social-foreground mb-2">
                  Sin favoritos aún
                </h3>
                <p className="text-social-muted-foreground mb-4">
                  Guarda creadores que te interesen para contactarlos después
                </p>
                <Button onClick={() => setActiveTab('discover')}>
                  Explorar creadores
                </Button>
              </div>
            ) : (
              <div className={cn(
                "grid gap-4",
                viewMode === 'grid'
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-1"
              )}>
                {favorites.map((fav) => (
                  <motion.div
                    key={fav.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-4 rounded-xl bg-social-card border border-social-border",
                      "hover:border-social-accent/50 transition-all cursor-pointer"
                    )}
                    onClick={() => navigate(`/social/profile/${fav.creator?.username || fav.creator_id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={fav.creator?.avatar_url || '/placeholder-avatar.png'}
                        alt={fav.creator?.full_name || 'Creator'}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-social-foreground truncate">
                          {fav.creator?.full_name}
                        </p>
                        {fav.creator?.username && (
                          <p className="text-sm text-social-muted-foreground">
                            @{fav.creator.username}
                          </p>
                        )}
                      </div>
                      <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                    </div>
                    {fav.notes && (
                      <p className="text-sm text-social-muted-foreground mt-3 line-clamp-2">
                        {fav.notes}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Saved searches tab */}
          <TabsContent value="saved">
            {savedSearches.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-social-muted mb-4">
                  <Bookmark className="h-8 w-8 text-social-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-social-foreground mb-2">
                  Sin búsquedas guardadas
                </h3>
                <p className="text-social-muted-foreground mb-4">
                  Guarda búsquedas para recibir alertas de nuevos creadores
                </p>
                <Button onClick={() => setActiveTab('discover')}>
                  Hacer una búsqueda
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Saved searches list */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {savedSearches.map((search) => (
                    <div
                      key={search.id}
                      className="p-4 rounded-xl bg-social-card border border-social-border"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-social-foreground">
                            {search.search_name}
                          </h4>
                          <p className="text-sm text-social-muted-foreground">
                            {search.industry && `Industria: ${search.industry}`}
                          </p>
                        </div>
                        {search.notify_new_matches && (
                          <Badge variant="secondary">
                            Alertas {search.notify_frequency}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {search.content_types?.slice(0, 3).map((type) => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                        {search.tags?.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleRunSavedSearch(search.id)}
                          disabled={isRunning}
                          className="flex-1"
                        >
                          Ejecutar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteSearch(search.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Results from saved search */}
                {savedSearchResults && savedSearchResults.length > 0 && (
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-social-foreground">
                        Resultados de búsqueda guardada
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSavedSearchResults(null)}
                      >
                        Cerrar
                      </Button>
                    </div>
                    <CreatorMatchingGrid
                      matches={savedSearchResults}
                      onCreatorClick={handleCreatorSelect}
                      onContact={handleContactCreator}
                    />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Recent views tab */}
          <TabsContent value="recent">
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-social-muted mb-4">
                <History className="h-8 w-8 text-social-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-social-foreground mb-2">
                Historial de visitas
              </h3>
              <p className="text-social-muted-foreground mb-4">
                Aquí verás los creadores que has visitado recientemente
              </p>
              <Button onClick={() => setActiveTab('discover')}>
                Explorar creadores
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Quick stats for companies */}
      {hasProfile && (
        <div className="fixed bottom-6 right-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-xl bg-social-card border border-social-border shadow-lg"
          >
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <p className="font-bold text-social-foreground">{favorites.length}</p>
                <p className="text-social-muted-foreground">Favoritos</p>
              </div>
              <div className="h-8 w-px bg-social-border" />
              <div className="text-center">
                <p className="font-bold text-social-foreground">{savedSearches.length}</p>
                <p className="text-social-muted-foreground">Búsquedas</p>
              </div>
              <div className="h-8 w-px bg-social-border" />
              <div className="text-center">
                <p className="font-bold text-social-accent">{profileProgress}%</p>
                <p className="text-social-muted-foreground">Perfil</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
