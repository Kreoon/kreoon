import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, User, Video, Building2, Hash, X, Loader2, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserResult {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  is_ambassador?: boolean;
}

interface ContentResult {
  id: string;
  title: string;
  thumbnail_url: string | null;
  creator_name?: string;
}

interface ClientResult {
  id: string;
  name: string;
  logo_url: string | null;
}

interface SmartSearchProps {
  className?: string;
  placeholder?: string;
  onSelectContent?: (contentId: string) => void;
  variant?: 'default' | 'icon'; // 'icon' shows just the search icon that expands
}

export function SmartSearch({ 
  className, 
  placeholder = "Buscar...", 
  onSelectContent,
  variant = 'default'
}: SmartSearchProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isExpanded, setIsExpanded] = useState(variant === 'default');
  const [users, setUsers] = useState<UserResult[]>([]);
  const [content, setContent] = useState<ContentResult[]>([]);
  const [clients, setClients] = useState<ClientResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('portfolio_recent_searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {}
    }
  }, []);

  // Click outside to collapse
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

  // Save search to recent
  const saveRecentSearch = (searchTerm: string) => {
    const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('portfolio_recent_searches', JSON.stringify(updated));
  };

  // Smart search across multiple tables including username
  useEffect(() => {
    const performSearch = async () => {
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        setUsers([]);
        setContent([]);
        setClients([]);
        return;
      }

      setIsSearching(true);

      try {
        // Check if searching by username (starts with @)
        const isUsernameSearch = trimmed.startsWith('@');
        const searchTerm = isUsernameSearch ? trimmed.slice(1) : trimmed;
        
        // Parallel search across all entities
        const [usersResult, contentResult, clientsResult] = await Promise.all([
          // Search users by name, bio, or username
          supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url, is_ambassador')
            .or(
              isUsernameSearch 
                ? `username.ilike.%${searchTerm}%` 
                : `full_name.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`
            )
            .eq('is_public', true)
            .limit(8),
          
          // Search content by title, caption, description
          isUsernameSearch ? { data: [] } : supabase
            .from('content')
            .select(`
              id, 
              title, 
              thumbnail_url,
              caption,
              creator_id
            `)
            .eq('is_published', true)
            .or(`title.ilike.%${searchTerm}%,caption.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
            .limit(5),
          
          // Search clients by name
          isUsernameSearch ? { data: [] } : supabase
            .from('clients')
            .select('id, name, logo_url')
            .ilike('name', `%${searchTerm}%`)
            .limit(3)
        ]);

        setUsers(usersResult.data || []);
        
        // Enrich content with creator names
        if (contentResult.data && contentResult.data.length > 0) {
          const creatorIds = [...new Set(contentResult.data.filter(c => c.creator_id).map(c => c.creator_id))];
          if (creatorIds.length > 0) {
            const { data: creators } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', creatorIds);
            
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

        setClients(clientsResult.data || []);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(performSearch, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleUserClick = (userId: string, name: string) => {
    saveRecentSearch(name);
    setQuery('');
    setShowResults(false);
    if (variant === 'icon') setIsExpanded(false);
    navigate(`/profile/${userId}`);
  };

  const handleContentClick = (contentId: string, title: string) => {
    saveRecentSearch(title);
    setQuery('');
    setShowResults(false);
    if (variant === 'icon') setIsExpanded(false);
    if (onSelectContent) {
      onSelectContent(contentId);
    } else {
      navigate(`/marketplace?v=${contentId}`);
    }
  };

  const handleClientClick = (clientId: string, name: string) => {
    saveRecentSearch(name);
    setQuery('');
    setShowResults(false);
    if (variant === 'icon') setIsExpanded(false);
    navigate(`/company/${clientId}`);
  };

  const handleRecentClick = (term: string) => {
    setQuery(term);
  };

  const clearSearch = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleClose = () => {
    setQuery('');
    setShowResults(false);
    setIsExpanded(false);
  };

  const hasResults = users.length > 0 || content.length > 0 || clients.length > 0;
  const showDropdown = showResults && (query.length >= 2 || (query.length === 0 && recentSearches.length > 0));

  // Icon variant - expandable search
  if (variant === 'icon') {
    return (
      <div ref={containerRef} className={cn("relative", className)}>
        {!isExpanded ? (
          <button
            onClick={handleExpand}
            className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-white/20 transition-colors text-white/70 hover:text-white"
          >
            <Search className="h-4 w-4" />
          </button>
        ) : (
          <div className="animate-in slide-in-from-right-2 fade-in duration-200">
            <div className="relative flex items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Buscar @usuario, nombre..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setShowResults(true)}
                  className="w-[200px] sm:w-[250px] pl-10 pr-10 h-8 bg-white/10 border-white/20 text-white text-sm placeholder:text-white/50 focus:bg-white/15"
                />
                <button
                  onClick={handleClose}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Results Dropdown */}
            {showDropdown && (
              <div className="absolute top-full right-0 mt-2 w-[280px] sm:w-[320px] bg-zinc-900 border border-white/10 rounded-sm shadow-2xl z-50 overflow-hidden max-h-[60vh] overflow-y-auto">
                {renderDropdownContent()}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default variant - always visible input
  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-sm shadow-2xl z-50 overflow-hidden max-h-[70vh] overflow-y-auto">
          {renderDropdownContent()}
        </div>
      )}
    </div>
  );

  function renderDropdownContent() {
    return (
      <>
        {/* Loading State */}
        {isSearching && (
          <div className="flex items-center justify-center gap-2 p-4 text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Buscando...</span>
          </div>
        )}

        {/* Recent Searches */}
        {!isSearching && query.length === 0 && recentSearches.length > 0 && (
          <div className="p-2">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-medium text-white/40 uppercase tracking-wide">Búsquedas recientes</span>
              <button
                onClick={() => {
                  setRecentSearches([]);
                  localStorage.removeItem('portfolio_recent_searches');
                }}
                className="text-xs text-white/40 hover:text-white"
              >
                Borrar
              </button>
            </div>
            {recentSearches.map((term, i) => (
              <button
                key={i}
                onClick={() => handleRecentClick(term)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-sm transition text-left"
              >
                <Hash className="h-4 w-4 text-white/40" />
                <span className="text-white/70 text-sm">{term}</span>
              </button>
            ))}
          </div>
        )}

        {/* Search tip */}
        {!isSearching && query.length === 0 && recentSearches.length === 0 && (
          <div className="p-4 text-center">
            <AtSign className="h-6 w-6 mx-auto mb-2 text-primary/50" />
            <p className="text-white/50 text-xs">Escribe @usuario para buscar por username</p>
          </div>
        )}

        {/* No Results */}
        {!isSearching && query.length >= 2 && !hasResults && (
          <div className="p-6 text-center">
            <Search className="h-8 w-8 mx-auto mb-2 text-white/20" />
            <p className="text-white/50 text-sm">No se encontraron resultados para "{query}"</p>
            <p className="text-white/30 text-xs mt-1">Intenta con otros términos</p>
          </div>
        )}

        {/* Users Section */}
        {!isSearching && users.length > 0 && (
          <div className="p-2 border-b border-white/10">
            <div className="flex items-center gap-2 px-3 py-2">
              <User className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-white/40 uppercase tracking-wide">Cuentas</span>
            </div>
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleUserClick(user.id, user.full_name)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 rounded-sm transition text-left"
              >
                <Avatar className="h-10 w-10 ring-2 ring-white/10">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {user.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm truncate">{user.full_name}</span>
                    {user.is_ambassador && (
                      <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] rounded-full font-medium">
                        Embajador
                      </span>
                    )}
                  </div>
                  {user.username ? (
                    <span className="text-white/40 text-xs">@{user.username}</span>
                  ) : (
                    <span className="text-white/40 text-xs">Perfil</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Content Section */}
        {!isSearching && content.length > 0 && (
          <div className="p-2 border-b border-white/10">
            <div className="flex items-center gap-2 px-3 py-2">
              <Video className="h-4 w-4 text-pink-500" />
              <span className="text-xs font-medium text-white/40 uppercase tracking-wide">Videos</span>
            </div>
            {content.map((item) => (
              <button
                key={item.id}
                onClick={() => handleContentClick(item.id, item.title)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 rounded-sm transition text-left"
              >
                <div className="h-10 w-10 rounded-sm bg-white/10 overflow-hidden flex-shrink-0">
                  {item.thumbnail_url ? (
                    <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Video className="h-4 w-4 text-white/30" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-white font-medium text-sm truncate block">{item.title}</span>
                  {item.creator_name && (
                    <span className="text-white/40 text-xs">por {item.creator_name}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Clients Section */}
        {!isSearching && clients.length > 0 && (
          <div className="p-2">
            <div className="flex items-center gap-2 px-3 py-2">
              <Building2 className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-medium text-white/40 uppercase tracking-wide">Marcas</span>
            </div>
            {clients.map((client) => (
              <button
                key={client.id}
                onClick={() => handleClientClick(client.id, client.name)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 rounded-sm transition text-left"
              >
                <Avatar className="h-10 w-10 ring-2 ring-white/10">
                  <AvatarImage src={client.logo_url || undefined} />
                  <AvatarFallback className="bg-blue-500/20 text-blue-400">
                    {client.name?.charAt(0) || 'C'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className="text-white font-medium text-sm truncate block">{client.name}</span>
                  <span className="text-white/40 text-xs">Marca</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </>
    );
  }
}
