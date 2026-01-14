-- Fix type mismatch: change user_points.current_level from up_level ENUM to TEXT
-- This ensures compatibility with the calculate_up_level function which returns TEXT

-- First drop the old add_user_points function that uses the wrong type
DROP FUNCTION IF EXISTS public.add_user_points(uuid, uuid, point_transaction_type, integer, text);

-- Alter the user_points table to use TEXT instead of up_level ENUM
ALTER TABLE public.user_points 
  ALTER COLUMN current_level DROP DEFAULT,
  ALTER COLUMN current_level TYPE TEXT USING current_level::TEXT,
  ALTER COLUMN current_level SET DEFAULT 'bronze';

-- Recreate the add_user_points function with correct types
CREATE OR REPLACE FUNCTION public.add_user_points(
  _user_id uuid,
  _content_id uuid,
  _transaction_type point_transaction_type,
  _points integer,
  _description text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create user record if doesn't exist
  INSERT INTO public.user_points (user_id, total_points, current_level)
  VALUES (_user_id, 0, 'bronze')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert transaction
  INSERT INTO public.point_transactions (user_id, content_id, transaction_type, points, description)
  VALUES (_user_id, _content_id, _transaction_type, _points, _description);
  
  -- Update total points and level
  UPDATE public.user_points
  SET 
    total_points = GREATEST(0, total_points + _points),
    current_level = public.calculate_up_level(GREATEST(0, total_points + _points)),
    updated_at = now()
  WHERE user_id = _user_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.add_user_points(uuid, uuid, point_transaction_type, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_user_points(uuid, uuid, point_transaction_type, integer, text) TO service_role;