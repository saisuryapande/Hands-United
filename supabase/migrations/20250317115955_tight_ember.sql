/*
  # Fix Skill Deletion Function

  1. Changes
    - Update delete_skill function to properly handle skill deletion
    - Fix ambiguous column reference

  2. Security
    - Maintain admin-only access
    - Ensure proper cascading deletion
*/

-- Drop existing function
DROP FUNCTION IF EXISTS delete_skill;

-- Create updated function
CREATE OR REPLACE FUNCTION delete_skill(target_skill_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can delete skills';
  END IF;

  -- Delete related records
  DELETE FROM user_skills WHERE skill_id = target_skill_id;
  DELETE FROM skill_requests WHERE skill_id = target_skill_id;
  DELETE FROM sessions WHERE skill_id = target_skill_id;
  DELETE FROM skills WHERE id = target_skill_id;
END;
$$;