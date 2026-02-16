import { useCallback } from 'react';
import { useAnalyticsContext } from '../context';
import { PORTFOLIO_EVENTS } from '../constants';
import type {
  StoryProps,
  CardProps,
  PortfolioVisitProps,
  BoardProps,
} from '../types';

export function usePortfolioAnalytics() {
  const { track } = useAnalyticsContext();

  // ===== STORY LIFECYCLE =====

  const trackStoryCreated = useCallback((props: StoryProps) => {
    track({
      event_name: PORTFOLIO_EVENTS.STORY_CREATED,
      event_category: 'portfolio',
      properties: props,
    });
  }, [track]);

  const trackStoryViewed = useCallback((storyId: string, viewSource: string) => {
    track({
      event_name: PORTFOLIO_EVENTS.STORY_VIEWED,
      event_category: 'portfolio',
      properties: { story_id: storyId, view_source: viewSource },
    });
  }, [track]);

  const trackStoryUpdated = useCallback((storyId: string, fieldsUpdated: string[]) => {
    track({
      event_name: PORTFOLIO_EVENTS.STORY_UPDATED,
      event_category: 'portfolio',
      properties: { story_id: storyId, fields_updated: fieldsUpdated },
    });
  }, [track]);

  const trackStoryDeleted = useCallback((storyId: string) => {
    track({
      event_name: PORTFOLIO_EVENTS.STORY_DELETED,
      event_category: 'portfolio',
      properties: { story_id: storyId },
    });
  }, [track]);

  const trackStoryPublished = useCallback((props: StoryProps) => {
    track({
      event_name: PORTFOLIO_EVENTS.STORY_PUBLISHED,
      event_category: 'portfolio',
      properties: { ...props, is_public: true },
    });
  }, [track]);

  const trackStoryUnpublished = useCallback((storyId: string) => {
    track({
      event_name: PORTFOLIO_EVENTS.STORY_UNPUBLISHED,
      event_category: 'portfolio',
      properties: { story_id: storyId },
    });
  }, [track]);

  const trackStoryDuplicated = useCallback((originalId: string, newId: string) => {
    track({
      event_name: PORTFOLIO_EVENTS.STORY_DUPLICATED,
      event_category: 'portfolio',
      properties: { original_story_id: originalId, new_story_id: newId },
    });
  }, [track]);

  // ===== CARDS =====

  const trackCardAdded = useCallback((props: CardProps) => {
    track({
      event_name: PORTFOLIO_EVENTS.CARD_ADDED,
      event_category: 'portfolio',
      properties: props,
    });
  }, [track]);

  const trackCardUpdated = useCallback((props: CardProps) => {
    track({
      event_name: PORTFOLIO_EVENTS.CARD_UPDATED,
      event_category: 'portfolio',
      properties: props,
    });
  }, [track]);

  const trackCardDeleted = useCallback((storyId: string, cardId: string) => {
    track({
      event_name: PORTFOLIO_EVENTS.CARD_DELETED,
      event_category: 'portfolio',
      properties: { story_id: storyId, card_id: cardId },
    });
  }, [track]);

  const trackCardReordered = useCallback((storyId: string, cardId: string, fromPosition: number, toPosition: number) => {
    track({
      event_name: PORTFOLIO_EVENTS.CARD_REORDERED,
      event_category: 'portfolio',
      properties: { story_id: storyId, card_id: cardId, from_position: fromPosition, to_position: toPosition },
    });
  }, [track]);

  const trackCardDuplicated = useCallback((storyId: string, originalCardId: string, newCardId: string) => {
    track({
      event_name: PORTFOLIO_EVENTS.CARD_DUPLICATED,
      event_category: 'portfolio',
      properties: { story_id: storyId, original_card_id: originalCardId, new_card_id: newCardId },
    });
  }, [track]);

  // ===== STORY ENGAGEMENT =====

  const trackStoryShared = useCallback((storyId: string, shareMethod: string) => {
    track({
      event_name: PORTFOLIO_EVENTS.STORY_SHARED,
      event_category: 'portfolio',
      properties: { story_id: storyId, share_method: shareMethod },
    });
  }, [track]);

  const trackStoryLiked = useCallback((storyId: string) => {
    track({
      event_name: PORTFOLIO_EVENTS.STORY_LIKED,
      event_category: 'portfolio',
      properties: { story_id: storyId },
    });
  }, [track]);

  const trackStoryCommented = useCallback((storyId: string) => {
    track({
      event_name: PORTFOLIO_EVENTS.STORY_COMMENTED,
      event_category: 'portfolio',
      properties: { story_id: storyId },
    });
  }, [track]);

  // ===== PORTFOLIO PAGE =====

  const trackPortfolioVisited = useCallback((props: PortfolioVisitProps) => {
    track({
      event_name: PORTFOLIO_EVENTS.PORTFOLIO_VISITED,
      event_category: 'portfolio',
      properties: props,
    });
  }, [track]);

  const trackPortfolioShared = useCallback((portfolioOwnerId: string, shareMethod: string) => {
    track({
      event_name: PORTFOLIO_EVENTS.PORTFOLIO_SHARED,
      event_category: 'portfolio',
      properties: { portfolio_owner_id: portfolioOwnerId, share_method: shareMethod },
    });
  }, [track]);

  const trackPortfolioContactClicked = useCallback((portfolioOwnerId: string) => {
    track({
      event_name: PORTFOLIO_EVENTS.PORTFOLIO_CONTACT_CLICKED,
      event_category: 'portfolio',
      properties: { portfolio_owner_id: portfolioOwnerId },
    });
  }, [track]);

  const trackPortfolioCTAClicked = useCallback((portfolioOwnerId: string, ctaType: string) => {
    track({
      event_name: PORTFOLIO_EVENTS.PORTFOLIO_CTA_CLICKED,
      event_category: 'portfolio',
      properties: { portfolio_owner_id: portfolioOwnerId, cta_type: ctaType },
    });
  }, [track]);

  // ===== BOARD (KANBAN) =====

  const trackBoardViewed = useCallback((props: BoardProps) => {
    track({
      event_name: PORTFOLIO_EVENTS.BOARD_VIEWED,
      event_category: 'portfolio',
      properties: props,
    });
  }, [track]);

  const trackBoardCardMoved = useCallback((
    boardId: string,
    cardId: string,
    fromColumn: string,
    toColumn: string
  ) => {
    track({
      event_name: PORTFOLIO_EVENTS.BOARD_CARD_MOVED,
      event_category: 'portfolio',
      properties: { board_id: boardId, card_id: cardId, from_column: fromColumn, to_column: toColumn },
    });
  }, [track]);

  const trackBoardColumnCreated = useCallback((boardId: string, columnName: string) => {
    track({
      event_name: PORTFOLIO_EVENTS.BOARD_COLUMN_CREATED,
      event_category: 'portfolio',
      properties: { board_id: boardId, column_name: columnName },
    });
  }, [track]);

  const trackBoardFiltered = useCallback((boardId: string, filterType: string) => {
    track({
      event_name: PORTFOLIO_EVENTS.BOARD_FILTERED,
      event_category: 'portfolio',
      properties: { board_id: boardId, filter_type: filterType },
    });
  }, [track]);

  return {
    // Story lifecycle
    trackStoryCreated,
    trackStoryViewed,
    trackStoryUpdated,
    trackStoryDeleted,
    trackStoryPublished,
    trackStoryUnpublished,
    trackStoryDuplicated,

    // Cards
    trackCardAdded,
    trackCardUpdated,
    trackCardDeleted,
    trackCardReordered,
    trackCardDuplicated,

    // Engagement
    trackStoryShared,
    trackStoryLiked,
    trackStoryCommented,

    // Portfolio page
    trackPortfolioVisited,
    trackPortfolioShared,
    trackPortfolioContactClicked,
    trackPortfolioCTAClicked,

    // Board
    trackBoardViewed,
    trackBoardCardMoved,
    trackBoardColumnCreated,
    trackBoardFiltered,
  };
}
