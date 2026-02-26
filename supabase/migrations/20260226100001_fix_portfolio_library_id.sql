-- Fix portfolio video URLs with correct library ID (568434, not 379122)
-- Note: These videos were uploaded to library 568434, not 379122

-- Video 1: 20017a33-4ddb-47bd-88a8-dc5e032840f4
UPDATE portfolio_items
SET
  media_url = 'https://iframe.mediadelivery.net/embed/568434/20017a33-4ddb-47bd-88a8-dc5e032840f4',
  thumbnail_url = 'https://vz-78fcd769-050.b-cdn.net/20017a33-4ddb-47bd-88a8-dc5e032840f4/thumbnail.jpg'
WHERE bunny_video_id = '20017a33-4ddb-47bd-88a8-dc5e032840f4';

-- Video 2: 549c724a-5de4-42d6-b13e-129619c10def
UPDATE portfolio_items
SET
  media_url = 'https://iframe.mediadelivery.net/embed/568434/549c724a-5de4-42d6-b13e-129619c10def',
  thumbnail_url = 'https://vz-78fcd769-050.b-cdn.net/549c724a-5de4-42d6-b13e-129619c10def/thumbnail.jpg'
WHERE bunny_video_id = '549c724a-5de4-42d6-b13e-129619c10def';
