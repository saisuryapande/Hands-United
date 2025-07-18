/*
  # Initialize Skills Categories
  
  1. Creates initial skill categories for the platform
  2. Each skill has a name, category, and description
  3. Uses ON CONFLICT to handle potential duplicates
*/

-- Create initial skills categories
INSERT INTO skills (name, category, description)
VALUES 
  ('JavaScript', 'Programming', 'Modern JavaScript programming'),
  ('Python', 'Programming', 'Python programming language'),
  ('React', 'Web Development', 'React.js framework'),
  ('Node.js', 'Web Development', 'Node.js runtime and ecosystem'),
  ('UI/UX Design', 'Design', 'User interface and experience design'),
  ('Digital Marketing', 'Marketing', 'Digital marketing strategies'),
  ('Content Writing', 'Writing', 'Professional content writing'),
  ('Data Analysis', 'Data Science', 'Data analysis and visualization'),
  ('Photography', 'Arts', 'Digital photography and editing'),
  ('Public Speaking', 'Communication', 'Public speaking and presentation')
ON CONFLICT (name) DO NOTHING;