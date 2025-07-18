/*
  # Add File Attachments Support for Messages

  1. Changes
    - Add file-related columns to messages table
    - Create storage bucket for message attachments
    - Add storage policies for secure file access
    - Fix comparison operator in storage policies

  2. Security
    - Maintain existing security rules
    - Enable secure file access
*/

-- Add file-related columns to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS file_url text,
ADD COLUMN IF NOT EXISTS file_type text,
ADD COLUMN IF NOT EXISTS file_name text;

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for message attachments
CREATE POLICY "Users can view message attachments they're involved with"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'message-attachments' AND
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.file_url = (storage.foldername(name))[1]
      AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
    )
  );

CREATE POLICY "Users can upload message attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'message-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own message attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'message-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );