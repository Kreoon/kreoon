
-- Function to check and award achievements for a user
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_stats RECORD;
  achievement RECORD;
  already_has boolean;
BEGIN
  -- Get user stats
  SELECT 
    COALESCE(up.total_points, 0) as total_points,
    COALESCE(up.total_completions, 0) as total_completions,
    COALESCE(up.total_on_time, 0) as total_on_time,
    COALESCE(up.consecutive_on_time, 0) as consecutive_on_time,
    COALESCE(up.current_level, 'bronze') as current_level,
    EXTRACT(DAY FROM (now() - p.created_at))::integer as days_active
  INTO user_stats
  FROM profiles p
  LEFT JOIN user_points up ON up.user_id = p.id
  WHERE p.id = _user_id;

  -- Loop through all achievements and check conditions
  FOR achievement IN SELECT * FROM achievements LOOP
    -- Check if user already has this achievement
    SELECT EXISTS(
      SELECT 1 FROM user_achievements 
      WHERE user_id = _user_id AND achievement_id = achievement.id
    ) INTO already_has;
    
    IF NOT already_has THEN
      -- Check condition based on type
      CASE achievement.condition_type
        WHEN 'completions' THEN
          IF user_stats.total_completions >= achievement.condition_value THEN
            INSERT INTO user_achievements (user_id, achievement_id) VALUES (_user_id, achievement.id);
          END IF;
        
        WHEN 'early_deliveries' THEN
          IF user_stats.total_on_time >= achievement.condition_value THEN
            INSERT INTO user_achievements (user_id, achievement_id) VALUES (_user_id, achievement.id);
          END IF;
        
        WHEN 'consecutive' THEN
          IF user_stats.consecutive_on_time >= achievement.condition_value THEN
            INSERT INTO user_achievements (user_id, achievement_id) VALUES (_user_id, achievement.id);
          END IF;
        
        WHEN 'total_points' THEN
          IF user_stats.total_points >= achievement.condition_value THEN
            INSERT INTO user_achievements (user_id, achievement_id) VALUES (_user_id, achievement.id);
          END IF;
        
        WHEN 'days_active' THEN
          IF user_stats.days_active >= achievement.condition_value THEN
            INSERT INTO user_achievements (user_id, achievement_id) VALUES (_user_id, achievement.id);
          END IF;
        
        WHEN 'level_reached' THEN
          IF (achievement.condition_value = 2 AND user_stats.current_level IN ('silver', 'gold', 'diamond')) OR
             (achievement.condition_value = 3 AND user_stats.current_level IN ('gold', 'diamond')) OR
             (achievement.condition_value = 4 AND user_stats.current_level = 'diamond') THEN
            INSERT INTO user_achievements (user_id, achievement_id) VALUES (_user_id, achievement.id);
          END IF;
        
        WHEN 'rank' THEN
          -- Check if user is #1 in ranking
          IF EXISTS (
            SELECT 1 FROM user_points 
            WHERE user_id = _user_id 
            AND total_points = (SELECT MAX(total_points) FROM user_points)
          ) THEN
            INSERT INTO user_achievements (user_id, achievement_id) VALUES (_user_id, achievement.id);
          END IF;
        
        ELSE
          NULL; -- Skip unknown condition types
      END CASE;
    END IF;
  END LOOP;
END;
$$;

-- Trigger function to check achievements after point changes
CREATE OR REPLACE FUNCTION public.trigger_check_achievements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.check_and_award_achievements(NEW.user_id);
  RETURN NEW;
END;
$$;

-- Create trigger on user_points updates
DROP TRIGGER IF EXISTS check_achievements_on_points_update ON user_points;
CREATE TRIGGER check_achievements_on_points_update
  AFTER INSERT OR UPDATE ON user_points
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_achievements();

-- Also trigger on point_transactions insert
DROP TRIGGER IF EXISTS check_achievements_on_transaction ON point_transactions;
CREATE TRIGGER check_achievements_on_transaction
  AFTER INSERT ON point_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_achievements();
