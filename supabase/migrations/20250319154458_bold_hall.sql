/*
  # Add Session Management RLS Policies

  1. Changes
    - Verify and create RLS policies for sessions table
    - Add policies for viewing and managing sessions
    - Ensure proper access control for teachers and students

  2. Security
    - Enable RLS on sessions table
    - Allow users to view and manage sessions they're involved in
    - Maintain data privacy and security
*/

-- First, ensure RLS is enabled
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view sessions they're involved in" ON sessions;
DROP POLICY IF EXISTS "Users can manage sessions they're involved in" ON sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can manage all sessions" ON sessions;

-- Create policy for viewing sessions
CREATE POLICY "Users can view sessions they're involved in"
  ON sessions
  FOR SELECT
  USING (
    auth.uid() IN (teacher_id, student_id) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Create policy for managing sessions (insert, update, delete)
CREATE POLICY "Users can manage sessions they're involved in"
  ON sessions
  FOR ALL
  USING (
    auth.uid() IN (teacher_id, student_id) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  )
  WITH CHECK (
    auth.uid() IN (teacher_id, student_id) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );