import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'seen_stories';
const EXPIRY_HOURS = 24; // Stories expire after 24 hours, so we clean up old entries

interface SeenStoriesData {
  [storyId: string]: number; // timestamp when viewed
}

export function useSeenStories() {
  const [seenStories, setSeenStories] = useState<SeenStoriesData>({});

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as SeenStoriesData;
        // Clean up old entries (older than 24 hours)
        const now = Date.now();
        const cleaned: SeenStoriesData = {};
        Object.entries(data).forEach(([id, timestamp]) => {
          if (now - timestamp < EXPIRY_HOURS * 60 * 60 * 1000) {
            cleaned[id] = timestamp;
          }
        });
        setSeenStories(cleaned);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      }
    } catch (error) {
      console.error('Error loading seen stories:', error);
    }
  }, []);

  // Mark a story as seen
  const markAsSeen = useCallback((storyId: string) => {
    setSeenStories(prev => {
      const updated = { ...prev, [storyId]: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Mark multiple stories as seen
  const markMultipleAsSeen = useCallback((storyIds: string[]) => {
    setSeenStories(prev => {
      const now = Date.now();
      const updated = { ...prev };
      storyIds.forEach(id => {
        updated[id] = now;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Check if a story has been seen
  const isSeen = useCallback((storyId: string): boolean => {
    return storyId in seenStories;
  }, [seenStories]);

  // Check if a user has unseen stories (given their story IDs)
  const hasUnseenStories = useCallback((storyIds: string[]): boolean => {
    return storyIds.some(id => !seenStories[id]);
  }, [seenStories]);

  // Get count of unseen stories for a user
  const getUnseenCount = useCallback((storyIds: string[]): number => {
    return storyIds.filter(id => !seenStories[id]).length;
  }, [seenStories]);

  return {
    seenStories,
    markAsSeen,
    markMultipleAsSeen,
    isSeen,
    hasUnseenStories,
    getUnseenCount,
  };
}
