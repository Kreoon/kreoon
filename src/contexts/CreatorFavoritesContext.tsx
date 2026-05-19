import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface CreatorFavoritesContextValue {
  favoritedIds: Set<string>;
  toggleFavorite: (creatorId: string) => Promise<void>;
  isLoaded: boolean;
}

const CreatorFavoritesContext = createContext<CreatorFavoritesContextValue>({
  favoritedIds: new Set(),
  toggleFavorite: async () => {},
  isLoaded: false,
});

export function CreatorFavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setFavoritedIds(new Set());
      setIsLoaded(true);
      return;
    }

    supabase
      .from('saved_items')
      .select('item_id')
      .eq('user_id', user.id)
      .eq('item_type', 'profile')
      .then(({ data }) => {
        setFavoritedIds(new Set((data || []).map(r => r.item_id)));
        setIsLoaded(true);
      });
  }, [user?.id]);

  const toggleFavorite = useCallback(async (creatorId: string) => {
    if (!user?.id) return;

    const isFav = favoritedIds.has(creatorId);

    setFavoritedIds(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(creatorId);
      else next.add(creatorId);
      return next;
    });

    if (isFav) {
      await supabase
        .from('saved_items')
        .delete()
        .eq('user_id', user.id)
        .eq('item_type', 'profile')
        .eq('item_id', creatorId);
    } else {
      await supabase
        .from('saved_items')
        .insert({ user_id: user.id, item_type: 'profile', item_id: creatorId })
        .select()
        .single();
    }
  }, [user?.id, favoritedIds]);

  return (
    <CreatorFavoritesContext.Provider value={{ favoritedIds, toggleFavorite, isLoaded }}>
      {children}
    </CreatorFavoritesContext.Provider>
  );
}

export function useCreatorFavorites() {
  return useContext(CreatorFavoritesContext);
}
