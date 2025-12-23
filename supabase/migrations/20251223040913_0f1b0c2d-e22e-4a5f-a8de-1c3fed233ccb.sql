
-- Create medieval achievements table
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'shield',
  category TEXT NOT NULL DEFAULT 'general',
  points_required INTEGER DEFAULT NULL,
  condition_type TEXT NOT NULL,
  condition_value INTEGER NOT NULL DEFAULT 1,
  rarity TEXT NOT NULL DEFAULT 'common',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user achievements junction table
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS policies for achievements
CREATE POLICY "Anyone can view achievements" ON public.achievements
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage achievements" ON public.achievements
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for user_achievements
CREATE POLICY "Users can view all user achievements" ON public.user_achievements
  FOR SELECT USING (true);

CREATE POLICY "System can insert user achievements" ON public.user_achievements
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage user achievements" ON public.user_achievements
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert medieval achievements
INSERT INTO public.achievements (key, name, description, icon, category, condition_type, condition_value, rarity) VALUES
-- Logros de completado
('first_blood', 'Primera Sangre', 'Completa tu primer contenido en batalla', 'sword', 'completion', 'completions', 1, 'common'),
('squire_trial', 'Prueba del Escudero', 'Completa 5 contenidos como un verdadero escudero', 'shield', 'completion', 'completions', 5, 'common'),
('knight_valor', 'Valor del Caballero', 'Completa 25 contenidos con honor', 'swords', 'completion', 'completions', 25, 'uncommon'),
('commander_might', 'Poder del Comandante', 'Completa 50 contenidos liderando la orden', 'castle', 'completion', 'completions', 50, 'rare'),
('grand_master_legacy', 'Legado del Gran Maestre', 'Completa 100 contenidos y forja tu leyenda', 'crown', 'completion', 'completions', 100, 'legendary'),

-- Logros de puntualidad
('swift_messenger', 'Mensajero Veloz', 'Entrega 3 contenidos antes de tiempo', 'zap', 'punctuality', 'early_deliveries', 3, 'common'),
('royal_courier', 'Correo Real', 'Entrega 10 contenidos antes de tiempo', 'send', 'punctuality', 'early_deliveries', 10, 'uncommon'),
('time_keeper', 'Guardián del Tiempo', 'Entrega 25 contenidos antes de tiempo', 'clock', 'punctuality', 'early_deliveries', 25, 'rare'),

-- Logros de racha
('battle_streak_3', 'Racha de Batalla', 'Mantén una racha de 3 entregas a tiempo', 'flame', 'streak', 'consecutive', 3, 'common'),
('warrior_streak_5', 'Racha del Guerrero', 'Mantén una racha de 5 entregas a tiempo', 'flame', 'streak', 'consecutive', 5, 'uncommon'),
('champion_streak_10', 'Racha del Campeón', 'Mantén una racha de 10 entregas a tiempo', 'flame', 'streak', 'consecutive', 10, 'rare'),
('legendary_streak_20', 'Racha Legendaria', 'Mantén una racha de 20 entregas a tiempo', 'flame', 'streak', 'consecutive', 20, 'legendary'),

-- Logros de puntos
('bronze_hoard', 'Tesoro de Bronce', 'Acumula 100 puntos de gloria', 'coins', 'points', 'total_points', 100, 'common'),
('silver_fortune', 'Fortuna de Plata', 'Acumula 250 puntos de gloria', 'coins', 'points', 'total_points', 250, 'uncommon'),
('golden_treasury', 'Tesoro Dorado', 'Acumula 500 puntos de gloria', 'coins', 'points', 'total_points', 500, 'rare'),
('diamond_vault', 'Bóveda de Diamante', 'Acumula 1000 puntos de gloria', 'gem', 'points', 'total_points', 1000, 'legendary'),

-- Logros especiales
('tournament_champion', 'Campeón del Torneo', 'Alcanza el primer lugar en el ranking', 'trophy', 'special', 'rank', 1, 'legendary'),
('realm_defender', 'Defensor del Reino', 'Completa 10 contenidos sin correcciones', 'shield', 'special', 'perfect_completions', 10, 'rare'),
('order_veteran', 'Veterano de la Orden', 'Sé miembro activo por 30 días', 'medal', 'special', 'days_active', 30, 'uncommon'),
('crusader', 'Cruzado', 'Completa contenido en 7 días consecutivos', 'cross', 'special', 'daily_streak', 7, 'rare'),
('kings_favor', 'Favor del Rey', 'Recibe 5 calificaciones de 5 estrellas', 'star', 'special', 'five_star_ratings', 5, 'rare'),

-- Logros de nivel
('promoted_silver', 'Ascenso a Plata', 'Alcanza el rango de Caballero (Plata)', 'chevron-up', 'level', 'level_reached', 2, 'uncommon'),
('promoted_gold', 'Ascenso a Oro', 'Alcanza el rango de Comandante (Oro)', 'chevron-up', 'level', 'level_reached', 3, 'rare'),
('promoted_diamond', 'Ascenso a Diamante', 'Alcanza el rango de Gran Maestre (Diamante)', 'chevron-up', 'level', 'level_reached', 4, 'legendary');

-- Enable realtime for user_achievements
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_achievements;
