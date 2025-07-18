/*
  # Update Profiles Table Date of Birth

  1. Changes
    - Remove age column (if exists)
    - Add date_of_birth column (if not exists)
    - Drop existing minimum_age_check constraint if it exists
    - Add updated minimum_age_check constraint
    - Create/update calculate_age function

  2. Security
    - Maintain existing RLS policies
    - Ensure minimum age requirement
*/

-- Remove age column and add date_of_birth
ALTER TABLE profiles 
DROP COLUMN IF EXISTS age,
ADD COLUMN IF NOT EXISTS date_of_birth date;

-- Drop existing constraint if it exists
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS minimum_age_check;

-- Add check constraint for minimum age
ALTER TABLE profiles
ADD CONSTRAINT minimum_age_check
CHECK (
  date_of_birth IS NULL OR 
  date_of_birth <= CURRENT_DATE - INTERVAL '13 years'
);

-- Create or replace function to calculate age
CREATE OR REPLACE FUNCTION calculate_age(birth_date date)
RETURNS integer AS $$
BEGIN
  RETURN date_part('year', age(birth_date));
END;
$$ LANGUAGE plpgsql;