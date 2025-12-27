import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type SavedItemType = 'work_video' | 'post' | 'profile' | 'company';

export interface SavedItem {
  id: string;
  user_id: string;
  item_type: SavedItemType;
  item_id: string;
  collection_id: string | null;
  created_at: string;
}

export interface SavedCollection {
  id: string;
  user_id: string;
  name: string;
  cover_url: string | null;
  is_private: boolean;
  created_at: string;
  items_count?: number;
}

export interface UseSavedItemsHook {
  items: SavedItem[];
  collections: SavedCollection[];
  loading: boolean;
  saving: boolean;
  isSaved: (itemType: SavedItemType, itemId: string) => boolean;
  saveItem: (itemType: SavedItemType, itemId: string, collectionId?: string) => Promise<boolean>;
  unsaveItem: (itemType: SavedItemType, itemId: string) => Promise<boolean>;
  toggleSave: (itemType: SavedItemType, itemId: string) => Promise<boolean>;
  createCollection: (name: string) => Promise<string | null>;
  deleteCollection: (collectionId: string) => Promise<boolean>;
  moveToCollection: (itemId: string, collectionId: string | null) => Promise<boolean>;
  getItemsByCollection: (collectionId: string | null) => SavedItem[];
  refetch: () => Promise<void>;
}

export function useSavedItems(): UseSavedItemsHook {
  const { user } = useAuth();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setCollections([]);
      setLoading(false);
      return;
    }

    try {
      const [{ data: itemsData }, { data: collectionsData }] = await Promise.all([
        supabase
          .from('saved_items')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('saved_collections')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      setItems((itemsData || []) as SavedItem[]);
      
      // Add items count to collections
      const collectionsWithCount = (collectionsData || []).map(col => ({
        ...col,
        items_count: (itemsData || []).filter(i => i.collection_id === col.id).length,
      })) as SavedCollection[];
      setCollections(collectionsWithCount);
    } catch (error) {
      console.error('[useSavedItems] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isSaved = useCallback((itemType: SavedItemType, itemId: string): boolean => {
    return items.some(i => i.item_type === itemType && i.item_id === itemId);
  }, [items]);

  const saveItem = useCallback(async (
    itemType: SavedItemType, 
    itemId: string, 
    collectionId?: string
  ): Promise<boolean> => {
    if (!user?.id) return false;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('saved_items')
        .insert({
          user_id: user.id,
          item_type: itemType,
          item_id: itemId,
          collection_id: collectionId || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') return true; // Already saved
        throw error;
      }

      setItems(prev => [data as SavedItem, ...prev]);
      return true;
    } catch (error) {
      console.error('[useSavedItems] Save error:', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [user?.id]);

  const unsaveItem = useCallback(async (itemType: SavedItemType, itemId: string): Promise<boolean> => {
    if (!user?.id) return false;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('saved_items')
        .delete()
        .eq('user_id', user.id)
        .eq('item_type', itemType)
        .eq('item_id', itemId);

      if (error) throw error;

      setItems(prev => prev.filter(i => !(i.item_type === itemType && i.item_id === itemId)));
      return true;
    } catch (error) {
      console.error('[useSavedItems] Unsave error:', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [user?.id]);

  const toggleSave = useCallback(async (itemType: SavedItemType, itemId: string): Promise<boolean> => {
    if (isSaved(itemType, itemId)) {
      return unsaveItem(itemType, itemId);
    }
    return saveItem(itemType, itemId);
  }, [isSaved, saveItem, unsaveItem]);

  const createCollection = useCallback(async (name: string): Promise<string | null> => {
    if (!user?.id) return null;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('saved_collections')
        .insert({
          user_id: user.id,
          name,
        })
        .select()
        .single();

      if (error) throw error;

      setCollections(prev => [{ ...data, items_count: 0 } as SavedCollection, ...prev]);
      return data.id;
    } catch (error) {
      console.error('[useSavedItems] Create collection error:', error);
      return null;
    } finally {
      setSaving(false);
    }
  }, [user?.id]);

  const deleteCollection = useCallback(async (collectionId: string): Promise<boolean> => {
    if (!user?.id) return false;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('saved_collections')
        .delete()
        .eq('id', collectionId)
        .eq('user_id', user.id);

      if (error) throw error;

      setCollections(prev => prev.filter(c => c.id !== collectionId));
      // Items are set to null collection_id by DB cascade
      setItems(prev => prev.map(i => 
        i.collection_id === collectionId ? { ...i, collection_id: null } : i
      ));
      return true;
    } catch (error) {
      console.error('[useSavedItems] Delete collection error:', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [user?.id]);

  const moveToCollection = useCallback(async (
    itemId: string, 
    collectionId: string | null
  ): Promise<boolean> => {
    if (!user?.id) return false;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('saved_items')
        .update({ collection_id: collectionId })
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (error) throw error;

      setItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, collection_id: collectionId } : i
      ));
      return true;
    } catch (error) {
      console.error('[useSavedItems] Move error:', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [user?.id]);

  const getItemsByCollection = useCallback((collectionId: string | null): SavedItem[] => {
    return items.filter(i => i.collection_id === collectionId);
  }, [items]);

  return {
    items,
    collections,
    loading,
    saving,
    isSaved,
    saveItem,
    unsaveItem,
    toggleSave,
    createCollection,
    deleteCollection,
    moveToCollection,
    getItemsByCollection,
    refetch: fetchData,
  };
}
