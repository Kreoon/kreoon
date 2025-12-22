-- Enum para tipos de transacciones de puntos
CREATE TYPE public.point_transaction_type AS ENUM (
  'base_completion',      -- +10 UP por completar video
  'early_delivery',       -- +3 UP entrega anticipada
  'late_delivery',        -- -5 UP entrega tardía
  'correction_needed',    -- -3 UP requiere corrección
  'perfect_streak',       -- +10 UP racha perfecta (5 a tiempo)
  'five_star_rating',     -- +2 UP rating 5 estrellas
  'viral_hook',           -- +5 UP hook viral
  'manual_adjustment'     -- Ajuste manual por admin
);

-- Enum para niveles
CREATE TYPE public.up_level AS ENUM (
  'bronze',    -- 0-99 UP
  'silver',    -- 100-249 UP
  'gold',      -- 250-499 UP
  'diamond'    -- 500+ UP
);

-- Tabla de puntos totales por usuario
CREATE TABLE public.user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_points integer NOT NULL DEFAULT 0,
  current_level up_level NOT NULL DEFAULT 'bronze',
  consecutive_on_time integer NOT NULL DEFAULT 0,
  total_completions integer NOT NULL DEFAULT 0,
  total_on_time integer NOT NULL DEFAULT 0,
  total_late integer NOT NULL DEFAULT 0,
  total_corrections integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabla de historial de transacciones
CREATE TABLE public.point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content_id uuid REFERENCES public.content(id) ON DELETE SET NULL,
  transaction_type point_transaction_type NOT NULL,
  points integer NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_points
CREATE POLICY "Users can view all points" ON public.user_points
  FOR SELECT USING (true);

CREATE POLICY "System can manage points" ON public.user_points
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own points" ON public.user_points
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Políticas RLS para point_transactions
CREATE POLICY "Users can view all transactions" ON public.point_transactions
  FOR SELECT USING (true);

CREATE POLICY "System can insert transactions" ON public.point_transactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage transactions" ON public.point_transactions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Índices para mejor rendimiento
CREATE INDEX idx_user_points_user_id ON public.user_points(user_id);
CREATE INDEX idx_user_points_total_points ON public.user_points(total_points DESC);
CREATE INDEX idx_point_transactions_user_id ON public.point_transactions(user_id);
CREATE INDEX idx_point_transactions_content_id ON public.point_transactions(content_id);
CREATE INDEX idx_point_transactions_created_at ON public.point_transactions(created_at DESC);

-- Función para calcular nivel basado en puntos
CREATE OR REPLACE FUNCTION public.calculate_up_level(points integer)
RETURNS up_level
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF points >= 500 THEN
    RETURN 'diamond';
  ELSIF points >= 250 THEN
    RETURN 'gold';
  ELSIF points >= 100 THEN
    RETURN 'silver';
  ELSE
    RETURN 'bronze';
  END IF;
END;
$$;

-- Función para agregar puntos a un usuario
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
  -- Crear registro de usuario si no existe
  INSERT INTO public.user_points (user_id, total_points)
  VALUES (_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insertar transacción
  INSERT INTO public.point_transactions (user_id, content_id, transaction_type, points, description)
  VALUES (_user_id, _content_id, _transaction_type, _points, _description);
  
  -- Actualizar puntos totales y nivel
  UPDATE public.user_points
  SET 
    total_points = GREATEST(0, total_points + _points),
    current_level = public.calculate_up_level(GREATEST(0, total_points + _points)),
    updated_at = now()
  WHERE user_id = _user_id;
END;
$$;

-- Función para verificar y otorgar bono de racha perfecta
CREATE OR REPLACE FUNCTION public.check_perfect_streak(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_streak integer;
BEGIN
  SELECT consecutive_on_time INTO current_streak
  FROM public.user_points
  WHERE user_id = _user_id;
  
  IF current_streak IS NOT NULL AND current_streak >= 5 AND current_streak % 5 = 0 THEN
    -- Otorgar bono de racha perfecta
    PERFORM public.add_user_points(
      _user_id,
      NULL,
      'perfect_streak',
      10,
      'Racha perfecta: ' || current_streak || ' entregas a tiempo consecutivas'
    );
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Trigger para calcular puntos automáticamente cuando cambia el estado del contenido
CREATE OR REPLACE FUNCTION public.auto_calculate_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_on_time boolean;
  target_user_id uuid;
  role_label text;
BEGIN
  -- CREATOR: cuando pasa a 'recorded' (grabó el video)
  IF NEW.status = 'recorded' AND OLD.status != 'recorded' AND NEW.creator_id IS NOT NULL THEN
    target_user_id := NEW.creator_id;
    role_label := 'Creador';
    
    -- Verificar si fue a tiempo
    is_on_time := NEW.deadline IS NULL OR NEW.recorded_at <= NEW.deadline OR now() <= NEW.deadline;
    
    -- Puntos base por completar
    PERFORM public.add_user_points(
      target_user_id,
      NEW.id,
      'base_completion',
      10,
      role_label || ': Video grabado - ' || NEW.title
    );
    
    -- Actualizar contadores
    UPDATE public.user_points
    SET 
      total_completions = total_completions + 1,
      consecutive_on_time = CASE WHEN is_on_time THEN consecutive_on_time + 1 ELSE 0 END,
      total_on_time = CASE WHEN is_on_time THEN total_on_time + 1 ELSE total_on_time END,
      total_late = CASE WHEN NOT is_on_time THEN total_late + 1 ELSE total_late END
    WHERE user_id = target_user_id;
    
    IF is_on_time THEN
      -- Bono por entrega anticipada
      PERFORM public.add_user_points(
        target_user_id,
        NEW.id,
        'early_delivery',
        3,
        role_label || ': Entrega anticipada - ' || NEW.title
      );
      -- Verificar racha perfecta
      PERFORM public.check_perfect_streak(target_user_id);
    ELSE
      -- Penalización por entrega tardía
      PERFORM public.add_user_points(
        target_user_id,
        NEW.id,
        'late_delivery',
        -5,
        role_label || ': Entrega tardía - ' || NEW.title
      );
    END IF;
  END IF;
  
  -- EDITOR: cuando pasa a 'delivered' (entregó el video editado)
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.editor_id IS NOT NULL THEN
    target_user_id := NEW.editor_id;
    role_label := 'Editor';
    
    -- Verificar si fue a tiempo
    is_on_time := NEW.deadline IS NULL OR NEW.delivered_at <= NEW.deadline OR now() <= NEW.deadline;
    
    -- Puntos base por completar
    PERFORM public.add_user_points(
      target_user_id,
      NEW.id,
      'base_completion',
      10,
      role_label || ': Video entregado - ' || NEW.title
    );
    
    -- Actualizar contadores
    UPDATE public.user_points
    SET 
      total_completions = total_completions + 1,
      consecutive_on_time = CASE WHEN is_on_time THEN consecutive_on_time + 1 ELSE 0 END,
      total_on_time = CASE WHEN is_on_time THEN total_on_time + 1 ELSE total_on_time END,
      total_late = CASE WHEN NOT is_on_time THEN total_late + 1 ELSE total_late END
    WHERE user_id = target_user_id;
    
    IF is_on_time THEN
      -- Bono por entrega anticipada
      PERFORM public.add_user_points(
        target_user_id,
        NEW.id,
        'early_delivery',
        3,
        role_label || ': Entrega anticipada - ' || NEW.title
      );
      -- Verificar racha perfecta
      PERFORM public.check_perfect_streak(target_user_id);
    ELSE
      -- Penalización por entrega tardía
      PERFORM public.add_user_points(
        target_user_id,
        NEW.id,
        'late_delivery',
        -5,
        role_label || ': Entrega tardía - ' || NEW.title
      );
    END IF;
  END IF;
  
  -- Penalización por corrección necesaria (status = 'issue')
  IF NEW.status = 'issue' AND OLD.status != 'issue' THEN
    -- Penalizar al editor si hay uno asignado
    IF NEW.editor_id IS NOT NULL THEN
      PERFORM public.add_user_points(
        NEW.editor_id,
        NEW.id,
        'correction_needed',
        -3,
        'Editor: Corrección requerida - ' || NEW.title
      );
      
      UPDATE public.user_points
      SET 
        total_corrections = total_corrections + 1,
        consecutive_on_time = 0
      WHERE user_id = NEW.editor_id;
    END IF;
  END IF;
  
  -- Bono por aprobación (5 estrellas implícito cuando se aprueba)
  IF NEW.status = 'approved' AND OLD.status = 'review' THEN
    -- Bono para editor
    IF NEW.editor_id IS NOT NULL THEN
      PERFORM public.add_user_points(
        NEW.editor_id,
        NEW.id,
        'five_star_rating',
        2,
        'Editor: Aprobado sin correcciones - ' || NEW.title
      );
    END IF;
    -- Bono para creador
    IF NEW.creator_id IS NOT NULL THEN
      PERFORM public.add_user_points(
        NEW.creator_id,
        NEW.id,
        'five_star_rating',
        2,
        'Creador: Contenido aprobado - ' || NEW.title
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear el trigger
CREATE TRIGGER trigger_auto_calculate_points
  AFTER UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_calculate_points();

-- Habilitar realtime para ver actualizaciones en vivo
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_points;
ALTER PUBLICATION supabase_realtime ADD TABLE public.point_transactions;