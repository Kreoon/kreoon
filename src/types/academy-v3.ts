// ============================================================
// KREOON Academia v3 — Community Global + Lesson Comments + Calendar
// ============================================================

// ── COMMUNITY ──
export interface AcademyMemberPresence {
  id: string;
  space_id: string;
  user_id: string;
  last_seen_at: string;
  current_page: string | null;
  user?: { full_name: string | null; avatar_url?: string | null };
}

export interface AcademySpaceProfile {
  id: string;
  space_id: string;
  user_id: string;
  bio: string | null;
  title: string | null;
  website_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  linkedin_url: string | null;
  intro_post_id: string | null;
  intro_completed: boolean;
  joined_at: string;
  user?: { full_name: string | null; avatar_url?: string | null; email?: string | null };
  followers_count?: number;
  posts_count?: number;
  points?: number;
  level?: number;
}

export type AcademyNotificationType =
  | 'comment_reply'
  | 'post_reaction'
  | 'comment_on_my_post'
  | 'lesson_comment_reply'
  | 'lesson_comment_featured'
  | 'new_lesson'
  | 'event_reminder_24h'
  | 'event_reminder_1h'
  | 'event_cancelled'
  | 'new_member_joined'
  | 'mention'
  | 'auto_dm'
  | 'certificate_earned';

export interface AcademyNotification {
  id: string;
  space_id: string;
  recipient_id: string;
  sender_id: string | null;
  type: AcademyNotificationType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
  sender?: { full_name: string | null; avatar_url?: string | null };
}

// ── LESSON COMMENTS ──
export interface AcademyLessonComment {
  id: string;
  lesson_id: string;
  course_id: string;
  space_id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  body_html: string | null;
  video_timestamp_seconds: number | null;
  video_timestamp_label: string | null;
  is_deleted: boolean;
  is_featured: boolean;
  is_pinned: boolean;
  like_count: number;
  is_reported?: boolean;
  report_reason?: string | null;
  created_at: string;
  updated_at: string;
  author?: { full_name: string | null; avatar_url?: string | null };
  is_instructor?: boolean;
  is_liked_by_me?: boolean;
  replies?: AcademyLessonComment[];
}

// ── CALENDAR ──
export type EventType = 'live_call' | 'workshop' | 'webinar' | 'challenge' | 'other';
export type EventInvitationStatus = 'invited' | 'accepted' | 'declined' | 'tentative' | 'no_response';

export interface AcademySpaceEventFull {
  id: string;
  space_id: string;
  organizer_id: string;
  title: string;
  description: string | null;
  type: EventType;
  starts_at: string;
  ends_at: string;
  timezone: string;
  meeting_url: string | null;
  google_event_id: string | null;
  google_calendar_id: string | null;
  google_meet_link: string | null;
  auto_invite_all_members: boolean;
  cover_image_url: string | null;
  rsvp_count: number;
  max_attendees: number | null;
  is_published: boolean;
  is_recurring?: boolean;
  recurrence_rule: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  recording_url: string | null;
  reminder_sent_24h: boolean;
  reminder_sent_1h: boolean;
  tags?: string[];
  created_at?: string;
  organizer?: { full_name: string | null; avatar_url?: string | null };
  my_invitation?: AcademyEventInvitation | AcademyEventInvitation[] | null;
}

export interface AcademyEventInvitation {
  id: string;
  event_id: string;
  space_id: string;
  user_id: string;
  email: string;
  status: EventInvitationStatus;
  google_calendar_added: boolean;
  invite_sent_at: string;
  responded_at: string | null;
}

export interface GoogleCalendarConnection {
  space_id: string;
  owner_id: string;
  calendar_id: string;
  calendar_name: string;
  is_active: boolean;
  connected_at: string;
  last_synced_at: string | null;
}
