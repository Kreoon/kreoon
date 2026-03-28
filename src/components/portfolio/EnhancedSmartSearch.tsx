import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, User, Video, Building2, X, Loader2, 
  Trophy, Shield, Crown, Sparkles, TrendingUp, MapPin, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Extended user result with trust indicators
interface EnhancedUserResult {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  tagline: string | null;
  city: string | null;
  country: string | null;
  is_ambassador: boolean;
  // Profile enrichment
  best_at: string | null;
  interests: string[] | null;
  specialties_tags: string[] | null;
  content_categories: string[] | null;
  industries: string[] | null;
  experience_level: string | null;
  quality_score_avg: number | null;
  // Trust indicators
  current_level?: number | string;
  total_points?: number;
  achievements_count?: number;
  followers_count?: number;
  content_count?: number;
}

interface ContentResult {
  id: string;
  title: string;
  thumbnail_url: string | null;
  creator_name?: string;
  views_count?: number;
  likes_count?: number;
}

interface ClientResult {
  id: string;
  name: string;
  logo_url: string | null;
  category?: string;
  is_vip?: boolean;
  followers_count?: number;
}

interface EnhancedSmartSearchProps {
  className?: string;
  placeholder?: string;
  onSelectContent?: (contentId: string) => void;
  variant?: 'default' | 'icon' | 'full';
}

export function EnhancedSmartSearch({ 
  className, 
  placeholder = "Buscar creadores, contenido, marcas...", 
  onSelectContent,
  variant = 'default'
}: EnhancedSmartSearchProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isExpanded, setIsExpanded] = useState(variant !== 'icon');
  
  const [users, setUsers] = useState<EnhancedUserResult[]>([]);
  const [content, setContent] = useState<ContentResult[]>([]);
  const [clients, setClients] = useState<ClientResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);

  // Load recent and trending searches
  useEffect(() => {
    const stored = localStorage.getItem('social_recent_searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {}
    }
    setTrendingSearches(['UGC', 'fitness', 'moda', 'tech', 'belleza']);
  }, []);

  // Click outside handler
  useEffect(() => {
    if (variant !== 'icon') return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (!query) {
          setIsExpanded(false);
          setShowResults(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [variant, query]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  const saveRecentSearch = (searchTerm: string) => {
    const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 8);
    setRecentSearches(updated);
    localStorage.setItem('social_recent_searches', JSON.stringify(updated));
  };

  // Enhanced search across all profile data
  const performSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setUsers([]);
      setContent([]);
      setClients([]);
      return;
    }

    setIsSearching(true);

    try {
      const isUsernameSearch = trimmed.startsWith('@');
      const searchTerm = isUsernameSearch ? trimmed.slice(1) : trimmed;

      // Build comprehensive search filter for profiles
      // Searches across: name, username, bio, tagline, city, country, best_at, interests, specialties, categories, industries
      const profileSearchFilter = isUsernameSearch 
        ? `username.ilike.%${searchTerm}%`
        : `full_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%,tagline.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,country.ilike.%${searchTerm}%,best_at.ilike.%${searchTerm}%`;

      // Parallel search
      const [usersResult, contentResult, clientsResult] = await Promise.all([
        // Enhanced user search with all profile data
        supabase
          .from('profiles')
          .select(`
            id, 
            full_name, 
            username, 
            avatar_url, 
            bio,
            tagline,
            city,
            country,
            is_ambassador,
            best_at,
            interests,
            specialties_tags,
            content_categories,
            industries,
            experience_level,
            quality_score_avg
          `)
          .or(profileSearchFilter)
          .eq('is_public', true)
          .limit(12),

        // Content search
        !isUsernameSearch ? supabase
          .from('content')
          .select('id, title, thumbnail_url, creator_id, views_count, likes_count')
          .eq('is_published', true)
          .or(`title.ilike.%${searchTerm}%,caption.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
          .order('views_count', { ascending: false })
          .limit(6) : { data: [] },

        // Client/company search
        !isUsernameSearch ? supabase
          .from('clients')
          .select('id, name, logo_url, category, is_vip')
          .or(`name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
          .eq('is_public', true)
          .limit(4) : { data: [] }
      ]);

      // Also search in array fields (interests, specialties, categories, industries)
      let additionalUsers: typeof usersResult.data = [];
      if (!isUsernameSearch && usersResult.data && usersResult.data.length < 10) {
        // Search in array fields using contains
        const { data: arraySearchResult } = await supabase
          .from('profiles')
          .select(`
            id, 
            full_name, 
            username, 
            avatar_url, 
            bio,
            tagline,
            city,
            country,
            is_ambassador,
            best_at,
            interests,
            specialties_tags,
            content_categories,
            industries,
            experience_level,
            quality_score_avg
          `)
          .eq('is_public', true)
          .or(`interests.cs.{${searchTerm}},specialties_tags.cs.{${searchTerm}},content_categories.cs.{${searchTerm}},industries.cs.{${searchTerm}}`)
          .limit(5);
        
        additionalUsers = arraySearchResult || [];
      }

      // Merge and dedupe users
      const allUsersData = [...(usersResult.data || []), ...additionalUsers];
      const uniqueUsersMap = new Map(allUsersData.map(u => [u.id, u]));
      const uniqueUsers = Array.from(uniqueUsersMap.values());

      // Enrich users with UP data, achievements, and followers
      if (uniqueUsers.length > 0) {
        const userIds = uniqueUsers.map(u => u.id);
        
        // Fetch all enrichment data in parallel
        const [pointsResult, achievementsResult, followersResult, contentCountResult] = await Promise.all([
          supabase
            .from('up_creadores_totals')
            .select('user_id, total_points, current_level')
            .in('user_id', userIds),
          
          supabase
            .from('user_achievements')
            .select('user_id')
            .in('user_id', userIds),
          
          supabase
            .from('followers')
            .select('following_id')
            .in('following_id', userIds),
          
          supabase
            .from('content')
            .select('creator_id')
            .in('creator_id', userIds)
            .eq('is_published', true)
        ]);

        // Create lookup maps
        const pointsMap = new Map(
          (pointsResult.data || []).map(p => [p.user_id, p])
        );
        
        const achievementsCount = new Map<string, number>();
        (achievementsResult.data || []).forEach(a => {
          achievementsCount.set(a.user_id, (achievementsCount.get(a.user_id) || 0) + 1);
        });
        
        const followersCount = new Map<string, number>();
        (followersResult.data || []).forEach(f => {
          followersCount.set(f.following_id, (followersCount.get(f.following_id) || 0) + 1);
        });
        
        const contentCount = new Map<string, number>();
        (contentCountResult.data || []).forEach(c => {
          if (c.creator_id) {
            contentCount.set(c.creator_id, (contentCount.get(c.creator_id) || 0) + 1);
          }
        });

        // Enrich users
        const enrichedUsers: EnhancedUserResult[] = uniqueUsers.map(user => {
          const points = pointsMap.get(user.id);
          return {
            id: user.id,
            full_name: user.full_name,
            username: user.username,
            avatar_url: user.avatar_url,
            bio: user.bio,
            tagline: user.tagline,
            city: user.city,
            country: user.country,
            is_ambassador: user.is_ambassador || false,
            best_at: user.best_at,
            interests: user.interests as string[] | null,
            specialties_tags: user.specialties_tags as string[] | null,
            content_categories: user.content_categories as string[] | null,
            industries: user.industries as string[] | null,
            experience_level: user.experience_level,
            quality_score_avg: user.quality_score_avg,
            current_level: points?.current_level,
            total_points: points?.total_points,
            achievements_count: achievementsCount.get(user.id) || 0,
            followers_count: followersCount.get(user.id) || 0,
            content_count: contentCount.get(user.id) || 0,
          };
        });

        // Sort by relevance
        enrichedUsers.sort((a, b) => {
          const scoreA = (a.is_ambassador ? 50 : 0) + 
                        (a.quality_score_avg || 0) * 10 + 
                        (a.followers_count || 0) * 0.01 + 
                        (a.total_points || 0) * 0.001 +
                        (a.achievements_count || 0) * 2;
          const scoreB = (b.is_ambassador ? 50 : 0) + 
                        (b.quality_score_avg || 0) * 10 + 
                        (b.followers_count || 0) * 0.01 + 
                        (b.total_points || 0) * 0.001 +
                        (b.achievements_count || 0) * 2;
          return scoreB - scoreA;
        });

        setUsers(enrichedUsers.slice(0, 10));
      } else {
        setUsers([]);
      }

      // Enrich content with creator names
      if (contentResult.data && contentResult.data.length > 0) {
        const creatorIds = [...new Set(contentResult.data.filter(c => c.creator_id).map(c => c.creator_id))];
        if (creatorIds.length > 0) {
          const { data: creators } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', creatorIds as string[]);
          
          const creatorMap = new Map(creators?.map(c => [c.id, c.full_name]) || []);
          setContent(contentResult.data.map(c => ({
            ...c,
            creator_name: c.creator_id ? creatorMap.get(c.creator_id) : undefined
          })));
        } else {
          setContent(contentResult.data);
        }
      } else {
        setContent([]);
      }

      // Enrich clients with followers count
      if (clientsResult.data && clientsResult.data.length > 0) {
        const clientIds = clientsResult.data.map(c => c.id);
        const { data: companyFollowers } = await supabase
          .from('company_followers')
          .select('company_id')
          .in('company_id', clientIds);
        
        const clientFollowersCount = new Map<string, number>();
        (companyFollowers || []).forEach(f => {
          clientFollowersCount.set(f.company_id, (clientFollowersCount.get(f.company_id) || 0) + 1);
        });

        setClients(clientsResult.data.map(c => ({
          ...c,
          followers_count: clientFollowersCount.get(c.id) || 0
        })));
      } else {
        setClients([]);
      }

    } catch (error) {
      console.error('Enhanced search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  // Debounced search
  useEffect(() => {
    const debounce = setTimeout(performSearch, 300);
    return () => clearTimeout(debounce);
  }, [performSearch]);

  const handleUserClick = (user: EnhancedUserResult) => {
    saveRecentSearch(user.full_name);
    setQuery('');
    setShowResults(false);
    if (variant === 'icon') setIsExpanded(false);
    navigate(`/profile/${user.id}`);
  };

  const handleContentClick = (item: ContentResult) => {
    saveRecentSearch(item.title);
    setQuery('');
    setShowResults(false);
    if (variant === 'icon') setIsExpanded(false);
    if (onSelectContent) {
      onSelectContent(item.id);
    } else {
      navigate(`/social?v=${item.id}`);
    }
  };

  const handleClientClick = (client: ClientResult) => {
    saveRecentSearch(client.name);
    setQuery('');
    setShowResults(false);
    if (variant === 'icon') setIsExpanded(false);
    navigate(`/company/${client.id}`);
  };

  const handleRecentClick = (term: string) => {
    setQuery(term);
  };

  const clearSearch = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const handleExpand = () => setIsExpanded(true);
  const handleClose = () => {
    setQuery('');
    setShowResults(false);
    setIsExpanded(false);
  };

  const hasResults = users.length > 0 || content.length > 0 || clients.length > 0;
  const showDropdown = showResults && (query.length >= 2 || (query.length === 0 && (recentSearches.length > 0 || trendingSearches.length > 0)));

  const renderUserBadges = (user: EnhancedUserResult) => (
    <div className="flex items-center gap-1 flex-wrap">
      {user.is_ambassador && (
        <Shield className="h-3.5 w-3.5 text-primary" />
      )}
      {user.quality_score_avg && user.quality_score_avg >= 4 && (
        <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full">
          <Star className="h-2.5 w-2.5 fill-current" /> {user.quality_score_avg.toFixed(1)}
        </span>
      )}
      {user.current_level && Number(user.current_level) > 1 && (
        <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded-full flex items-center gap-0.5">
          <Trophy className="h-2.5 w-2.5" /> Nv.{user.current_level}
        </span>
      )}
    </div>
  );

  const renderUserMeta = (user: EnhancedUserResult) => {
    // Show specialties, categories or interests as tags
    const tags: string[] = [];
    if (user.best_at) tags.push(user.best_at);
    if (user.specialties_tags) tags.push(...user.specialties_tags.slice(0, 2));
    if (user.content_categories) tags.push(...user.content_categories.slice(0, 2));
    if (user.industries) tags.push(...user.industries.slice(0, 1));
    
    const uniqueTags = [...new Set(tags)].slice(0, 3);
    
    if (uniqueTags.length > 0) {
      return (
        <div className="flex flex-wrap gap-1 mt-1">
          {uniqueTags.map((tag, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-social-muted rounded text-social-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderUserStats = (user: EnhancedUserResult) => {
    const stats = [];
    if (user.followers_count && user.followers_count > 0) {
      stats.push(`${formatCount(user.followers_count)} seguidores`);
    }
    if (user.content_count && user.content_count > 0) {
      stats.push(`${user.content_count} videos`);
    }
    if (user.achievements_count && user.achievements_count > 0) {
      stats.push(`${user.achievements_count} logros`);
    }
    return stats.slice(0, 2).join(' · ');
  };

  const formatCount = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const renderDropdownContent = () => (
    <>
      {/* Loading */}
      {isSearching && (
        <div className="flex items-center justify-center gap-2 p-4 text-social-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Buscando...</span>
        </div>
      )}

      {/* Recent & Trending when empty */}
      {!isSearching && query.length === 0 && (
        <div className="p-2">
          {recentSearches.length > 0 && (
            <>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-medium text-social-muted-foreground uppercase tracking-wide">Recientes</span>
                <button
                  onClick={() => {
                    setRecentSearches([]);
                    localStorage.removeItem('social_recent_searches');
                  }}
                  className="text-xs text-social-muted-foreground hover:text-social-foreground"
                >
                  Borrar
                </button>
              </div>
              {recentSearches.slice(0, 4).map((term, i) => (
                <button
                  key={i}
                  onClick={() => handleRecentClick(term)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-social-muted rounded-sm transition text-left"
                >
                  <Search className="h-4 w-4 text-social-muted-foreground" />
                  <span className="text-social-foreground text-sm">{term}</span>
                </button>
              ))}
            </>
          )}
          
          {trendingSearches.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-3 py-2 mt-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-social-muted-foreground uppercase tracking-wide">Tendencias</span>
              </div>
              <div className="flex flex-wrap gap-2 px-3 pb-2">
                {trendingSearches.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => handleRecentClick(term)}
                    className="px-3 py-1.5 bg-social-muted hover:bg-social-accent rounded-full text-sm text-social-foreground transition"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Search tips */}
      {!isSearching && query.length === 0 && recentSearches.length === 0 && trendingSearches.length === 0 && (
        <div className="p-4 text-center">
          <Sparkles className="h-6 w-6 mx-auto mb-2 text-primary/50" />
          <p className="text-social-muted-foreground text-xs">
            Busca por nombre, nicho, especialidad, industria, ciudad o país
          </p>
        </div>
      )}

      {/* No results */}
      {!isSearching && query.length >= 2 && !hasResults && (
        <div className="p-6 text-center">
          <Search className="h-8 w-8 mx-auto mb-2 text-social-muted-foreground/30" />
          <p className="text-social-muted-foreground text-sm">No se encontraron resultados para "{query}"</p>
        </div>
      )}

      {/* Users with full trust indicators */}
      {!isSearching && users.length > 0 && (
        <div className="p-2 border-b border-social-border">
          <div className="flex items-center gap-2 px-3 py-2">
            <User className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-social-muted-foreground uppercase tracking-wide">Creadores</span>
          </div>
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => handleUserClick(user)}
              className="w-full flex items-center gap-3 px-3 py-3 hover:bg-social-muted rounded-sm transition text-left"
            >
              <Avatar className="h-12 w-12 ring-2 ring-social-border flex-shrink-0">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {user.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-social-foreground font-medium text-sm truncate">{user.full_name}</span>
                  {renderUserBadges(user)}
                </div>
                {user.username && (
                  <span className="text-social-muted-foreground text-xs block">@{user.username}</span>
                )}
                {(user.city || user.country) && (
                  <span className="text-social-muted-foreground/70 text-[11px] flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5" />
                    {[user.city, user.country].filter(Boolean).join(', ')}
                  </span>
                )}
                {renderUserMeta(user)}
                {!user.city && !user.country && (
                  <span className="text-social-muted-foreground/70 text-[11px] block mt-0.5">
                    {renderUserStats(user)}
                  </span>
                )}
              </div>
              {(user.followers_count || 0) > 0 && (
                <div className="text-right flex-shrink-0">
                  <span className="text-social-foreground text-sm font-medium">{formatCount(user.followers_count || 0)}</span>
                  <span className="text-social-muted-foreground text-[10px] block">seguidores</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {!isSearching && content.length > 0 && (
        <div className="p-2 border-b border-social-border">
          <div className="flex items-center gap-2 px-3 py-2">
            <Video className="h-4 w-4 text-pink-500" />
            <span className="text-xs font-medium text-social-muted-foreground uppercase tracking-wide">Videos</span>
          </div>
          {content.map((item) => (
            <button
              key={item.id}
              onClick={() => handleContentClick(item)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-social-muted rounded-sm transition text-left"
            >
              <div className="h-12 w-12 rounded-sm bg-social-muted overflow-hidden flex-shrink-0">
                {item.thumbnail_url ? (
                  <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Video className="h-5 w-5 text-social-muted-foreground/50" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-social-foreground font-medium text-sm truncate block">{item.title}</span>
                {item.creator_name && (
                  <span className="text-social-muted-foreground text-xs">por {item.creator_name}</span>
                )}
                {(item.views_count || item.likes_count) && (
                  <span className="text-social-muted-foreground/70 text-[11px] block">
                    {item.views_count ? `${formatCount(item.views_count)} vistas` : ''}
                    {item.views_count && item.likes_count ? ' · ' : ''}
                    {item.likes_count ? `${formatCount(item.likes_count)} likes` : ''}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Clients/Brands */}
      {!isSearching && clients.length > 0 && (
        <div className="p-2">
          <div className="flex items-center gap-2 px-3 py-2">
            <Building2 className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-medium text-social-muted-foreground uppercase tracking-wide">Marcas</span>
          </div>
          {clients.map((client) => (
            <button
              key={client.id}
              onClick={() => handleClientClick(client)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-social-muted rounded-sm transition text-left"
            >
              <Avatar className="h-10 w-10 ring-2 ring-social-border">
                <AvatarImage src={client.logo_url || undefined} />
                <AvatarFallback className="bg-blue-500/20 text-blue-400">
                  {client.name?.charAt(0) || 'C'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-social-foreground font-medium text-sm truncate">{client.name}</span>
                  {client.is_vip && <Crown className="h-3.5 w-3.5 text-yellow-400" />}
                </div>
                <span className="text-social-muted-foreground text-xs">
                  {client.category || 'Marca'}
                  {(client.followers_count || 0) > 0 && ` · ${formatCount(client.followers_count || 0)} seguidores`}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );

  // Icon variant
  if (variant === 'icon') {
    return (
      <div ref={containerRef} className={cn("relative", className)}>
        {!isExpanded ? (
          <button
            onClick={handleExpand}
            className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-social-muted transition-colors text-social-muted-foreground hover:text-social-foreground"
          >
            <Search className="h-4 w-4" />
          </button>
        ) : (
          <div className="animate-in slide-in-from-right-2 fade-in duration-200">
            <div className="relative flex items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-social-muted-foreground" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Buscar creadores, nichos..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setShowResults(true)}
                  className="w-[220px] sm:w-[280px] pl-10 pr-10 h-9 bg-social-muted border-social-border text-social-foreground text-sm placeholder:text-social-muted-foreground"
                />
                <button
                  onClick={handleClose}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-social-muted-foreground hover:text-social-foreground p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {showDropdown && (
              <div className="absolute top-full right-0 mt-2 w-[320px] sm:w-[380px] bg-social-card border border-social-border rounded-sm shadow-2xl z-50 overflow-hidden max-h-[70vh] overflow-y-auto">
                {renderDropdownContent()}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default & full variants
  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-social-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          className={cn(
            "pl-10 pr-10 bg-social-muted border-social-border text-social-foreground placeholder:text-social-muted-foreground focus:bg-social-input",
            variant === 'full' && "h-12 text-base"
          )}
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-social-muted-foreground hover:text-social-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className={cn(
          "absolute top-full left-0 right-0 mt-2 bg-social-card border border-social-border rounded-sm shadow-2xl z-50 overflow-hidden max-h-[70vh] overflow-y-auto",
          variant === 'full' && "max-h-[80vh]"
        )}>
          {renderDropdownContent()}
        </div>
      )}
    </div>
  );
}
