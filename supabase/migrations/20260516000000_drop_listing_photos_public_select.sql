-- P1.4: Drop the public SELECT policy on storage.objects for listing-photos.
-- The bucket is public, so Supabase serves photo URLs directly via the CDN without
-- needing a SELECT policy. This policy only enabled listing/enumerating bucket
-- contents via the storage API — a privacy leak we don't want.
-- The bucket remains public (file_size_limit and MIME restrictions intact),
-- INSERT/UPDATE/DELETE policies for authenticated users are kept.
DROP POLICY IF EXISTS listing_photos_read ON storage.objects;
