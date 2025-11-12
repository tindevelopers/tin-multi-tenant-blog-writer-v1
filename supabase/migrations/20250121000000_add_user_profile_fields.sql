-- Add phone and bio fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.phone IS 'User phone number';
COMMENT ON COLUMN users.bio IS 'User biography/bio text';

