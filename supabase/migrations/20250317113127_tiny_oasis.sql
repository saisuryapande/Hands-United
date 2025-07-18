/*
  # Initial Database Schema for Hands United

  1. Tables
    - profiles: User profiles and settings
    - skills: Available skills in the system
    - user_skills: Skills that users can teach or learn
    - user_connections: Connections between users (following/followers)
    - skill_requests: Learning requests between users
    - sessions: Learning sessions between users
    - user_projects: User portfolio projects
    - user_achievements: User achievements and certifications
    - notifications: User notifications
    - support_requests: User support tickets

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Add admin-specific policies
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  gender text,
  age integer CHECK (age >= 13),
  location text,
  profession text,
  qualification text,
  bio text,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  category text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Skills are viewable by everyone"
  ON skills
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert/update/delete skills"
  ON skills
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- User Skills table
CREATE TABLE IF NOT EXISTS user_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  skill_id uuid REFERENCES skills(id) ON DELETE CASCADE NOT NULL,
  is_teaching boolean DEFAULT false,
  is_learning boolean DEFAULT false,
  proficiency_level text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User skills are viewable by everyone"
  ON user_skills
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own skills"
  ON user_skills
  FOR ALL
  USING (auth.uid() = user_id);

-- User Connections table
CREATE TABLE IF NOT EXISTS user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Connections are viewable by everyone"
  ON user_connections
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own connections"
  ON user_connections
  FOR ALL
  USING (auth.uid() IN (follower_id, following_id));

-- Skill Requests table
CREATE TABLE IF NOT EXISTS skill_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  skill_id uuid REFERENCES skills(id) ON DELETE CASCADE NOT NULL,
  message text,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE skill_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view requests they're involved in"
  ON skill_requests
  FOR SELECT
  USING (auth.uid() IN (from_user_id, to_user_id));

CREATE POLICY "Users can create requests"
  ON skill_requests
  FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update requests they're involved in"
  ON skill_requests
  FOR UPDATE
  USING (auth.uid() IN (from_user_id, to_user_id));

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  skill_id uuid REFERENCES skills(id) ON DELETE CASCADE NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sessions they're involved in"
  ON sessions
  FOR SELECT
  USING (auth.uid() IN (teacher_id, student_id));

CREATE POLICY "Users can manage sessions they're involved in"
  ON sessions
  FOR ALL
  USING (auth.uid() IN (teacher_id, student_id));

-- User Projects table
CREATE TABLE IF NOT EXISTS user_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  image_url text,
  project_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Projects are viewable by everyone"
  ON user_projects
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own projects"
  ON user_projects
  FOR ALL
  USING (auth.uid() = user_id);

-- User Achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  issuer text NOT NULL,
  issue_date date NOT NULL,
  credential_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements are viewable by everyone"
  ON user_achievements
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own achievements"
  ON user_achievements
  FOR ALL
  USING (auth.uid() = user_id);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

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

-- Support Requests table
CREATE TABLE IF NOT EXISTS support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'in_progress', 'resolved')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

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

-- Function to safely delete skills
CREATE OR REPLACE FUNCTION delete_skill(skill_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can delete skills';
  END IF;

  -- Delete related records
  DELETE FROM user_skills WHERE skill_id = $1;
  DELETE FROM skill_requests WHERE skill_id = $1;
  DELETE FROM sessions WHERE skill_id = $1;
  DELETE FROM skills WHERE id = $1;
END;
$$;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_skills_updated_at
  BEFORE UPDATE ON user_skills
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_connections_updated_at
  BEFORE UPDATE ON user_connections
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_skill_requests_updated_at
  BEFORE UPDATE ON skill_requests
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_projects_updated_at
  BEFORE UPDATE ON user_projects
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_achievements_updated_at
  BEFORE UPDATE ON user_achievements
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_support_requests_updated_at
  BEFORE UPDATE ON support_requests
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();