/*
  # Fix Storage Policies

  1. Changes
    - Drop existing storage policies before recreating
    - Use IF NOT EXISTS for bucket creation
    - Ensure unique policy names

  2. Security
    - Maintain existing security rules
    - Ensure proper access control
*/

-- Drop existing storage policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Project images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own project images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own project images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own project images" ON storage.objects;

-- Create buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create unified storage policies with unique names
CREATE POLICY "Public read access for avatars and project images"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('avatars', 'project-images'));

CREATE POLICY "Users can upload their own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]) OR
    (bucket_id = 'project-images' AND auth.uid()::text = (storage.foldername(name))[1])
  );

CREATE POLICY "Users can update their own files"
  ON storage.objects FOR UPDATE
  USING (
    (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]) OR
    (bucket_id = 'project-images' AND auth.uid()::text = (storage.foldername(name))[1])
  );

CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  USING (
    (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]) OR
    (bucket_id = 'project-images' AND auth.uid()::text = (storage.foldername(name))[1])
  );