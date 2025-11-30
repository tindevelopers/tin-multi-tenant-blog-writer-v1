-- Fix file_type format for existing media assets
-- Convert format-only values (png, jpg) to MIME types (image/png, image/jpeg)
-- This ensures images are properly recognized by the frontend

-- Update image formats to MIME types
UPDATE media_assets
SET file_type = CASE 
  WHEN file_type = 'png' THEN 'image/png'
  WHEN file_type = 'jpg' THEN 'image/jpeg'
  WHEN file_type = 'jpeg' THEN 'image/jpeg'
  WHEN file_type = 'gif' THEN 'image/gif'
  WHEN file_type = 'webp' THEN 'image/webp'
  WHEN file_type = 'svg' THEN 'image/svg+xml'
  WHEN file_type = 'bmp' THEN 'image/bmp'
  WHEN file_type = 'ico' THEN 'image/x-icon'
  WHEN file_type = 'tiff' THEN 'image/tiff'
  WHEN file_type = 'tif' THEN 'image/tiff'
  ELSE file_type
END
WHERE file_type NOT LIKE 'image/%' 
  AND file_type NOT LIKE 'video/%'
  AND file_type NOT LIKE 'audio/%'
  AND file_type NOT LIKE 'application/%'
  AND file_type NOT LIKE 'text/%'
  AND provider = 'cloudinary';

-- Also try to get format from metadata if file_type is still not a MIME type
UPDATE media_assets
SET file_type = CASE 
  WHEN metadata->>'format' = 'png' THEN 'image/png'
  WHEN metadata->>'format' = 'jpg' THEN 'image/jpeg'
  WHEN metadata->>'format' = 'jpeg' THEN 'image/jpeg'
  WHEN metadata->>'format' = 'gif' THEN 'image/gif'
  WHEN metadata->>'format' = 'webp' THEN 'image/webp'
  WHEN metadata->>'format' = 'svg' THEN 'image/svg+xml'
  WHEN metadata->>'format' = 'bmp' THEN 'image/bmp'
  WHEN metadata->>'format' = 'ico' THEN 'image/x-icon'
  WHEN metadata->>'format' = 'tiff' THEN 'image/tiff'
  WHEN metadata->>'format' = 'tif' THEN 'image/tiff'
  ELSE file_type
END
WHERE file_type NOT LIKE 'image/%' 
  AND file_type NOT LIKE 'video/%'
  AND file_type NOT LIKE 'audio/%'
  AND file_type NOT LIKE 'application/%'
  AND file_type NOT LIKE 'text/%'
  AND provider = 'cloudinary'
  AND metadata->>'format' IS NOT NULL;

-- Log how many records were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % media assets with corrected file_type format', updated_count;
END $$;

