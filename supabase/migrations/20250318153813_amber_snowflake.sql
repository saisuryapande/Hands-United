/*
  # Add Date of Birth to Profiles

  1. Changes
    - Add date_of_birth column to profiles table
    - Remove age column since it will be calculated from date_of_birth
    - Add check constraint to ensure users are at least 13 years old

  2. Security
    - Maintain existing RLS policies
*/

-- Remove age column and add date_of_birth
ALTER TABLE profiles 
DROP COLUMN IF EXISTS age,
ADD COLUMN IF NOT EXISTS date_of_birth date;

-- Add check constraint for minimum age
ALTER TABLE profiles
ADD CONSTRAINT minimum_age_check
CHECK (
  date_of_birth IS NULL OR 
  date_of_birth <= CURRENT_DATE - INTERVAL '13 years'
);

-- Create function to calculate age
CREATE OR REPLACE FUNCTION calculate_age(birth_date date)
RETURNS integer AS $$
BEGIN
  RETURN date_part('year', age(birth_date));
END;
$$ LANGUAGE plpgsql;