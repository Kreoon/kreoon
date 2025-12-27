-- Add sequence_number column to content table
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS sequence_number TEXT UNIQUE;

-- Create function to generate next sequence number
CREATE OR REPLACE FUNCTION public.generate_content_sequence_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  formatted_number TEXT;
BEGIN
  -- Get the next sequence number
  SELECT COALESCE(MAX(
    CASE 
      WHEN sequence_number ~ '^V-[0-9]+$' 
      THEN CAST(SUBSTRING(sequence_number FROM 3) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM public.content
  WHERE organization_id = NEW.organization_id;
  
  -- Format as V-00001
  formatted_number := 'V-' || LPAD(next_number::TEXT, 5, '0');
  
  NEW.sequence_number := formatted_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate sequence number on insert
DROP TRIGGER IF EXISTS trigger_generate_sequence_number ON public.content;
CREATE TRIGGER trigger_generate_sequence_number
  BEFORE INSERT ON public.content
  FOR EACH ROW
  WHEN (NEW.sequence_number IS NULL)
  EXECUTE FUNCTION public.generate_content_sequence_number();

-- Update existing content with sequence numbers (per organization)
WITH numbered_content AS (
  SELECT 
    id,
    organization_id,
    ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY created_at) as row_num
  FROM public.content
  WHERE sequence_number IS NULL
)
UPDATE public.content c
SET sequence_number = 'V-' || LPAD(nc.row_num::TEXT, 5, '0')
FROM numbered_content nc
WHERE c.id = nc.id;