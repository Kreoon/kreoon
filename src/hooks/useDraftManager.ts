import { useState, useEffect, useCallback } from 'react';

interface Draft<T> {
  id: string;
  data: T;
  timestamp: number;
  version: number;
}

interface DraftManagerOptions<T> {
  entityType: string;
  entityId: string;
  maxDrafts?: number;
  expiryMs?: number;
}

const DRAFT_VERSION = 1;

function getDraftKey(entityType: string, entityId: string): string {
  return `draft_${entityType}_${entityId}`;
}

function getAllDraftsKey(entityType: string): string {
  return `drafts_index_${entityType}`;
}

export function useDraftManager<T>({
  entityType,
  entityId,
  maxDrafts = 10,
  expiryMs = 7 * 24 * 60 * 60 * 1000, // 7 days default
}: DraftManagerOptions<T>) {
  const [drafts, setDrafts] = useState<Draft<T>[]>([]);
  const [currentDraft, setCurrentDraft] = useState<Draft<T> | null>(null);

  // Load drafts on mount
  useEffect(() => {
    loadDrafts();
  }, [entityType, entityId]);

  const loadDrafts = useCallback(() => {
    try {
      const key = getDraftKey(entityType, entityId);
      const stored = localStorage.getItem(key);
      
      if (stored) {
        const allDrafts: Draft<T>[] = JSON.parse(stored);
        const now = Date.now();
        
        // Filter out expired drafts
        const validDrafts = allDrafts.filter(
          d => d.version === DRAFT_VERSION && now - d.timestamp < expiryMs
        );
        
        // Sort by timestamp descending
        validDrafts.sort((a, b) => b.timestamp - a.timestamp);
        
        setDrafts(validDrafts);
        setCurrentDraft(validDrafts[0] || null);
        
        // Update storage if we filtered anything
        if (validDrafts.length !== allDrafts.length) {
          localStorage.setItem(key, JSON.stringify(validDrafts));
        }
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
    }
  }, [entityType, entityId, expiryMs]);

  // Save a new draft
  const saveDraft = useCallback((data: T): Draft<T> => {
    const newDraft: Draft<T> = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data,
      timestamp: Date.now(),
      version: DRAFT_VERSION,
    };

    setDrafts(prev => {
      const updated = [newDraft, ...prev].slice(0, maxDrafts);
      
      try {
        const key = getDraftKey(entityType, entityId);
        localStorage.setItem(key, JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving draft:', error);
      }
      
      return updated;
    });

    setCurrentDraft(newDraft);
    return newDraft;
  }, [entityType, entityId, maxDrafts]);

  // Restore a specific draft
  const restoreDraft = useCallback((draftId: string): T | null => {
    const draft = drafts.find(d => d.id === draftId);
    if (draft) {
      setCurrentDraft(draft);
      return draft.data;
    }
    return null;
  }, [drafts]);

  // Delete a draft
  const deleteDraft = useCallback((draftId: string) => {
    setDrafts(prev => {
      const updated = prev.filter(d => d.id !== draftId);
      
      try {
        const key = getDraftKey(entityType, entityId);
        localStorage.setItem(key, JSON.stringify(updated));
      } catch (error) {
        console.error('Error deleting draft:', error);
      }
      
      return updated;
    });

    if (currentDraft?.id === draftId) {
      setCurrentDraft(null);
    }
  }, [entityType, entityId, currentDraft]);

  // Clear all drafts for this entity
  const clearDrafts = useCallback(() => {
    try {
      const key = getDraftKey(entityType, entityId);
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing drafts:', error);
    }
    
    setDrafts([]);
    setCurrentDraft(null);
  }, [entityType, entityId]);

  // Check if there's a more recent draft than the provided timestamp
  const hasNewerDraft = useCallback((timestamp: number): boolean => {
    return drafts.some(d => d.timestamp > timestamp);
  }, [drafts]);

  // Get the latest draft data
  const getLatestDraft = useCallback((): T | null => {
    return drafts[0]?.data || null;
  }, [drafts]);

  return {
    drafts,
    currentDraft,
    saveDraft,
    restoreDraft,
    deleteDraft,
    clearDrafts,
    hasNewerDraft,
    getLatestDraft,
    hasDrafts: drafts.length > 0,
  };
}
