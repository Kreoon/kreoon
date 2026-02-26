-- Fix corrupted image URLs in portfolio_items
-- The previous migration incorrectly converted image CDN URLs to iframe embed URLs
-- Images should use cdn.kreoon.com (the custom CDN domain that works)

-- Fix portfolio_items images: convert iframe.mediadelivery.net back to cdn.kreoon.com
UPDATE portfolio_items
SET media_url = REPLACE(
  media_url,
  'https://iframe.mediadelivery.net/embed/379122/',
  'https://cdn.kreoon.com/'
)
WHERE media_type = 'image'
  AND media_url LIKE '%iframe.mediadelivery.net/embed/379122/marketplace/%';

-- Also fix any images that might have been converted with library 568434
UPDATE portfolio_items
SET media_url = REPLACE(
  media_url,
  'https://iframe.mediadelivery.net/embed/568434/',
  'https://cdn.kreoon.com/'
)
WHERE media_type = 'image'
  AND media_url LIKE '%iframe.mediadelivery.net/embed/568434/marketplace/%';

-- Fix thumbnail_url if it also has issues (restore to cdn.kreoon.com)
UPDATE portfolio_items
SET thumbnail_url = REPLACE(
  thumbnail_url,
  'https://vz-78fcd769-050.b-cdn.net/',
  'https://cdn.kreoon.com/'
)
WHERE media_type = 'image'
  AND thumbnail_url LIKE '%vz-78fcd769-050.b-cdn.net/marketplace/%';

-- Fix marketplace_media images if any
UPDATE marketplace_media
SET file_url = REPLACE(
  file_url,
  'https://iframe.mediadelivery.net/embed/379122/',
  'https://cdn.kreoon.com/'
)
WHERE file_type = 'image'
  AND file_url LIKE '%iframe.mediadelivery.net/embed/379122/marketplace/%';

UPDATE marketplace_media
SET file_url = REPLACE(
  file_url,
  'https://iframe.mediadelivery.net/embed/568434/',
  'https://cdn.kreoon.com/'
)
WHERE file_type = 'image'
  AND file_url LIKE '%iframe.mediadelivery.net/embed/568434/marketplace/%';
