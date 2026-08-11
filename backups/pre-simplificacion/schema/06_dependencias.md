# Dependencias del set de 135 tablas (pre-simplificacion)

Proyecto Supabase: `wjkbqcrxwsmvtxmqgiqc` · schema `public` · generado 2026-08-11T21:39:06.249Z

**Este archivo es el critico para la fase de borrado.** Las FK entrantes son las que van a
bloquear un `DROP TABLE` sin `CASCADE`.

---

## c) Conteo del CTE

- Tablas encontradas por el CTE: **135**
- Esperado: ~135 → **coincide exactamente, sin diferencias**

<details><summary>Listado completo (135)</summary>

1. `achievements`
2. `activation_publications`
3. `booking_availability`
4. `booking_branding`
5. `booking_custom_questions`
6. `booking_event_types`
7. `booking_exceptions`
8. `booking_question_answers`
9. `booking_reminder_logs`
10. `booking_reminder_settings`
11. `booking_webhook_logs`
12. `booking_webhooks`
13. `bookings`
14. `calendar_blocked_events`
15. `calendar_event_mappings`
16. `calendar_integrations`
17. `campaign_applications`
18. `campaign_case_studies`
19. `campaign_deliverables`
20. `campaign_invitations`
21. `campaign_mappings`
22. `campaign_media`
23. `campaign_metrics`
24. `campaign_notifications`
25. `campaign_redemptions`
26. `campaign_templates`
27. `chronometer_pauses`
28. `company_followers`
29. `content_likes`
30. `creator_availability`
31. `creator_live_streams`
32. `favorites`
33. `feed_reactions`
34. `followers`
35. `global_badges`
36. `hashtags`
37. `kreadores_content_likes`
38. `link_previews`
39. `live_client_settings`
40. `live_event_creators`
41. `live_event_monitoring`
42. `live_feature_flags`
43. `live_hosting_hosts`
44. `live_hosting_requests`
45. `live_hosting_status_history`
46. `live_hosting_templates`
47. `live_hour_assignments`
48. `live_hour_purchases`
49. `live_hour_wallets`
50. `live_org_oauth_tokens`
51. `live_packages`
52. `live_platform_config`
53. `live_stream_comments`
54. `live_stream_history`
55. `live_stream_products`
56. `live_stream_reactions`
57. `live_stream_viewers`
58. `live_streaming_channels`
59. `live_usage_logs`
60. `managed_campaign_subscriptions`
61. `marketplace_campaigns`
62. `mission_templates`
63. `organization_streaming_config`
64. `point_transactions`
65. `portfolio_post_comments`
66. `portfolio_post_likes`
67. `portfolio_posts`
68. `portfolio_stories`
69. `post_hashtags`
70. `post_metrics`
71. `profile_views`
72. `promotional_campaigns`
73. `publication_verification_queue`
74. `reputation_configs`
75. `reputation_events`
76. `reputation_global`
77. `reputation_seasons`
78. `role_multipliers`
79. `role_points_config`
80. `role_weight_config`
81. `saved_collections`
82. `saved_creators`
83. `saved_items`
84. `saved_searches`
85. `season_goals`
86. `season_reward_claims`
87. `season_rewards`
88. `social_notifications`
89. `story_views`
90. `streaming_accounts`
91. `streaming_analytics_v2`
92. `streaming_channels_v2`
93. `streaming_chat_messages_v2`
94. `streaming_event_products`
95. `streaming_events`
96. `streaming_guests_v2`
97. `streaming_logs`
98. `streaming_overlays_v2`
99. `streaming_products_v2`
100. `streaming_providers_config`
101. `streaming_sales`
102. `streaming_session_channels_v2`
103. `streaming_sessions_v2`
104. `suggested_profiles_cache`
105. `unified_reputation_config`
106. `up_ai_config`
107. `up_arbiter_log`
108. `up_chronometer_pauses`
109. `up_client_trust_scores`
110. `up_creadores`
111. `up_creadores_totals`
112. `up_currency_conversions`
113. `up_editores`
114. `up_editores_totals`
115. `up_event_types`
116. `up_events`
117. `up_fraud_alerts`
118. `up_permissions`
119. `up_quality_scores`
120. `up_quest_progress`
121. `up_quests`
122. `up_rules`
123. `up_season_snapshots`
124. `up_seasons`
125. `up_settings`
126. `up_user_scores`
127. `user_achievements`
128. `user_daily_missions`
129. `user_feed_events`
130. `user_global_badges`
131. `user_global_stats`
132. `user_interest_profile`
133. `user_points`
134. `user_reputation_totals`
135. `user_streaks`

</details>

---

## a) FKs ENTRANTES (desde tablas FUERA del set hacia tablas DEL set)

Total: **8**

| # | Tabla origen (fuera del set) | Columna(s) | Tabla destino (del set) | ON DELETE | Constraint |
|---|---|---|---|---|---|
| 1 | `alerts` | `campaign_mapping_id` | `campaign_mappings` | CASCADE | `alerts_campaign_mapping_id_fkey` |
| 2 | `brand_credit_transactions` | `related_campaign_id` | `marketplace_campaigns` | NO ACTION | `brand_credit_transactions_related_campaign_id_fkey` |
| 3 | `creatives` | `campaign_mapping_id` | `campaign_mappings` | SET NULL | `creatives_campaign_mapping_id_fkey` |
| 4 | `marketplace_media` | `campaign_id` | `marketplace_campaigns` | SET NULL | `marketplace_media_campaign_id_fkey` |
| 5 | `marketplace_projects` | `application_id` | `campaign_applications` | NO ACTION | `marketplace_projects_application_id_fkey` |
| 6 | `marketplace_projects` | `campaign_id` | `marketplace_campaigns` | NO ACTION | `marketplace_projects_campaign_id_fkey` |
| 7 | `portfolio_items` | `legacy_post_id` | `portfolio_posts` | SET NULL | `portfolio_items_legacy_post_id_fkey` |
| 8 | `scheduled_posts` | `campaign_id` | `marketplace_campaigns` | SET NULL | `scheduled_posts_campaign_id_fkey` |

**Tablas externas implicadas (7):** `alerts`, `brand_credit_transactions`, `creatives`, `marketplace_media`, `marketplace_projects`, `portfolio_items`, `scheduled_posts`

**Tablas del set referenciadas desde fuera (4):** `campaign_mappings`, `marketplace_campaigns`, `campaign_applications`, `portfolio_posts`

---

## b) Vistas, materialized views y funciones que mencionan tablas del set

Deteccion por coincidencia de palabra completa (`~*` con `\m…\M`) sobre `pg_get_viewdef`
y `pg_proc.prosrc`. Puede haber falsos positivos cuando el nombre aparece como alias,
comentario o en un string.

### Vistas / materialized views: 2

| Objeto | Tipo | Tablas del set mencionadas |
|---|---|---|
| `creator_availability_status` | view | `creator_availability` |
| `season_leaderboard_live` | materialized view | `reputation_seasons`, `user_reputation_totals` |

### Funciones: 133

| Funcion | Argumentos | Tablas del set mencionadas |
|---|---|---|
| `activate_campaign` | `p_campaign_id uuid, p_payment_intent_id text` | `marketplace_campaigns` |
| `add_user_points` | `_user_id uuid, _content_id uuid, _transaction_type point_transaction_type, _points integer, _description text` | `point_transactions`, `user_points` |
| `admin_delete_user_cascade` | `target_user_id uuid` | `campaign_applications`, `campaign_redemptions`, `chronometer_pauses`, `content_likes`, `creator_availability`, `point_transactions`, `portfolio_post_comments`, `portfolio_posts`, `portfolio_stories`, `reputation_events`, `reputation_global`, `saved_collections`, `saved_creators`, `saved_items`, `social_notifications`, `suggested_profiles_cache`, `up_chronometer_pauses`, `up_creadores`, `up_creadores_totals`, `up_editores`, `up_editores_totals`, `up_events`, `up_fraud_alerts`, `up_quest_progress`, `up_season_snapshots`, `up_user_scores`, `user_achievements`, `user_feed_events`, `user_interest_profile`, `user_points`, `user_reputation_totals` |
| `apply_first_campaign_promo` | `p_brand_id uuid, p_campaign_id uuid` | `marketplace_campaigns` |
| `approve_campaign_application` | `p_application_id uuid, p_agreed_price numeric` | `campaign_applications`, `marketplace_campaigns` |
| `assign_editor_to_project` | `p_project_id uuid, p_editor_profile_id uuid, p_assigned_by uuid` | `marketplace_campaigns` |
| `auto_approve_stale_content` | `()` | `reputation_events`, `reputation_seasons` |
| `auto_booking_event_type_slug` | `()` | `booking_event_types` |
| `auto_calculate_points` | `()` | `user_points` |
| `auto_campaign_slug` | `()` | `marketplace_campaigns` |
| `auto_generate_case_study` | `()` | `campaign_applications`, `campaign_case_studies` |
| `auto_update_availability_status` | `()` | `creator_availability` |
| `award_kiro_points` | `p_points integer, p_source text, p_description text, p_new_total_points integer` | `point_transactions`, `user_points` |
| `award_referral_coins` | `p_user_id uuid, p_org_id uuid, p_amount integer, p_reason text` | `reputation_events` |
| `award_reputation_event` | `p_organization_id uuid, p_user_id uuid, p_role_key character varying, p_reference_type character varying, p_reference_id uuid, p_event_type character varying, p_event_subtype character varying, p_base_points integer, p_multiplier numeric, p_breakdown jsonb, p_season_id uuid` | `reputation_events` |
| `award_space_points` | `p_space_id uuid, p_user_id uuid, p_action text, p_points integer, p_reference_id uuid` | `reputation_events` |
| `calculate_delivery_points` | `p_organization_id uuid, p_user_id uuid, p_role_key text, p_delivery_days integer, p_has_issues boolean, p_issue_count integer, p_complexity_key text, p_client_tier text` | `role_multipliers`, `role_points_config`, `user_reputation_totals` |
| `calculate_engagement_bonus` | `p_publication_id uuid` | `activation_publications`, `marketplace_campaigns` |
| `calculate_up_level` | `points integer` | `up_settings` |
| `can_manage_campaign` | `_campaign_id uuid` | `marketplace_campaigns` |
| `can_see_campaign` | `_campaign_id uuid, _user_id uuid` | `campaign_invitations`, `marketplace_campaigns` |
| `can_view_campaign` | `_campaign_id uuid` | `marketplace_campaigns` |
| `check_and_award_achievements` | `_user_id uuid` | `achievements`, `user_achievements`, `user_points` |
| `check_and_award_global_badges` | `p_user_id uuid` | `global_badges`, `user_global_badges`, `user_global_stats` |
| `check_and_pause_chronometer` | `p_content_id uuid, p_organization_id uuid, p_role text, p_user_id uuid, p_reason text` | `chronometer_pauses` |
| `check_booking_slot_available` | `_host_user_id uuid, _start_time timestamp with time zone, _end_time timestamp with time zone, _exclude_booking_id uuid` | `bookings`, `calendar_blocked_events`, `calendar_integrations` |
| `check_campaign_invitation` | `p_campaign_id uuid, p_profile_id uuid` | `campaign_invitations` |
| `check_perfect_streak` | `_user_id uuid` | `user_points` |
| `check_vacation_end` | `()` | `creator_availability` |
| `cleanup_expired_stories` | `()` | `portfolio_stories` |
| `close_expired_seasons` | `()` | `reputation_seasons`, `up_seasons` |
| `close_season_and_distribute_rewards` | `p_season_id uuid` | `reputation_seasons`, `season_reward_claims`, `season_rewards`, `user_achievements`, `user_reputation_totals` |
| `complete_campaign_delivery` | `p_application_id uuid, p_rating integer` | `campaign_applications`, `marketplace_campaigns` |
| `complete_live_hosting` | `p_request_id uuid, p_host_rating numeric, p_client_rating numeric, p_actual_duration integer, p_actual_revenue numeric, p_actual_orders integer` | `live_hosting_hosts`, `live_hosting_requests` |
| `consume_live_hours` | `p_event_id uuid` | `live_hour_assignments`, `live_hour_wallets`, `live_usage_logs`, `streaming_events` |
| `consume_live_hours` | `p_event_id uuid, p_client_id uuid, p_hours_used numeric` | `live_hour_assignments`, `live_hour_wallets`, `live_usage_logs` |
| `consume_live_hours` | `_event_id uuid, _actual_hours numeric` | `live_hour_wallets`, `live_usage_logs`, `streaming_events` |
| `count_qualified_referrals` | `p_user_id uuid` | `portfolio_posts` |
| `create_default_reminders` | `()` | `booking_reminder_settings` |
| `create_default_up_config` | `_org_id uuid` | `up_ai_config`, `up_event_types`, `up_permissions`, `up_rules`, `up_seasons` |
| `create_default_up_event_types` | `_org_id uuid` | `up_event_types` |
| `create_default_up_rules` | `_org_id uuid` | `up_rules` |
| `create_flash_offer` | `p_product_id uuid, p_flash_price numeric, p_duration_minutes integer, p_stock integer` | `streaming_products_v2` |
| `create_project_from_application` | `p_application_id uuid, p_approved_by uuid` | `campaign_applications`, `marketplace_campaigns` |
| `create_public_booking` | `_event_type_id uuid, _host_user_id uuid, _start_time timestamp with time zone, _end_time timestamp with time zone, _timezone text, _guest_name text, _guest_email text, _guest_phone text, _guest_notes text, _question_answers jsonb` | `booking_event_types`, `booking_question_answers`, `bookings` |
| `create_streaming_session_for_hosting` | `()` | `live_hosting_hosts`, `live_hosting_requests`, `streaming_sessions_v2` |
| `create_streaming_session_for_request` | `p_request_id uuid` | `live_hosting_hosts`, `live_hosting_requests`, `streaming_sessions_v2` |
| `create_user_global_stats` | `()` | `user_global_stats` |
| `creator_meets_activation_requirements` | `p_creator_profile_id uuid, p_campaign_id uuid` | `marketplace_campaigns` |
| `emit_up_event` | `_org_id uuid, _user_id uuid, _event_type_key text, _content_id uuid, _event_data jsonb, _ai_inferred boolean, _ai_confidence numeric, _ai_evidence jsonb` | `point_transactions`, `up_events`, `up_rules`, `user_points` |
| `emit_up_event` | `_event_type_key text, _user_id uuid, _content_id uuid, _event_data jsonb` | `point_transactions`, `up_events`, `up_rules`, `user_points` |
| `extract_hashtags` | `()` | `hashtags`, `post_hashtags` |
| `feature_streaming_product` | `p_session_id uuid, p_product_id uuid` | `streaming_products_v2` |
| `fn_bump_user_streak` | `p_user_id uuid` | `user_streaks` |
| `fn_feed_reaction_activity` | `()` | `feed_reactions`, `reputation_events` |
| `fn_feed_reactions_guard_update` | `()` | `feed_reactions` |
| `fn_match_daily_missions` | `p_user_id uuid, p_event_type text` | `mission_templates`, `user_daily_missions` |
| `get_active_live_streams` | `p_limit integer, p_category text` | `creator_live_streams` |
| `get_active_season` | `org_id uuid` | `up_seasons` |
| `get_available_booking_slots` | `_host_user_id uuid, _event_type_id uuid, _date date, _timezone text` | `booking_availability`, `booking_event_types`, `booking_exceptions` |
| `get_booking_page_data` | `_slug text` | `booking_branding`, `booking_custom_questions`, `booking_event_types` |
| `get_company_followers_count` | `_company_id uuid` | `company_followers` |
| `get_content_paused_hours` | `p_content_id uuid, p_role text` | `chronometer_pauses` |
| `get_creator_availability` | `p_user_id uuid` | `creator_availability` |
| `get_creator_unified_stats` | `p_user_id uuid` | `saved_creators` |
| `get_daily_missions` | `()` | `mission_templates`, `user_daily_missions` |
| `get_eligible_activation_campaigns` | `p_creator_profile_id uuid` | `marketplace_campaigns` |
| `get_feed_posts` | `p_tab text, p_niche text, p_cursor_created_at timestamp with time zone, p_cursor_id uuid, p_limit integer` | `feed_reactions`, `followers`, `portfolio_post_likes`, `portfolio_posts`, `saved_items` |
| `get_feed_posts` | `p_tab text, p_niche text, p_cursor_created_at timestamp with time zone, p_cursor_id uuid, p_limit integer, p_seed text` | `feed_reactions`, `followers`, `portfolio_post_likes`, `portfolio_posts`, `saved_items` |
| `get_follow_counts` | `_user_id uuid` | `followers` |
| `get_global_badges_with_progress` | `p_user_id uuid` | `global_badges`, `user_global_badges` |
| `get_global_ranking` | `p_limit integer, p_offset integer` | `user_global_stats` |
| `get_hosting_hosts` | `p_request_id uuid` | `live_hosting_hosts` |
| `get_live_hosting_requests` | `p_org_id uuid, p_channel hosting_channel_type, p_statuses hosting_request_status[]` | `live_hosting_requests` |
| `get_live_stream_by_creator` | `p_creator_slug text` | `creator_live_streams` |
| `get_marketplace_hosting_requests` | `p_niches text[], p_min_budget numeric, p_max_budget numeric, p_limit integer, p_offset integer` | `live_hosting_requests` |
| `get_org_account_snapshots` | `p_org_id uuid, p_days integer` | `profile_views` |
| `get_org_ranking` | `p_org_id uuid, p_role text, p_archetype text, p_sort_by text, p_limit integer` | `user_reputation_totals` |
| `get_org_ranking_normalized` | `p_org_id uuid, p_role text, p_archetype text, p_sort_by text` | `role_weight_config`, `up_user_scores` |
| `get_org_streaming_sessions` | `p_organization_id uuid` | `streaming_products_v2`, `streaming_session_channels_v2`, `streaming_sessions_v2` |
| `get_org_talent_roster` | `p_organization_id uuid` | `up_creadores_totals`, `up_editores_totals` |
| `get_referral_gate_status` | `p_user_id uuid` | `portfolio_posts` |
| `get_role_weight` | `p_user_id uuid, p_organization_id uuid, p_system_role text` | `role_weight_config` |
| `get_season_rewards_with_eligibility` | `p_season_id uuid, p_user_id uuid` | `reputation_seasons`, `season_reward_claims`, `season_rewards`, `user_points` |
| `get_session_analytics_summary` | `p_session_id uuid` | `streaming_analytics_v2`, `streaming_products_v2` |
| `get_unified_talent` | `p_org_id uuid` | `up_user_scores` |
| `get_up_setting` | `setting_key text` | `up_settings` |
| `get_user_events` | `p_user_id uuid, p_org_id uuid, p_role text, p_limit integer` | `reputation_events` |
| `get_user_reputation` | `p_user_id uuid, p_org_id uuid` | `user_reputation_totals` |
| `get_user_scores` | `p_user_id uuid, p_org_id uuid` | `up_user_scores` |
| `increment_portfolio_post_views` | `post_uuid uuid` | `portfolio_posts` |
| `initialize_org_points_config` | `p_organization_id uuid` | `role_multipliers`, `role_points_config` |
| `is_campaign_invitee` | `_campaign_id uuid` | `campaign_invitations` |
| `is_creator_live` | `p_user_id uuid` | `creator_live_streams` |
| `is_following` | `_following_id uuid` | `followers` |
| `is_following_company` | `_company_id uuid` | `company_followers` |
| `issue_academy_certificate` | `p_course_id uuid, p_user_id uuid` | `reputation_events` |
| `kreoon_merge_client` | `p_master_id uuid, p_dup_id uuid` | `company_followers`, `live_client_settings`, `live_hosting_requests`, `live_hour_assignments`, `live_usage_logs`, `marketplace_campaigns`, `streaming_accounts`, `streaming_events`, `streaming_sales`, `streaming_sessions_v2` |
| `leave_live_viewer` | `p_stream_id uuid, p_session_id text` | `live_stream_viewers` |
| `log_hosting_host_status_change` | `()` | `live_hosting_status_history` |
| `log_hosting_request_status_change` | `()` | `live_hosting_status_history` |
| `notify_on_company_follow` | `()` | `social_notifications` |
| `notify_on_follow` | `()` | `social_notifications` |
| `notify_on_portfolio_comment` | `()` | `portfolio_posts`, `social_notifications` |
| `notify_on_post_like` | `()` | `portfolio_posts`, `social_notifications` |
| `ping_live_viewer` | `p_stream_id uuid, p_session_id text` | `live_stream_viewers` |
| `recalc_creator_portfolio_count` | `p_creator_id uuid` | `portfolio_posts` |
| `record_live_shopping_purchase` | `p_session_id uuid, p_product_id uuid, p_quantity integer, p_amount_usd numeric` | `streaming_products_v2`, `streaming_sessions_v2` |
| `refresh_reputation_global` | `p_user_id uuid` | `reputation_global`, `up_user_scores` |
| `reserve_live_hours` | `_event_id uuid, _hours numeric` | `live_hour_wallets`, `streaming_events` |
| `resume_chronometer` | `p_content_id uuid, p_resume_reason text` | `chronometer_pauses` |
| `search_marketplace_creators` | `p_query text, p_roles text[], p_location_country text, p_location_city text, p_niches text[], p_specializations text[], p_min_rating numeric, p_max_price numeric, p_accepts_exchange boolean, p_is_available boolean, p_limit integer, p_offset integer` | `portfolio_posts` |
| `smart_match_creators` | `p_campaign_id uuid` | `marketplace_campaigns` |
| `sync_marketplace_reputation` | `p_user_id uuid` | `user_reputation_totals` |
| `sync_profile_to_global_stats` | `()` | `user_global_stats` |
| `sync_profile_to_marketplace` | `target_user_id uuid` | `portfolio_posts` |
| `sync_user_global_stats` | `p_profile_completeness integer, p_has_avatar boolean, p_has_bio boolean, p_bio_length integer, p_social_networks_count integer, p_total_projects_completed integer, p_early_deliveries_count integer, p_late_deliveries_count integer, p_on_time_deliveries_count integer, p_days_since_signup integer, p_badges_completed_count integer, p_total_badge_points integer, p_last_active_at timestamp with time zone` | `user_global_stats` |
| `sync_user_health` | `p_user_id uuid` | `campaign_applications` |
| `toggle_company_follow` | `_company_id uuid` | `company_followers` |
| `toggle_content_like` | `content_uuid uuid, viewer text` | `content_likes` |
| `toggle_follow` | `_following_id uuid` | `followers` |
| `toggle_portfolio_post_like` | `post_uuid uuid, viewer text` | `portfolio_post_likes`, `portfolio_posts` |
| `toggle_post_pin` | `post_id uuid` | `portfolio_posts` |
| `trigger_check_referrer_unlock` | `()` | `portfolio_posts` |
| `update_campaign_application_count` | `()` | `campaign_applications`, `marketplace_campaigns` |
| `update_live_stream_comments_count` | `()` | `creator_live_streams` |
| `update_live_stream_likes_count` | `()` | `creator_live_streams` |
| `update_live_stream_viewers_count` | `()` | `creator_live_streams` |
| `update_portfolio_post_comments_count` | `()` | `portfolio_posts` |
| `update_reputation_totals` | `()` | `reputation_seasons`, `user_reputation_totals` |
| `update_talent_performance_scores` | `p_user_id uuid, p_organization_id uuid` | `up_quality_scores` |
| `update_up_user_scores` | `()` | `up_events`, `up_seasons`, `up_user_scores` |
| `update_user_last_active` | `()` | `user_global_stats` |

---

## Resumen

| Metrica | Valor |
|---|---|
| Tablas del set | 135 |
| FKs entrantes (bloquean DROP) | 8 |
| Vistas / matviews dependientes | 2 |
| Funciones dependientes | 133 |
| Total objetos dependientes | 135 |
