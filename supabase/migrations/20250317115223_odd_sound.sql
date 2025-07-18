/*
  # Fix RLS Policies for Profiles

  1. Changes
    - Update RLS policies for profiles table to allow profile creation and updates
    - Add policy for inserting new profiles
    - Modify update policy to be more permissive during profile setup

  2. Security
    - Maintain security while allowing proper profile creation
    - Ensure users can only modify their own profiles
*/

-- Drop existing RLS policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new RLS policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;