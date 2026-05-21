-- Add creator_type and video_pov to content table
-- These fields define the type of creator who will record the content
-- and the narrative perspective/format of the video script.

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS creator_type TEXT DEFAULT 'ugc',
  ADD COLUMN IF NOT EXISTS video_pov TEXT DEFAULT 'primera_persona';

COMMENT ON COLUMN content.creator_type IS 'Type of creator: ugc, egc, fgc, bgc, pgc, igc, cgc, aigc, ai-ugc, marca-personal';
COMMENT ON COLUMN content.video_pov IS 'Narrative POV format: primera_persona, segunda_persona, testimonial, demo, voz_en_off, entrevista';
