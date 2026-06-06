// ============================================================
// KREOON ACADEMIA - TypeScript types
// ============================================================

// ── PLANES ──
export type AcademyPlanSlug = 'hobby' | 'pro';

export interface AcademyPlan {
  id: string;
  slug: AcademyPlanSlug;
  name: string;
  price_usd: number;
  transaction_fee_pct: number;
  features: {
    max_spaces: number;
    live_calls: boolean;
    affiliates: boolean;
    custom_url: boolean;
  };
  is_active?: boolean;
}

// ── SPACES ──
export type AcademySpaceStatus = 'active' | 'paused' | 'deleted';

export interface AcademySpace {
  id: string;
  owner_id: string;
  plan_slug: AcademyPlanSlug;
  name: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  logo_url: string | null;
  accent_color: string;
  is_public: boolean;
  membership_price_usd: number | null;
  member_count: number;
  status: AcademySpaceStatus;
  custom_domain: string | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── MEMBERSHIPS ──
export type AcademyMembershipRole = 'owner' | 'instructor' | 'moderator' | 'student';

export interface AcademyMembership {
  id: string;
  space_id: string;
  user_id: string;
  role: AcademyMembershipRole;
  joined_at: string;
  expires_at: string | null;
  is_active: boolean;
  stripe_subscription_id: string | null;
}

// ── COURSES ──
export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type CourseStatus = 'draft' | 'published' | 'archived';

export interface AcademyCourse {
  id: string;
  space_id: string;
  instructor_id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  trailer_url: string | null;
  price_usd: number;
  is_free: boolean;
  difficulty: CourseDifficulty;
  language: string;
  tags: string[];
  status: CourseStatus;
  enrolled_count: number;
  completion_rate: number;
  avg_rating: number;
  review_count: number;
  total_duration_minutes: number;
  certificate_enabled: boolean;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // joins
  space?: Partial<AcademySpace>;
  instructor?: { full_name: string | null; avatar_url?: string | null };
  modules?: AcademyModule[];
  enrollment?: AcademyEnrollment;
  cert_requirements?: CertificateRequirements;
  quizzes?: AcademyQuiz[];
}

// ── MODULES ──
export interface AcademyModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_free_preview: boolean;
  created_at?: string;
  lessons?: AcademyLesson[];
}

// ── LESSONS ──
export type LessonType = 'video' | 'text' | 'quiz' | 'live' | 'file';
export type VideoSource = 'bunny' | 'youtube' | 'vimeo' | 'drive' | 'url';

export interface AcademyLesson {
  id: string;
  module_id: string;
  course_id: string;
  title: string;
  type: LessonType;
  content: string | null;
  video_source: VideoSource | null;
  video_url: string | null;
  video_bunny_id: string | null;
  video_duration_seconds: number | null;
  video_thumbnail_url: string | null;
  is_free_preview: boolean;
  is_required: boolean;
  sort_order: number;
  has_midlesson_quiz: boolean;
  midlesson_quiz_timestamp_seconds: number | null;
  end_lesson_quiz_id: string | null;
  drip_days_after_enroll: number;
  created_at?: string;
  updated_at?: string;
  // joins
  progress?: LessonProgress | LessonProgress[];
  midlesson_quiz?: AcademyQuiz;
  end_lesson_quiz?: AcademyQuiz;
}

// ── PROGRESS ──
export type LessonStatus = 'not_started' | 'in_progress' | 'completed';

export interface LessonProgress {
  id: string;
  lesson_id: string;
  user_id: string;
  enrollment_id: string;
  status: LessonStatus;
  video_watch_pct: number;
  last_position_seconds: number;
  completed_at: string | null;
  time_spent_seconds: number;
  created_at?: string;
  updated_at?: string;
}

// ── QUIZZES ──
export type QuizScope = 'midlesson' | 'end_lesson' | 'end_module' | 'final';
export type ShowCorrectAnswers = 'always' | 'after_passing' | 'never';

export interface AcademyQuiz {
  id: string;
  course_id: string;
  scope: QuizScope;
  lesson_id: string | null;
  module_id: string | null;
  title: string;
  description: string | null;
  passing_score_pct: number;
  max_attempts: number | null;
  cooldown_minutes: number;
  randomize_questions: boolean;
  randomize_options: boolean;
  show_correct_answers: ShowCorrectAnswers;
  time_limit_minutes: number | null;
  blocks_next_lesson: boolean;
  is_required_for_cert: boolean;
  created_at?: string;
  updated_at?: string;
  questions?: AcademyQuestion[];
}

// ── QUESTIONS ──
export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'ordering'
  | 'matching'
  | 'open_text'
  | 'file_upload'
  | 'self_evaluation';

export interface AcademyQuestion {
  id: string;
  quiz_id: string;
  type: QuestionType;
  question_text: string;
  explanation: string | null;
  points: number;
  sort_order: number;
  is_required: boolean;
  media_url: string | null;
  options?: AcademyQuestionOption[];
}

export interface AcademyQuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct?: boolean;
  sort_order: number;
  media_url: string | null;
  explanation: string | null;
}

// ── ATTEMPTS ──
export type AttemptStatus =
  | 'in_progress'
  | 'completed'
  | 'passed'
  | 'failed'
  | 'pending_review';

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  enrollment_id: string;
  attempt_number: number;
  status: AttemptStatus;
  score_pct: number | null;
  total_points_possible: number;
  points_earned: number;
  started_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewer_feedback: string | null;
  time_spent_seconds: number;
  answers?: AttemptAnswer[];
}

export interface MatchingPair {
  left_id: string;
  right_id: string;
}

export interface AttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_ids: string[];
  ordering_sequence: string[];
  matching_pairs: MatchingPair[];
  text_answer: string | null;
  file_url: string | null;
  file_name: string | null;
  self_eval_checked: string[];
  is_correct: boolean | null;
  points_awarded: number;
  instructor_feedback: string | null;
  graded_at: string | null;
  created_at?: string;
}

export type NewAttemptAnswer = Omit<
  AttemptAnswer,
  'id' | 'attempt_id' | 'is_correct' | 'points_awarded' | 'instructor_feedback' | 'graded_at' | 'created_at'
>;

// ── CERTIFICATES ──
export interface AcademyCertificate {
  id: string;
  course_id: string;
  user_id: string;
  enrollment_id: string;
  cert_code: string;
  verification_url: string;
  verification_hash: string | null;
  student_name: string;
  course_title: string;
  instructor_name: string;
  space_name: string;
  final_score_pct: number | null;
  issued_at: string;
  expires_at: string | null;
  is_valid: boolean;
  revoked_at: string | null;
  revoke_reason: string | null;
  // joins opcionales
  course?: Partial<AcademyCourse> & { space?: Partial<AcademySpace> };
}

// ── CERTIFICATE REQUIREMENTS ──
export interface CertificateRequirements {
  id: string;
  course_id: string;
  min_lessons_completed_pct: number;
  require_all_module_exams: boolean;
  require_final_exam: boolean;
  min_final_exam_score: number;
  require_all_manual_reviews: boolean;
  require_self_evaluations: boolean;
  min_avg_score: number;
  min_time_spent_minutes: number;
  require_live_attendance: boolean;
  cert_title: string;
  cert_subtitle: string | null;
  cert_signature_name: string | null;
  cert_signature_title: string | null;
  cert_logo_url: string | null;
  cert_background_color: string;
  cert_accent_color: string;
  created_at?: string;
  updated_at?: string;
}

// ── ELIGIBILITY CHECK ──
export interface CertEligibilityResult {
  eligible: boolean;
  missing?: Array<string | { type: string; required: number; current: number }>;
  completion_pct?: number;
  already_issued?: boolean;
  cert_code?: string;
  verification_url?: string;
  issued?: boolean;
  reason?: 'no_requirements_configured' | 'not_enrolled' | string;
}

// ── ENROLLMENT ──
export interface AcademyEnrollment {
  id: string;
  course_id: string;
  user_id: string;
  enrolled_at: string;
  completed_at: string | null;
  completion_pct: number;
  last_accessed_at: string | null;
  certificate_issued_at: string | null;
  amount_paid_usd: number;
  stripe_payment_intent_id: string | null;
}

// ── MANUAL REVIEW ──
export type ManualReviewStatus =
  | 'pending'
  | 'reviewing'
  | 'approved'
  | 'rejected'
  | 'revision_requested';

export interface ManualReview {
  id: string;
  attempt_id: string;
  answer_id: string;
  question_id: string;
  course_id: string;
  student_id: string;
  instructor_id: string | null;
  status: ManualReviewStatus;
  score_awarded: number | null;
  max_score: number | null;
  feedback: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// ── COURSE REVIEW ──
export interface AcademyCourseReview {
  id: string;
  course_id: string;
  user_id: string;
  enrollment_id: string;
  rating: number;
  review_text: string | null;
  is_public: boolean;
  created_at: string;
}

// ── INSTRUCTOR PLAN ──
export interface AcademyInstructorPlan {
  id: string;
  user_id: string;
  plan_slug: AcademyPlanSlug;
  status: 'active' | 'paused' | 'cancelled' | 'trialing';
  stripe_subscription_id: string | null;
  trial_ends_at: string;
  current_period_start: string;
  current_period_end: string;
  created_at?: string;
  updated_at?: string;
}

// ── GRADING EDGE FUNCTION RESPONSE ──
export interface GradingResult {
  success: boolean;
  status: AttemptStatus;
  score_pct: number;
  passed: boolean;
  has_pending_manual: boolean;
  earned_points: number;
  total_points: number;
}
