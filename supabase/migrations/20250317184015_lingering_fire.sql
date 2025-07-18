/*
  # Update Support Requests Table

  1. Changes
    - Add name, email, and phone fields to support_requests table
    - Update RLS policies
*/

-- Add new columns to support_requests table
ALTER TABLE support_requests
ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '';

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own support requests" ON support_requests;
DROP POLICY IF EXISTS "Users can create support requests" ON support_requests;
DROP POLICY IF EXISTS "Only admins can update support requests" ON support_requests;

-- Create updated policies
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

-- Ensure RLS is enabled
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;