/*
  # Add Messages Table and Policies

  1. New Tables
    - messages
      - id (uuid, primary key)
      - sender_id (uuid, references profiles)
      - receiver_id (uuid, references profiles)
      - content (text)
      - created_at (timestamptz)
      - updated_at (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for message access
    - Only allow messaging between connected users
*/

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Create policies
CREATE POLICY "Users can view their own messages"
  ON messages
  FOR SELECT
  USING (
    auth.uid() IN (sender_id, receiver_id) AND
    EXISTS (
      SELECT 1 FROM user_connections
      WHERE status = 'approved' AND
      ((follower_id = auth.uid() AND following_id = CASE 
        WHEN auth.uid() = messages.sender_id THEN messages.receiver_id
        ELSE messages.sender_id
      END) OR
      (following_id = auth.uid() AND follower_id = CASE
        WHEN auth.uid() = messages.sender_id THEN messages.receiver_id
        ELSE messages.sender_id
      END))
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
      ((follower_id = auth.uid() AND following_id = receiver_id) OR
       (following_id = auth.uid() AND follower_id = receiver_id))
    )
  );

CREATE POLICY "Users can delete their own messages"
  ON messages
  FOR DELETE
  USING (auth.uid() = sender_id);