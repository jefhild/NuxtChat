-- Add is_private flag for profiles to support sitemap and crawler exclusion
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;
