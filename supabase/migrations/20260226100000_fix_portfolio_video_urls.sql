-- Fix portfolio video URLs that used incorrect cdn.kreoon.com domain
-- These videos exist in Bunny but had wrong CDN URLs

-- Video 1: 20017a33-4ddb-47bd-88a8-dc5e032840f4
UPDATE portfolio_items
SET 
  media_url = 'https://iframe.mediadelivery.net/embed/379122/20017a33-4ddb-47bd-88a8-dc5e032840f4',
  thumbnail_url = 'https://vz-78fcd769-050.b-cdn.net/20017a33-4ddb-47bd-88a8-dc5e032840f4/thumbnail.jpg'
WHERE bunny_video_id = '20017a33-4ddb-47bd-88a8-dc5e032840f4';

-- Video 2: 549c724a-5de4-42d6-b13e-129619c10def
UPDATE portfolio_items
SET 
  media_url = 'https://iframe.mediadelivery.net/embed/379122/549c724a-5de4-42d6-b13e-129619c10def',
  thumbnail_url = 'https://vz-78fcd769-050.b-cdn.net/549c724a-5de4-42d6-b13e-129619c10def/thumbnail.jpg'
WHERE bunny_video_id = '549c724a-5de4-42d6-b13e-129619c10def';

-- Also fix any other portfolio items that use cdn.kreoon.com
UPDATE portfolio_items
SET 
  media_url = REPLACE(
    REPLACE(media_url, 'https://cdn.kreoon.com/', 'https://iframe.mediadelivery.net/embed/379122/'),
    '/play_720p.mp4', ''
  ),
  thumbnail_url = REPLACE(thumbnail_url, 'cdn.kreoon.com', 'vz-78fcd769-050.b-cdn.net')
WHERE media_url LIKE '%cdn.kreoon.com%';

-- Fix marketplace_media table as well
UPDATE marketplace_media
SET 
  file_url = REPLACE(
    REPLACE(file_url, 'https://cdn.kreoon.com/', 'https://iframe.mediadelivery.net/embed/379122/'),
    '/play_720p.mp4', ''
  ),
  cdn_url = REPLACE(cdn_url, 'cdn.kreoon.com', 'vz-78fcd769-050.b-cdn.net'),
  thumbnail_url = REPLACE(thumbnail_url, 'cdn.kreoon.com', 'vz-78fcd769-050.b-cdn.net')
WHERE file_url LIKE '%cdn.kreoon.com%' OR cdn_url LIKE '%cdn.kreoon.com%';
