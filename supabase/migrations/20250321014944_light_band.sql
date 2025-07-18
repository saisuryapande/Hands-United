/*
  # Add Read Status to Messages

  1. Changes
    - Add read column to messages table
    - Set default value to false
    - Update existing messages to have read status

  2. Security
    - Maintain existing RLS policies
*/

-- Add read column to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS read boolean DEFAULT false;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS messages_read_idx 
ON messages(read);