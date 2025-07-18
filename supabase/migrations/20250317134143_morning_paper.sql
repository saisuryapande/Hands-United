/*
  # Fix Notifications RLS Policies

  1. Changes
    - Add INSERT policy for notifications
    - Fix notification creation permissions
    - Allow users to create notifications for other users

  2. Security
    - Enable RLS
    - Add policy for notification creation
*/

-- Drop existing notification policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- Create updated notification policies
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create notifications for anyone"
  ON notifications
  FOR INSERT
  WITH CHECK (
    -- Allow users to create notifications if:
    -- 1. They are creating it for themselves OR
    -- 2. They are creating it for someone they have a connection with OR
    -- 3. They are creating it for someone they have a skill request with
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_connections
      WHERE (follower_id = auth.uid() AND following_id = user_id)
         OR (follower_id = user_id AND following_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM skill_requests
      WHERE (from_user_id = auth.uid() AND to_user_id = user_id)
         OR (from_user_id = user_id AND to_user_id = auth.uid())
    )
  );

-- Ensure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;