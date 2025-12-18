-- Crear enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'creator', 'editor', 'client');

-- Crear enum para estado de contenido
CREATE TYPE public.content_status AS ENUM ('draft', 'script_pending', 'script_approved', 'recording', 'editing', 'review', 'approved', 'rejected', 'paid');

-- Tabla de perfiles de usuario
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  is_ambassador BOOLEAN DEFAULT FALSE,
  portfolio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de roles de usuario
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Tabla de clientes (empresas/marcas)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  logo_url TEXT,
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de contenido/proyectos
CREATE TABLE public.content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  editor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status content_status DEFAULT 'draft',
  is_ambassador_content BOOLEAN DEFAULT FALSE,
  script TEXT,
  script_approved_at TIMESTAMPTZ,
  script_approved_by UUID REFERENCES auth.users(id),
  video_url TEXT,
  thumbnail_url TEXT,
  deadline TIMESTAMPTZ,
  creator_payment DECIMAL(10,2) DEFAULT 0,
  editor_payment DECIMAL(10,2) DEFAULT 0,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de comentarios/feedback
CREATE TABLE public.content_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de historial de estados
CREATE TABLE public.content_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  old_status content_status,
  new_status content_status NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de pagos
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content_id UUID REFERENCES public.content(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('creator', 'editor')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cliente especial UGC Colombia
INSERT INTO public.clients (id, name, contact_email, notes) 
VALUES ('00000000-0000-0000-0000-000000000001', 'UGC Colombia', 'contacto@ugccolombia.com', 'Cliente interno para contenido de embajadores');

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Función para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Función para obtener roles del usuario
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS app_role[]
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY_AGG(role) FROM public.user_roles WHERE user_id = _user_id
$$;

-- Políticas para profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Políticas para user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para clients
CREATE POLICY "Authenticated can view clients" ON public.clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage clients" ON public.clients
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view their own data" ON public.clients
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Políticas para content
CREATE POLICY "Admins can do everything with content" ON public.content
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Creators can view assigned content" ON public.content
  FOR SELECT TO authenticated USING (creator_id = auth.uid());

CREATE POLICY "Creators can update assigned content" ON public.content
  FOR UPDATE TO authenticated USING (creator_id = auth.uid());

CREATE POLICY "Editors can view assigned content" ON public.content
  FOR SELECT TO authenticated USING (editor_id = auth.uid());

CREATE POLICY "Editors can update assigned content" ON public.content
  FOR UPDATE TO authenticated USING (editor_id = auth.uid());

CREATE POLICY "Clients can view their content" ON public.content
  FOR SELECT TO authenticated USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

CREATE POLICY "Clients can update status of their content" ON public.content
  FOR UPDATE TO authenticated USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

-- Políticas para comments
CREATE POLICY "Users can view comments on their content" ON public.content_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can add comments" ON public.content_comments
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Políticas para history
CREATE POLICY "Users can view history" ON public.content_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert history" ON public.content_history
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Políticas para payments
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage payments" ON public.payments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON public.content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger para registrar cambios de estado
CREATE OR REPLACE FUNCTION public.log_content_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.content_history (content_id, user_id, old_status, new_status)
    VALUES (NEW.id, auth.uid(), OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_content_status_change
  AFTER UPDATE ON public.content
  FOR EACH ROW EXECUTE FUNCTION public.log_content_status_change();