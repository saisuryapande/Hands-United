/*
  # Fix Messages Table for Realtime Updates

  1. Changes
    - Drop and recreate realtime publication
    - Update table configuration
    - Ensure proper channel setup

  2. Security
    - Maintain existing security rules
*/

-- Drop existing publication if it exists
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Create new publication with messages table
CREATE PUBLICATION supabase_realtime FOR TABLE messages;

-- Ensure messages table is properly configured for realtime
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Ensure RLS is enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages to connected users" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Create updated policies
CREATE POLICY "Users can view their own messages"
  ON messages
  FOR SELECT
  USING (
    auth.uid() IN (sender_id, receiver_id) AND
    EXISTS (
      SELECT 1 FROM user_connections
      WHERE status = 'approved' AND
      (
        (follower_id = auth.uid() AND following_id = CASE 
          WHEN auth.uid() = messages.sender_id THEN messages.receiver_id
          ELSE messages.sender_id
        END) OR
        (following_id = auth.uid() AND follower_id = CASE
          WHEN auth.uid() = messages.sender_id THEN messages.receiver_id
          ELSE messages.sender_id
        END)
      )
    )
  );

CREATE POLICY "Users can send messages to connected users"
  ON messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM user_connections
      WHERE status = 'approved' AND
      (
        (follower_id = auth.uid() AND following_id = receiver_id) OR
        (following_id = auth.uid() AND follower_id = receiver_id)
      )
    )
  );

CREATE POLICY "Users can delete their own messages"
  ON messages
  FOR DELETE
  USING (auth.uid() = sender_id);