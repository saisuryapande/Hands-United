/*
  # Update Project Policies

  1. Changes
    - Update project table policies only
    - Remove duplicate storage policies
    - Maintain project management security

  2. Security
    - Ensure proper access control for projects
    - Maintain existing security rules
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