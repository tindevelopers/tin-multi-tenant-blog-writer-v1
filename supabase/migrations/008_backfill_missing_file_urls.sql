-- Backfill missing file_url values from metadata
-- Some media assets may have been created before file_url was properly saved
-- This migration attempts to reconstruct file_url from metadata.public_id

-- First, try to get secure_url from metadata
UPDATE media_assets
SET file_url = metadata->>'secure_url'
WHERE file_url IS NULL 
  AND metadata->>'secure_url' IS NOT NULL
  AND provider = 'cloudinary';

-- If secure_url is not in metadata, try to reconstruct from public_id
-- Note: This requires the cloud_name from organization settings
UPDATE media_assets
SET file_url = CONCAT(
  'https://res.cloudinary.com/',
  (SELECT settings->'cloudinary'->>'cloud_name' FROM organizations WHERE org_id = media_assets.org_id LIMIT 1),
  '/image/upload/',
  metadata->>'public_id',
  CASE 
    WHEN metadata->>'format' IS NOT NULL THEN CONCAT('.', metadata->>'format')
    ELSE ''
  END
)
WHERE file_url IS NULL 
  AND metadata->>'public_id' IS NOT NULL
  AND provider = 'cloudinary'
  AND EXISTS (
    SELECT 1 FROM organizations 
    WHERE org_id = media_assets.org_id 
    AND settings->'cloudinary'->>'cloud_name' IS NOT NULL
  );

-- Log how many records were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % media assets with missing file_url', updated_count;
END $$;

