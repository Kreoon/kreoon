-- Parte 5: Inserción de insignias globales (100+)

-- PROFILE BADGES (15)
INSERT INTO public.global_badges (key, name, description, icon, category, condition_type, condition_config, rarity, ranking_points, tier, display_order) VALUES
('first_avatar', 'Primera Impresión', 'Subiste tu primera foto de perfil', 'user-circle', 'profile', 'threshold', '{"threshold": 1}', 'common', 5, 1, 1),
('first_banner', 'Portada Personalizada', 'Agregaste un banner a tu perfil', 'image', 'profile', 'threshold', '{"threshold": 1}', 'common', 5, 1, 2),
('first_bio', 'Cuenta tu Historia', 'Escribiste tu biografía', 'file-text', 'profile', 'threshold', '{"threshold": 1}', 'common', 5, 1, 3),
('bio_detailed', 'Narrador', 'Tu biografía tiene más de 200 caracteres', 'book-open', 'profile', 'threshold', '{"threshold": 200}', 'uncommon', 10, 2, 4),
('social_connected', 'Conectado', 'Vinculaste tu primera red social', 'link', 'profile', 'threshold', '{"threshold": 1}', 'common', 5, 1, 5),
('social_networker', 'Networking Pro', 'Vinculaste 3+ redes sociales', 'share-2', 'profile', 'threshold', '{"threshold": 3}', 'uncommon', 15, 2, 6),
('social_omnipresent', 'Omnipresente', 'Vinculaste 5+ redes sociales', 'globe', 'profile', 'threshold', '{"threshold": 5}', 'rare', 25, 3, 7),
('profile_starter', 'Perfil Iniciado', 'Completaste 25% de tu perfil', 'user-check', 'profile', 'threshold', '{"threshold": 25}', 'common', 5, 1, 8),
('profile_growing', 'Perfil en Crecimiento', 'Completaste 50% de tu perfil', 'trending-up', 'profile', 'threshold', '{"threshold": 50}', 'uncommon', 10, 2, 9),
('profile_pro', 'Perfil Profesional', 'Completaste 75% de tu perfil', 'award', 'profile', 'threshold', '{"threshold": 75}', 'rare', 20, 3, 10),
('profile_perfect', 'Perfil Perfecto', 'Completaste 100% de tu perfil', 'star', 'profile', 'threshold', '{"threshold": 100}', 'epic', 40, 4, 11),
('profile_verified', 'Verificado', 'Tu perfil fue verificado', 'check-circle', 'profile', 'threshold', '{"threshold": 1}', 'rare', 30, 3, 12),
('profile_featured', 'Destacado', 'Tu perfil apareció en destacados', 'zap', 'profile', 'threshold', '{"threshold": 1}', 'epic', 50, 4, 13),
('identity_complete', 'Identidad Completa', 'Avatar + Banner + Bio completos', 'user-plus', 'profile', 'threshold', '{"threshold": 3}', 'uncommon', 15, 2, 14),
('profile_legend', 'Leyenda del Perfil', 'Perfil 100% + Verificado + Destacado', 'crown', 'profile', 'threshold', '{"threshold": 3}', 'legendary', 100, 4, 15)
ON CONFLICT (key) DO NOTHING;

-- PORTFOLIO BADGES (20)
INSERT INTO public.global_badges (key, name, description, icon, category, condition_type, condition_config, rarity, ranking_points, tier, display_order) VALUES
('first_upload', 'Primera Obra', 'Subiste tu primer trabajo al portafolio', 'upload', 'portfolio', 'threshold', '{"threshold": 1}', 'common', 5, 1, 1),
('portfolio_5', 'Portafolio Inicial', 'Tienes 5 trabajos en tu portafolio', 'folder', 'portfolio', 'threshold', '{"threshold": 5}', 'common', 10, 1, 2),
('portfolio_10', 'Portafolio Activo', 'Tienes 10 trabajos en tu portafolio', 'folder-open', 'portfolio', 'threshold', '{"threshold": 10}', 'uncommon', 20, 2, 3),
('portfolio_25', 'Portafolio Premium', 'Tienes 25 trabajos en tu portafolio', 'briefcase', 'portfolio', 'threshold', '{"threshold": 25}', 'rare', 50, 3, 4),
('portfolio_50', 'Galería Maestra', 'Tienes 50 trabajos en tu portafolio', 'archive', 'portfolio', 'threshold', '{"threshold": 50}', 'epic', 80, 4, 5),
('portfolio_100', 'Museo Personal', 'Tienes 100 trabajos en tu portafolio', 'database', 'portfolio', 'threshold', '{"threshold": 100}', 'legendary', 150, 4, 6),
('first_video', 'Director', 'Subiste tu primer video', 'video', 'portfolio', 'threshold', '{"threshold": 1}', 'common', 5, 1, 7),
('video_creator', 'Creador de Video', 'Tienes 10+ videos en tu portafolio', 'film', 'portfolio', 'threshold', '{"threshold": 10}', 'uncommon', 25, 2, 8),
('video_master', 'Maestro Audiovisual', 'Tienes 50+ videos en tu portafolio', 'clapperboard', 'portfolio', 'threshold', '{"threshold": 50}', 'epic', 80, 4, 9),
('hd_quality', 'Alta Definición', 'Subiste contenido en HD/4K', 'monitor', 'portfolio', 'threshold', '{"threshold": 1}', 'uncommon', 15, 2, 10),
('hd_collector', 'Coleccionista HD', '10+ contenidos en HD/4K', 'tv', 'portfolio', 'threshold', '{"threshold": 10}', 'rare', 40, 3, 11),
('views_100', 'Primeras Miradas', '100 vistas totales', 'eye', 'portfolio', 'threshold', '{"threshold": 100}', 'common', 5, 1, 12),
('views_1000', 'Mil Ojos', '1,000 vistas totales', 'eye', 'portfolio', 'threshold', '{"threshold": 1000}', 'uncommon', 20, 2, 13),
('views_10000', 'Viral Potencial', '10,000 vistas totales', 'trending-up', 'portfolio', 'threshold', '{"threshold": 10000}', 'rare', 50, 3, 14),
('views_100000', 'Fenómeno Viral', '100,000 vistas totales', 'flame', 'portfolio', 'threshold', '{"threshold": 100000}', 'epic', 100, 4, 15),
('views_1000000', 'Millonario de Vistas', '1,000,000 vistas totales', 'crown', 'portfolio', 'threshold', '{"threshold": 1000000}', 'legendary', 200, 4, 16),
('likes_100', 'Primeros Likes', '100 likes totales', 'heart', 'portfolio', 'threshold', '{"threshold": 100}', 'common', 5, 1, 17),
('likes_1000', 'Amado por Mil', '1,000 likes totales', 'heart', 'portfolio', 'threshold', '{"threshold": 1000}', 'uncommon', 25, 2, 18),
('likes_10000', 'Corazón de Oro', '10,000 likes totales', 'heart', 'portfolio', 'threshold', '{"threshold": 10000}', 'rare', 60, 3, 19),
('viral_king', 'Rey Viral', 'Un trabajo con 50K+ vistas', 'crown', 'portfolio', 'threshold', '{"threshold": 50000}', 'legendary', 150, 4, 20)
ON CONFLICT (key) DO NOTHING;

-- EXPERIENCE BADGES (25)
INSERT INTO public.global_badges (key, name, description, icon, category, condition_type, condition_config, rarity, ranking_points, tier, display_order) VALUES
('first_project', 'Misión Cumplida', 'Completaste tu primer proyecto', 'check-circle', 'experience', 'threshold', '{"threshold": 1}', 'common', 10, 1, 1),
('project_5', 'Profesional', '5 proyectos completados', 'briefcase', 'experience', 'threshold', '{"threshold": 5}', 'common', 15, 1, 2),
('project_10', 'Experimentado', '10 proyectos completados', 'award', 'experience', 'threshold', '{"threshold": 10}', 'uncommon', 25, 2, 3),
('project_25', 'Veterano', '25 proyectos completados', 'medal', 'experience', 'threshold', '{"threshold": 25}', 'rare', 50, 3, 4),
('project_50', 'Experto', '50 proyectos completados', 'star', 'experience', 'threshold', '{"threshold": 50}', 'epic', 80, 4, 5),
('project_100', 'Centurión', '100 proyectos completados', 'shield', 'experience', 'threshold', '{"threshold": 100}', 'legendary', 150, 4, 6),
('project_250', 'Leyenda', '250 proyectos completados', 'crown', 'experience', 'threshold', '{"threshold": 250}', 'mythic', 250, 4, 7),
('first_client', 'Primer Cliente', 'Trabajaste con tu primer cliente', 'user-check', 'experience', 'threshold', '{"threshold": 1}', 'common', 10, 1, 8),
('client_5', 'Cartera Inicial', '5 clientes diferentes', 'users', 'experience', 'threshold', '{"threshold": 5}', 'uncommon', 20, 2, 9),
('client_10', 'Cartera Sólida', '10 clientes diferentes', 'users', 'experience', 'threshold', '{"threshold": 10}', 'rare', 40, 3, 10),
('client_25', 'Red de Clientes', '25 clientes diferentes', 'network', 'experience', 'threshold', '{"threshold": 25}', 'epic', 70, 4, 11),
('client_50', 'Magnate', '50 clientes diferentes', 'building', 'experience', 'threshold', '{"threshold": 50}', 'legendary', 120, 4, 12),
('repeat_client', 'Cliente Fiel', 'Un cliente te contrató 2+ veces', 'refresh-cw', 'experience', 'threshold', '{"threshold": 1}', 'uncommon', 15, 2, 13),
('repeat_5', 'Generador de Lealtad', '5 clientes recurrentes', 'repeat', 'experience', 'threshold', '{"threshold": 5}', 'rare', 40, 3, 14),
('repeat_10', 'Imán de Clientes', '10 clientes recurrentes', 'magnet', 'experience', 'threshold', '{"threshold": 10}', 'epic', 80, 4, 15),
('revenue_100', 'Primeros $100', '$100 USD ganados', 'dollar-sign', 'experience', 'threshold', '{"threshold": 100}', 'common', 10, 1, 16),
('revenue_500', '$500 Club', '$500 USD ganados', 'dollar-sign', 'experience', 'threshold', '{"threshold": 500}', 'uncommon', 20, 2, 17),
('revenue_1000', '$1K Club', '$1,000 USD ganados', 'dollar-sign', 'experience', 'threshold', '{"threshold": 1000}', 'rare', 40, 3, 18),
('revenue_5000', '$5K Club', '$5,000 USD ganados', 'trending-up', 'experience', 'threshold', '{"threshold": 5000}', 'epic', 70, 4, 19),
('revenue_10000', '$10K Club', '$10,000 USD ganados', 'landmark', 'experience', 'threshold', '{"threshold": 10000}', 'legendary', 120, 4, 20),
('revenue_25000', '$25K Club', '$25,000 USD ganados', 'gem', 'experience', 'threshold', '{"threshold": 25000}', 'legendary', 180, 4, 21),
('revenue_50000', '$50K Club', '$50,000 USD ganados', 'diamond', 'experience', 'threshold', '{"threshold": 50000}', 'mythic', 250, 4, 22),
('revenue_100000', 'Seis Cifras', '$100,000 USD ganados', 'crown', 'experience', 'threshold', '{"threshold": 100000}', 'mythic', 400, 4, 23),
('multi_org', 'Multi-Organización', 'Trabajas en 2+ organizaciones', 'git-branch', 'experience', 'threshold', '{"threshold": 2}', 'rare', 35, 3, 24),
('org_master', 'Maestro Multi-Org', 'Trabajas en 5+ organizaciones', 'git-merge', 'experience', 'threshold', '{"threshold": 5}', 'epic', 70, 4, 25)
ON CONFLICT (key) DO NOTHING;

-- QUALITY BADGES (20)
INSERT INTO public.global_badges (key, name, description, icon, category, condition_type, condition_config, rarity, ranking_points, tier, display_order) VALUES
('first_5star', 'Cinco Estrellas', 'Recibiste tu primera calificación de 5 estrellas', 'star', 'quality', 'threshold', '{"threshold": 1}', 'common', 10, 1, 1),
('stars_5', 'Consistente', '5 calificaciones de 5 estrellas', 'star', 'quality', 'threshold', '{"threshold": 5}', 'uncommon', 20, 2, 2),
('stars_10', 'Excelencia', '10 calificaciones de 5 estrellas', 'star', 'quality', 'threshold', '{"threshold": 10}', 'rare', 35, 3, 3),
('stars_25', 'Brillante', '25 calificaciones de 5 estrellas', 'sparkles', 'quality', 'threshold', '{"threshold": 25}', 'epic', 60, 4, 4),
('stars_50', 'Impecable', '50 calificaciones de 5 estrellas', 'sparkles', 'quality', 'threshold', '{"threshold": 50}', 'legendary', 100, 4, 5),
('stars_100', 'Perfeccionista', '100 calificaciones de 5 estrellas', 'crown', 'quality', 'threshold', '{"threshold": 100}', 'mythic', 200, 4, 6),
('rating_45', 'Alta Calidad', 'Rating promedio 4.5+ con 10+ reviews', 'thumbs-up', 'quality', 'threshold', '{"min_rating": 4.5, "min_ratings": 10}', 'rare', 40, 3, 7),
('rating_48', 'Calidad Premium', 'Rating promedio 4.8+ con 25+ reviews', 'award', 'quality', 'threshold', '{"min_rating": 4.8, "min_ratings": 25}', 'epic', 70, 4, 8),
('rating_perfect', 'Rating Perfecto', 'Rating 5.0 con 50+ reviews', 'crown', 'quality', 'threshold', '{"min_rating": 5.0, "min_ratings": 50}', 'legendary', 150, 4, 9),
('no_revision_1', 'Primera Aprobación Limpia', 'Proyecto aprobado sin revisiones', 'check', 'quality', 'threshold', '{"threshold": 1}', 'uncommon', 15, 2, 10),
('no_revision_5', 'Precisión', '5 proyectos sin revisiones', 'target', 'quality', 'threshold', '{"threshold": 5}', 'rare', 35, 3, 11),
('no_revision_10', 'Inmaculado', '10 proyectos consecutivos sin revisiones', 'shield-check', 'quality', 'threshold', '{"threshold": 10}', 'epic', 70, 4, 12),
('no_revision_25', 'Perfección Absoluta', '25 proyectos consecutivos sin revisiones', 'gem', 'quality', 'threshold', '{"threshold": 25}', 'legendary', 130, 4, 13),
('quality_streak_7', 'Semana Perfecta', '7 días de entregas perfectas', 'calendar-check', 'quality', 'streak', '{"streak_days": 7}', 'rare', 40, 3, 14),
('quality_streak_30', 'Mes Perfecto', '30 días de entregas perfectas', 'calendar', 'quality', 'streak', '{"streak_days": 30}', 'epic', 80, 4, 15),
('quality_streak_90', 'Trimestre Perfecto', '90 días de entregas perfectas', 'trophy', 'quality', 'streak', '{"streak_days": 90}', 'legendary', 150, 4, 16),
('zero_issues', 'Sin Problemas', 'Nunca has tenido un issue reportado', 'shield', 'quality', 'threshold', '{"threshold": 1}', 'rare', 50, 3, 17),
('issue_resolver', 'Resolutor', 'Resolviste un issue rápidamente', 'wrench', 'quality', 'threshold', '{"threshold": 1}', 'uncommon', 15, 2, 18),
('client_favorite', 'Favorito del Cliente', 'Un cliente te marcó como favorito', 'heart', 'quality', 'threshold', '{"threshold": 1}', 'uncommon', 20, 2, 19),
('quality_legend', 'Leyenda de Calidad', 'Rating 5.0 + 100 reviews + sin issues', 'crown', 'quality', 'compound', '{"requirements": ["rating_perfect", "stars_100", "zero_issues"]}', 'mythic', 300, 4, 20)
ON CONFLICT (key) DO NOTHING;

-- SPEED BADGES (15)
INSERT INTO public.global_badges (key, name, description, icon, category, condition_type, condition_config, rarity, ranking_points, tier, display_order) VALUES
('early_bird', 'Madrugador', 'Primera entrega anticipada', 'sunrise', 'speed', 'threshold', '{"threshold": 1}', 'common', 10, 1, 1),
('early_5', 'Velocista', '5 entregas anticipadas', 'zap', 'speed', 'threshold', '{"threshold": 5}', 'uncommon', 20, 2, 2),
('early_10', 'Rápido', '10 entregas anticipadas', 'zap', 'speed', 'threshold', '{"threshold": 10}', 'rare', 35, 3, 3),
('early_25', 'Flash', '25 entregas anticipadas', 'bolt', 'speed', 'threshold', '{"threshold": 25}', 'epic', 60, 4, 4),
('early_50', 'Supersónico', '50 entregas anticipadas', 'rocket', 'speed', 'threshold', '{"threshold": 50}', 'legendary', 100, 4, 5),
('early_100', 'Velocidad de la Luz', '100 entregas anticipadas', 'sparkles', 'speed', 'threshold', '{"threshold": 100}', 'mythic', 180, 4, 6),
('on_time_10', 'Puntual', '10 entregas a tiempo', 'clock', 'speed', 'threshold', '{"threshold": 10}', 'common', 15, 1, 7),
('on_time_50', 'Confiable', '50 entregas a tiempo', 'clock', 'speed', 'threshold', '{"threshold": 50}', 'rare', 40, 3, 8),
('on_time_100', 'Centenario Puntual', '100 entregas a tiempo', 'alarm-clock', 'speed', 'threshold', '{"threshold": 100}', 'epic', 80, 4, 9),
('delivery_streak_7', 'Racha Semanal', '7 días seguidos entregando a tiempo', 'calendar-check', 'speed', 'streak', '{"streak_days": 7}', 'uncommon', 25, 2, 10),
('delivery_streak_30', 'Racha Mensual', '30 días seguidos entregando a tiempo', 'calendar', 'speed', 'streak', '{"streak_days": 30}', 'rare', 50, 3, 11),
('delivery_streak_90', 'Racha Trimestral', '90 días seguidos entregando a tiempo', 'trophy', 'speed', 'streak', '{"streak_days": 90}', 'epic', 100, 4, 12),
('delivery_streak_365', 'Racha Anual', '365 días seguidos entregando a tiempo', 'crown', 'speed', 'streak', '{"streak_days": 365}', 'legendary', 200, 4, 13),
('same_day', 'Express', 'Entregaste el mismo día', 'timer', 'speed', 'threshold', '{"threshold": 1}', 'rare', 30, 3, 14),
('speed_demon', 'Demonio de Velocidad', '10 entregas el mismo día', 'flame', 'speed', 'threshold', '{"threshold": 10}', 'legendary', 120, 4, 15)
ON CONFLICT (key) DO NOTHING;

-- COMMUNITY BADGES (20)
INSERT INTO public.global_badges (key, name, description, icon, category, condition_type, condition_config, rarity, ranking_points, tier, display_order) VALUES
('first_follower', 'Primer Seguidor', 'Alguien te siguió', 'user-plus', 'community', 'threshold', '{"threshold": 1}', 'common', 5, 1, 1),
('followers_10', 'Influyente', '10 seguidores', 'users', 'community', 'threshold', '{"threshold": 10}', 'common', 10, 1, 2),
('followers_50', 'Popular', '50 seguidores', 'users', 'community', 'threshold', '{"threshold": 50}', 'uncommon', 25, 2, 3),
('followers_100', 'Centenar de Fans', '100 seguidores', 'users', 'community', 'threshold', '{"threshold": 100}', 'rare', 45, 3, 4),
('followers_500', 'Micro-Influencer', '500 seguidores', 'star', 'community', 'threshold', '{"threshold": 500}', 'epic', 80, 4, 5),
('followers_1000', 'Mil Fans', '1,000 seguidores', 'crown', 'community', 'threshold', '{"threshold": 1000}', 'legendary', 150, 4, 6),
('first_referral', 'Primer Referido', 'Referiste exitosamente a alguien', 'gift', 'community', 'threshold', '{"threshold": 1}', 'uncommon', 20, 2, 7),
('referrals_5', 'Embajador', '5 referidos exitosos', 'megaphone', 'community', 'threshold', '{"threshold": 5}', 'rare', 45, 3, 8),
('referrals_10', 'Super Embajador', '10 referidos exitosos', 'award', 'community', 'threshold', '{"threshold": 10}', 'epic', 80, 4, 9),
('referrals_25', 'Evangelista', '25 referidos exitosos', 'speaker', 'community', 'threshold', '{"threshold": 25}', 'legendary', 150, 4, 10),
('first_collab', 'Primera Colaboración', 'Colaboraste con otro creador', 'git-merge', 'community', 'threshold', '{"threshold": 1}', 'uncommon', 15, 2, 11),
('collaborator', 'Colaborador', '5 colaboraciones', 'git-pull-request', 'community', 'threshold', '{"threshold": 5}', 'rare', 35, 3, 12),
('team_player', 'Jugador de Equipo', '10 colaboraciones', 'users', 'community', 'threshold', '{"threshold": 10}', 'epic', 60, 4, 13),
('commenter', 'Comentarista', '50 comentarios dados', 'message-circle', 'community', 'threshold', '{"threshold": 50}', 'uncommon', 15, 2, 14),
('active_commenter', 'Activo en Comunidad', '200 comentarios dados', 'messages-square', 'community', 'threshold', '{"threshold": 200}', 'rare', 35, 3, 15),
('liker', 'Generoso', '100 likes dados', 'heart', 'community', 'threshold', '{"threshold": 100}', 'uncommon', 15, 2, 16),
('super_liker', 'Super Generoso', '500 likes dados', 'heart', 'community', 'threshold', '{"threshold": 500}', 'rare', 30, 3, 17),
('community_builder', 'Constructor de Comunidad', 'Followers + Referidos + Collabs', 'home', 'community', 'compound', '{"requirements": ["followers_100", "referrals_5", "collaborator"]}', 'epic', 100, 4, 18),
('mentor', 'Mentor', 'Ayudaste a 10 nuevos usuarios', 'graduation-cap', 'community', 'threshold', '{"threshold": 10}', 'epic', 70, 4, 19),
('community_legend', 'Leyenda de la Comunidad', '1K followers + 25 referidos + 10 collabs', 'crown', 'community', 'compound', '{"requirements": ["followers_1000", "referrals_25", "team_player"]}', 'mythic', 250, 4, 20)
ON CONFLICT (key) DO NOTHING;

-- VETERAN BADGES (15)
INSERT INTO public.global_badges (key, name, description, icon, category, condition_type, condition_config, rarity, ranking_points, tier, display_order) VALUES
('week_one', 'Primera Semana', '7 días en la plataforma', 'calendar', 'veteran', 'threshold', '{"threshold": 7}', 'common', 5, 1, 1),
('month_one', 'Primer Mes', '30 días en la plataforma', 'calendar', 'veteran', 'threshold', '{"threshold": 30}', 'common', 10, 1, 2),
('month_three', 'Trimestre', '90 días en la plataforma', 'calendar-days', 'veteran', 'threshold', '{"threshold": 90}', 'uncommon', 20, 2, 3),
('month_six', 'Semestre', '180 días en la plataforma', 'calendar-range', 'veteran', 'threshold', '{"threshold": 180}', 'rare', 35, 3, 4),
('year_one', 'Primer Aniversario', '365 días en la plataforma', 'cake', 'veteran', 'threshold', '{"threshold": 365}', 'epic', 70, 4, 5),
('year_two', 'Dos Años', '730 días en la plataforma', 'calendar-heart', 'veteran', 'threshold', '{"threshold": 730}', 'legendary', 120, 4, 6),
('year_three', 'Veterano de 3 Años', '1095 días en la plataforma', 'award', 'veteran', 'threshold', '{"threshold": 1095}', 'mythic', 180, 4, 7),
('active_week', 'Semana Activa', '7 días consecutivos activo', 'activity', 'veteran', 'streak', '{"streak_days": 7}', 'common', 10, 1, 8),
('active_month', 'Mes Activo', '30 días consecutivos activo', 'flame', 'veteran', 'streak', '{"streak_days": 30}', 'uncommon', 25, 2, 9),
('active_quarter', 'Trimestre Activo', '90 días consecutivos activo', 'fire', 'veteran', 'streak', '{"streak_days": 90}', 'rare', 50, 3, 10),
('active_year', 'Año Activo', '365 días consecutivos activo', 'sun', 'veteran', 'streak', '{"streak_days": 365}', 'epic', 100, 4, 11),
('season_participant', 'Participante de Temporada', 'Participaste en una temporada', 'flag', 'veteran', 'threshold', '{"threshold": 1}', 'common', 10, 1, 12),
('season_veteran', 'Veterano de Temporadas', 'Participaste en 5 temporadas', 'flags', 'veteran', 'threshold', '{"threshold": 5}', 'rare', 50, 3, 13),
('season_legend', 'Leyenda de Temporadas', 'Participaste en 10 temporadas', 'trophy', 'veteran', 'threshold', '{"threshold": 10}', 'legendary', 100, 4, 14),
('founding_member', 'Miembro Fundador', 'Te uniste durante la beta', 'star', 'veteran', 'threshold', '{"threshold": 1}', 'mythic', 200, 4, 15)
ON CONFLICT (key) DO NOTHING;

-- SPECIAL/SECRET BADGES (15)
INSERT INTO public.global_badges (key, name, description, icon, category, condition_type, condition_config, rarity, ranking_points, tier, display_order, is_secret) VALUES
('night_owl', 'Búho Nocturno', 'Completaste un proyecto a las 3am', 'moon', 'special', 'time_based', '{"hour_start": 2, "hour_end": 4}', 'rare', 30, 3, 1, true),
('early_riser', 'Madrugador Extremo', 'Completaste un proyecto a las 5am', 'sunrise', 'special', 'time_based', '{"hour_start": 4, "hour_end": 6}', 'rare', 30, 3, 2, true),
('weekend_warrior', 'Guerrero de Fin de Semana', '10 proyectos completados en fines de semana', 'shield', 'special', 'threshold', '{"threshold": 10}', 'uncommon', 25, 2, 3, true),
('holiday_hero', 'Héroe de Feriados', 'Completaste un proyecto en día feriado', 'gift', 'special', 'threshold', '{"threshold": 1}', 'rare', 35, 3, 4, true),
('perfect_month', 'Mes Perfecto', 'Todo a tiempo + 5 estrellas durante 30 días', 'calendar-check', 'special', 'compound', '{"requirements": ["on_time_100", "rating_perfect"]}', 'legendary', 150, 4, 5, true),
('speedrun', 'Speedrun', 'Completaste un proyecto en menos de 1 hora', 'timer', 'special', 'threshold', '{"threshold": 1}', 'epic', 60, 4, 6, true),
('marathon', 'Maratonista', '10 proyectos en un solo día', 'running', 'special', 'threshold', '{"threshold": 10}', 'legendary', 120, 4, 7, true),
('comeback', 'Regreso Triunfal', 'Volviste después de 30 días inactivo y completaste un proyecto', 'refresh-cw', 'special', 'threshold', '{"threshold": 1}', 'rare', 40, 3, 8, true),
('streak_saver', 'Salvador de Racha', 'Mantuviste tu racha en el último segundo', 'alarm-clock', 'special', 'threshold', '{"threshold": 1}', 'uncommon', 20, 2, 9, true),
('silent_master', 'Maestro Silencioso', '50 proyectos sin recibir un solo mensaje', 'volume-x', 'special', 'threshold', '{"threshold": 50}', 'epic', 80, 4, 10, true),
('jack_of_all', 'Multirol', 'Trabajaste en 3+ roles diferentes', 'layers', 'special', 'threshold', '{"threshold": 3}', 'rare', 40, 3, 11, true),
('first_blood', 'Primera Sangre', 'Primer proyecto de una nueva organización', 'flag', 'special', 'threshold', '{"threshold": 1}', 'uncommon', 15, 2, 12, true),
('hat_trick', 'Hat Trick', '3 proyectos 5 estrellas en un día', 'sparkles', 'special', 'threshold', '{"threshold": 1}', 'epic', 60, 4, 13, true),
('lucky_seven', 'Siete de la Suerte', '7 proyectos completados el día 7', 'dice', 'special', 'threshold', '{"threshold": 1}', 'rare', 35, 3, 14, true),
('the_chosen_one', 'El Elegido', 'Elegido para proyecto especial por un cliente', 'target', 'special', 'threshold', '{"threshold": 1}', 'legendary', 100, 4, 15, true)
ON CONFLICT (key) DO NOTHING;

-- Insertar configuración de puntos por defecto para roles comunes
-- Esto se puede hacer por organización después, pero damos defaults sensatos

-- Crear función helper para inicializar config de org
CREATE OR REPLACE FUNCTION public.initialize_org_points_config(p_organization_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Configuración de roles
  INSERT INTO public.role_points_config (organization_id, role_key, delivery_days, early_delivery_points, on_time_delivery_points, late_delivery_points, clean_approval_bonus, issue_penalty)
  VALUES
    (p_organization_id, 'creator', 3, 70, 50, 0, 10, 10),
    (p_organization_id, 'editor', 2, 70, 50, 0, 15, 15),
    (p_organization_id, 'strategist', 3, 60, 40, 0, 10, 10),
    (p_organization_id, 'trafficker', 2, 60, 40, 0, 10, 10)
  ON CONFLICT (organization_id, role_key) DO NOTHING;

  -- Multiplicadores de nivel
  INSERT INTO public.role_multipliers (organization_id, multiplier_type, multiplier_key, multiplier_value, role_key)
  VALUES
    (p_organization_id, 'level', 'Novato', 1.00, NULL),
    (p_organization_id, 'level', 'Pro', 1.15, NULL),
    (p_organization_id, 'level', 'Elite', 1.25, NULL),
    (p_organization_id, 'level', 'Master', 1.40, NULL),
    (p_organization_id, 'level', 'Legend', 1.60, NULL)
  ON CONFLICT (organization_id, multiplier_type, multiplier_key, role_key) DO NOTHING;

  -- Multiplicadores de complejidad (creadores)
  INSERT INTO public.role_multipliers (organization_id, multiplier_type, multiplier_key, multiplier_value, role_key)
  VALUES
    (p_organization_id, 'complexity', 'standard', 1.00, 'creator'),
    (p_organization_id, 'complexity', 'multi_hook', 1.20, 'creator'),
    (p_organization_id, 'complexity', 'series', 1.30, 'creator'),
    (p_organization_id, 'complexity', 'premium', 1.50, 'creator')
  ON CONFLICT (organization_id, multiplier_type, multiplier_key, role_key) DO NOTHING;

  -- Multiplicadores de complejidad (editores)
  INSERT INTO public.role_multipliers (organization_id, multiplier_type, multiplier_key, multiplier_value, role_key)
  VALUES
    (p_organization_id, 'complexity', 'standard', 1.00, 'editor'),
    (p_organization_id, 'complexity', 'motion', 1.30, 'editor'),
    (p_organization_id, 'complexity', 'color_grade', 1.20, 'editor'),
    (p_organization_id, 'complexity', 'vfx', 1.50, 'editor')
  ON CONFLICT (organization_id, multiplier_type, multiplier_key, role_key) DO NOTHING;

  -- Multiplicadores de cliente
  INSERT INTO public.role_multipliers (organization_id, multiplier_type, multiplier_key, multiplier_value, role_key)
  VALUES
    (p_organization_id, 'client_tier', 'standard', 1.00, NULL),
    (p_organization_id, 'client_tier', 'trusted', 1.10, NULL),
    (p_organization_id, 'client_tier', 'premium', 1.20, NULL),
    (p_organization_id, 'client_tier', 'vip', 1.30, NULL)
  ON CONFLICT (organization_id, multiplier_type, multiplier_key, role_key) DO NOTHING;
END;
$$;
