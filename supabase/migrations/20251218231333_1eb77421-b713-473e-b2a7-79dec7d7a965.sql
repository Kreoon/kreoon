-- Solo agregar la FK de strategist que es la única nueva
ALTER TABLE public.content
ADD CONSTRAINT content_strategist_id_fkey 
  FOREIGN KEY (strategist_id) REFERENCES public.profiles(id) ON DELETE SET NULL;