/*
  # Update Skill Requests Status Options

  1. Changes
    - Add 'discontinued' as a valid status for skill_requests
    - Update the check constraint

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing check constraint
ALTER TABLE skill_requests 
DROP CONSTRAINT IF EXISTS skill_requests_status_check;

-- Add updated check constraint with 'discontinued' status
ALTER TABLE skill_requests
ADD CONSTRAINT skill_requests_status_check
CHECK (status IN ('pending', 'approved', 'rejected', 'discontinued'));