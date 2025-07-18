/*
  # Fix Project RLS Policies and Storage Access

  1. Changes
    - Update RLS policies for user_projects table
    - Add storage bucket and policies for project images
    - Fix project update permissions

  2. Security
    - Maintain security while allowing proper project management
    - Enable secure project image uploads
*/

-- Drop existing project policies
DROP POLICY IF EXISTS "Projects are viewable by everyone" ON user_projects;
DROP POLICY IF EXISTS "Users can manage their own projects" ON user_projects;

-- Create updated project policies
CREATE POLICY "Projects are viewable by everyone"
  ON user_projects
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own projects"
  ON user_projects
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable storage access for project images
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for project images bucket
CREATE POLICY "Project images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-images');

CREATE POLICY "Users can upload their own project images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own project images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own project images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );