/*
  # Fix Support Requests Schema

  1. Changes
    - Drop and recreate support_requests table with all required fields
    - Recreate RLS policies
    - Ensure all columns are properly defined

  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- Drop existing table and policies
DROP TABLE IF EXISTS support_requests CASCADE;

-- Recreate support_requests table with all fields
CREATE TABLE support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'in_progress', 'resolved')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own support requests"
  ON support_requests
  FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ));

CREATE POLICY "Users can create support requests"
  ON support_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only admins can update support requests"
  ON support_requests
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ));

-- Create updated_at trigger
CREATE TRIGGER update_support_requests_updated_at
  BEFORE UPDATE ON support_requests
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();