-- MCT Project Database Schema - MIGRATION SAFE
-- This script extends the existing schema without removing data

-- ============================================================
-- 1. CREATE NEW TABLES (non-destructive, using IF NOT EXISTS)
-- ============================================================

-- Blocks Table (NEW)
CREATE TABLE IF NOT EXISTS blocks (
  id SERIAL PRIMARY KEY,
  block_name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Mentors Table (NEW)
CREATE TABLE IF NOT EXISTS mentors (
  id SERIAL PRIMARY KEY,
  mentor_name VARCHAR(255) NOT NULL,
  mentor_phone VARCHAR(20),
  mentor_email VARCHAR(255),
  block_id INTEGER REFERENCES blocks(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Family Details (NEW)
CREATE TABLE IF NOT EXISTS family_details (
  id SERIAL PRIMARY KEY,
  student_id INTEGER UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  father_name VARCHAR(255),
  father_occupation VARCHAR(255),
  mother_name VARCHAR(255),
  mother_occupation VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Siblings Table (NEW)
CREATE TABLE IF NOT EXISTS siblings (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  sibling_name VARCHAR(255) NOT NULL,
  education VARCHAR(255),
  occupation VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- School Details (NEW)
CREATE TABLE IF NOT EXISTS school_details (
  id SERIAL PRIMARY KEY,
  student_id INTEGER UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  school_name VARCHAR(255),
  board VARCHAR(100),
  pass_year INTEGER,
  gpa DECIMAL(4,2) CHECK (gpa >= 0 AND gpa <= 10),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Intermediate Details (NEW)
CREATE TABLE IF NOT EXISTS inter_details (
  id SERIAL PRIMARY KEY,
  student_id INTEGER UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  college_name VARCHAR(255),
  board VARCHAR(100),
  ipe_marks DECIMAL(5,2),
  ipe_percentage DECIMAL(5,2),
  eamcet_rank INTEGER,
  jee_mains_percentile DECIMAL(5,2),
  jee_advanced_percentile DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- BTech Details (NEW)
CREATE TABLE IF NOT EXISTS btech_details (
  id SERIAL PRIMARY KEY,
  student_id INTEGER UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  college_name VARCHAR(255),
  branch VARCHAR(100),
  admission_year INTEGER,
  passout_year INTEGER,
  current_cgpa DECIMAL(4,2) CHECK (current_cgpa >= 0 AND current_cgpa <= 10),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Academic Details (NEW)
CREATE TABLE IF NOT EXISTS academic_details (
  id SERIAL PRIMARY KEY,
  student_id INTEGER UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  college_name VARCHAR(255),
  department VARCHAR(255),
  degree VARCHAR(100),
  year_of_study INTEGER,
  cgpa DECIMAL(4,2) CHECK (cgpa >= 0 AND cgpa <= 10),
  backlogs INTEGER DEFAULT 0,
  admission_year INTEGER,
  passout_year INTEGER,
  section VARCHAR(50),
  rollno VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Normalize existing student college values to standard names
-- This should be applied once after updating the college standardization logic.
UPDATE students SET college_name = 'Vasavi' WHERE college_name = 'Vasavi College of Engineering';
UPDATE students SET college_name = 'Vardhaman' WHERE college_name IN ('Vardhaman College of Engineering', 'VNR');
UPDATE students SET college_name = 'Narayanamma' WHERE college_name IN ('Narayanamma Institute of Technology', 'Narayanaamma');
UPDATE students SET college_name = 'Other' WHERE college_name IS NOT NULL AND college_name NOT IN ('Vasavi','CBIT','KMIT','Vardhaman','Narayanamma','BVRIT','IIIT Hyderabad','Other');

-- Coding Profiles (NEW)
CREATE TABLE IF NOT EXISTS coding_profiles (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  platform VARCHAR(100) NOT NULL,
  username VARCHAR(255),
  profile_url TEXT,
  avatar_url TEXT,
  reputation INTEGER,
  rating INTEGER,
  current_rating INTEGER,
  max_rating INTEGER,
  problems_solved INTEGER DEFAULT 0,
  easy_solved INTEGER,
  medium_solved INTEGER,
  hard_solved INTEGER,
  total_problems INTEGER DEFAULT 0,
  contest_count INTEGER,
  contest_rating INTEGER,
  badges_count INTEGER,
  stars_count INTEGER,
  global_rank INTEGER,
  country_rank INTEGER,
  stars_badges VARCHAR(255),
  coding_score INTEGER,
  last_activity_date DATE,
  last_sync_date DATE,
  inactive_days INTEGER,
  active_days INTEGER,
  activity_status VARCHAR(50),
  current_streak INTEGER,
  max_streak INTEGER,
  topic_statistics JSONB,
  profile_status VARCHAR(50),
  last_sync TIMESTAMP,
  estimated_score INTEGER,
  last_updated_date DATE,
  data_verification_status VARCHAR(50) DEFAULT 'unverified',
  estimated_skill_level VARCHAR(50),
  estimated_progress_score INTEGER,
  badges_analysis TEXT,
  achievements_analysis TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
DO $$
BEGIN
  DELETE FROM coding_profiles
  WHERE id IN (
    SELECT id FROM (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY student_id, LOWER(platform) ORDER BY COALESCE(last_sync, updated_at, created_at) DESC, id DESC) AS rn
      FROM coding_profiles
      WHERE platform IS NOT NULL
    ) AS ranked
    WHERE rn > 1
  );
  UPDATE coding_profiles SET platform = LOWER(platform) WHERE platform IS NOT NULL;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_coding_profiles_student_platform_lower'
  ) THEN
    CREATE UNIQUE INDEX idx_coding_profiles_student_platform_lower ON coding_profiles (student_id, LOWER(platform));
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- Recent Questions Table (NEW)
CREATE TABLE IF NOT EXISTS recent_questions (
  id SERIAL PRIMARY KEY,
  coding_profile_id INTEGER REFERENCES coding_profiles(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  platform VARCHAR(100),
  question_name VARCHAR(255),
  difficulty VARCHAR(50),
  question_url TEXT,
  date_solved DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Volunteering Table (NEW)
CREATE TABLE IF NOT EXISTS volunteering (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  organization VARCHAR(255) NOT NULL,
  role VARCHAR(255),
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  hours DECIMAL(6,2) CHECK (hours >= 0),
  category VARCHAR(100),
  certificate_url TEXT,
  certificate_path TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_volunteering_student_id ON volunteering(student_id);

-- Coding Statistics Table (NEW)
CREATE TABLE IF NOT EXISTS coding_statistics (
  id SERIAL PRIMARY KEY,
  coding_profile_id INTEGER REFERENCES coding_profiles(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  platform VARCHAR(100),
  rating INTEGER,
  max_rating INTEGER,
  problems_solved INTEGER,
  contest_count INTEGER,
  global_rank INTEGER,
  country_rank INTEGER,
  reputation INTEGER,
  stars_badges VARCHAR(255),
  recorded_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Coding Activity History (NEW)
CREATE TABLE IF NOT EXISTS coding_activity_history (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  coding_profile_id INTEGER REFERENCES coding_profiles(id) ON DELETE CASCADE,
  platform VARCHAR(100),
  rating INTEGER,
  problems_solved INTEGER,
  coding_score INTEGER,
  activity_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Resume table (NEW)
CREATE TABLE IF NOT EXISTS resume (
  id SERIAL PRIMARY KEY,
  student_id INTEGER UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Semesters Table (NEW)
CREATE TABLE IF NOT EXISTS semesters (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  semester_number INTEGER NOT NULL,
  sgpa DECIMAL(4,2) CHECK (sgpa >= 0 AND sgpa <= 10),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, semester_number)
);

-- Subjects Table (NEW)
CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  semester_id INTEGER REFERENCES semesters(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  subject_name VARCHAR(255) NOT NULL,
  mid1_marks DECIMAL(5,2),
  mid2_marks DECIMAL(5,2),
  semester_marks DECIMAL(5,2),
  grade VARCHAR(2),
  credits DECIMAL(3,1),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Coding Profile History (NEW - for tracking growth)
CREATE TABLE IF NOT EXISTS coding_profile_history (
  id SERIAL PRIMARY KEY,
  coding_profile_id INTEGER REFERENCES coding_profiles(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  platform VARCHAR(100),
  rating INTEGER,
  max_rating INTEGER,
  problems_solved INTEGER,
  global_rank INTEGER,
  country_rank INTEGER,
  stars_badges VARCHAR(255),
  recorded_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 2. EXTEND EXISTING STUDENTS TABLE (add new columns if needed)
-- ============================================================

-- Add block_id and mentor_id columns if they don't exist
ALTER TABLE students ADD COLUMN IF NOT EXISTS block_id INTEGER REFERENCES blocks(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS mentor_id INTEGER REFERENCES mentors(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'student';
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS mss_batch VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS college_name VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS year VARCHAR(20);
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS student_id INTEGER REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS reputation INTEGER;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS contest_count INTEGER;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS max_rating INTEGER;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS global_rank INTEGER;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS country_rank INTEGER;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS stars_badges VARCHAR(255);
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS last_updated_date DATE;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS data_verification_status VARCHAR(50) DEFAULT 'unverified';
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS estimated_skill_level VARCHAR(50);
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS estimated_progress_score INTEGER;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS badges_analysis TEXT;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS achievements_analysis TEXT;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS coding_score INTEGER;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS last_activity_date DATE;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS last_sync_date DATE;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS profile_status VARCHAR(50);
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS estimated_score INTEGER;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS inactive_days INTEGER;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS activity_status VARCHAR(50);
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS current_streak INTEGER;
ALTER TABLE coding_profile_history ADD COLUMN IF NOT EXISTS max_rating INTEGER;
ALTER TABLE coding_profile_history ADD COLUMN IF NOT EXISTS contest_count INTEGER;
ALTER TABLE coding_profile_history ADD COLUMN IF NOT EXISTS global_rank INTEGER;
ALTER TABLE coding_profile_history ADD COLUMN IF NOT EXISTS country_rank INTEGER;
ALTER TABLE coding_profile_history ADD COLUMN IF NOT EXISTS reputation INTEGER;
ALTER TABLE coding_profile_history ADD COLUMN IF NOT EXISTS stars_badges VARCHAR(255);
ALTER TABLE recent_questions ADD COLUMN IF NOT EXISTS platform VARCHAR(100);
ALTER TABLE recent_questions ADD COLUMN IF NOT EXISTS question_name VARCHAR(255);
ALTER TABLE recent_questions ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50);
ALTER TABLE recent_questions ADD COLUMN IF NOT EXISTS question_url TEXT;

-- Populate new coding_profiles compatibility columns from legacy columns if present
UPDATE coding_profiles SET last_sync_date = last_sync::date WHERE last_sync_date IS NULL AND last_sync IS NOT NULL;
UPDATE coding_profiles SET coding_score = estimated_score WHERE coding_score IS NULL AND estimated_score IS NOT NULL;
ALTER TABLE recent_questions ADD COLUMN IF NOT EXISTS date_solved DATE;
ALTER TABLE coding_statistics ADD COLUMN IF NOT EXISTS coding_profile_id INTEGER REFERENCES coding_profiles(id) ON DELETE CASCADE;
ALTER TABLE coding_statistics ADD COLUMN IF NOT EXISTS student_id INTEGER REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE coding_statistics ADD COLUMN IF NOT EXISTS platform VARCHAR(100);
ALTER TABLE coding_statistics ADD COLUMN IF NOT EXISTS rating INTEGER;
ALTER TABLE coding_statistics ADD COLUMN IF NOT EXISTS max_rating INTEGER;
ALTER TABLE coding_statistics ADD COLUMN IF NOT EXISTS problems_solved INTEGER;
ALTER TABLE coding_statistics ADD COLUMN IF NOT EXISTS contest_count INTEGER;
ALTER TABLE coding_statistics ADD COLUMN IF NOT EXISTS global_rank INTEGER;
ALTER TABLE coding_statistics ADD COLUMN IF NOT EXISTS country_rank INTEGER;
ALTER TABLE coding_statistics ADD COLUMN IF NOT EXISTS reputation INTEGER;
ALTER TABLE coding_statistics ADD COLUMN IF NOT EXISTS stars_badges VARCHAR(255);
ALTER TABLE coding_statistics ADD COLUMN IF NOT EXISTS recorded_date DATE DEFAULT CURRENT_DATE;

-- ============================================================
-- 2b. ADD NEW COLUMNS FOR ENHANCED CODING PROFILES
-- ============================================================

-- LeetCode specific columns
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS easy_solved INTEGER;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS medium_solved INTEGER;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS hard_solved INTEGER;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS active_days INTEGER;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS max_streak INTEGER;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS topic_statistics JSONB;

-- Multi-platform columns (JSON for storing arrays)
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS badges TEXT;
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS languages TEXT;

-- Platform-specific columns
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE coding_profiles ADD COLUMN IF NOT EXISTS hacker_name VARCHAR(255);

-- ============================================================
-- 3. INSERT DEFAULT DATA (idempotent - use ON CONFLICT)
-- ============================================================

-- Default blocks (if not already present)
INSERT INTO blocks (block_name) VALUES 
  ('Block A'), ('Block B'), ('Block C'), ('Block D'), ('Block E'), ('Block F')
ON CONFLICT (block_name) DO NOTHING;

-- Default mentors (one per block - if not already present)
INSERT INTO mentors (mentor_name, mentor_phone, mentor_email, block_id) VALUES 
  ('Dr. Rajesh Kumar', '9876543210', 'rajesh@vasavi.edu.in', 1),
  ('Prof. Priya Sharma', '9876543211', 'priya@vasavi.edu.in', 2),
  ('Dr. Amit Patel', '9876543212', 'amit@vasavi.edu.in', 3),
  ('Prof. Neha Singh', '9876543213', 'neha@vasavi.edu.in', 4),
  ('Dr. Vikram Reddy', '9876543214', 'vikram@vasavi.edu.in', 5),
  ('Prof. Anjali Gupta', '9876543215', 'anjali@vasavi.edu.in', 6)
ON CONFLICT DO NOTHING;

-- Ensure coordinators exist
-- Default coordinator password: password
INSERT INTO students (mssid, password, role) 
VALUES ('MSS0000000', '$2a$10$/.LkwqGEwRoL14eY8nnKX.Jr9Bdvg1qGVyrrKl8QZ/exHMnL9iX7m', 'coordinator'),
       ('MSS0000001', '$2a$10$/.LkwqGEwRoL14eY8nnKX.Jr9Bdvg1qGVyrrKl8QZ/exHMnL9iX7m', 'coordinator')
ON CONFLICT (mssid) DO NOTHING;

-- ============================================================
-- 4. CREATE INDEXES (for performance - using IF NOT EXISTS pattern)
-- ============================================================

CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  goal_type VARCHAR(100),
  custom_goal_type VARCHAR(255),
  description TEXT,
  target_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goal_topics (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
  topic_name VARCHAR(255) NOT NULL,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE goal_topics ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
ALTER TABLE goals ADD COLUMN IF NOT EXISTS custom_goal_type VARCHAR(255);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  tech_stack TEXT,
  github_url TEXT,
  live_url TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category VARCHAR(100),
  date_achieved DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certifications (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  issuing_organization TEXT,
  issue_date DATE,
  expiry_date DATE,
  credential_id VARCHAR(255),
  credential_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_mssid ON students(mssid);
CREATE INDEX IF NOT EXISTS idx_students_block_id ON students(block_id);
CREATE INDEX IF NOT EXISTS idx_students_mentor_id ON students(mentor_id);
CREATE INDEX IF NOT EXISTS idx_blocks_name ON blocks(block_name);
CREATE INDEX IF NOT EXISTS idx_mentors_block_id ON mentors(block_id);
CREATE INDEX IF NOT EXISTS idx_personal_student_id ON personal_details(student_id);
CREATE INDEX IF NOT EXISTS idx_family_student_id ON family_details(student_id);
CREATE INDEX IF NOT EXISTS idx_siblings_student_id ON siblings(student_id);
CREATE INDEX IF NOT EXISTS idx_school_student_id ON school_details(student_id);
CREATE INDEX IF NOT EXISTS idx_inter_student_id ON inter_details(student_id);
CREATE INDEX IF NOT EXISTS idx_btech_student_id ON btech_details(student_id);
CREATE INDEX IF NOT EXISTS idx_semesters_student_id ON semesters(student_id);
CREATE INDEX IF NOT EXISTS idx_subjects_student_id ON subjects(student_id);
CREATE INDEX IF NOT EXISTS idx_subjects_semester_id ON subjects(semester_id);
CREATE INDEX IF NOT EXISTS idx_goals_student_id ON goals(student_id);
CREATE INDEX IF NOT EXISTS idx_coding_student_id ON coding_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_coding_profiles_platform ON coding_profiles(platform);
CREATE UNIQUE INDEX IF NOT EXISTS idx_coding_profiles_student_platform_lower ON coding_profiles (student_id, LOWER(platform));
CREATE INDEX IF NOT EXISTS idx_coding_profiles_verification_status ON coding_profiles(data_verification_status);
CREATE INDEX IF NOT EXISTS idx_coding_history_profile ON coding_profile_history(coding_profile_id);
CREATE INDEX IF NOT EXISTS idx_coding_history_student_id ON coding_profile_history(student_id);
CREATE INDEX IF NOT EXISTS idx_coding_history_platform ON coding_profile_history(platform);
CREATE INDEX IF NOT EXISTS idx_recent_questions_profile ON recent_questions(coding_profile_id);
CREATE INDEX IF NOT EXISTS idx_recent_questions_student ON recent_questions(student_id);
CREATE INDEX IF NOT EXISTS idx_recent_questions_platform ON recent_questions(platform);
CREATE INDEX IF NOT EXISTS idx_coding_statistics_profile ON coding_statistics(coding_profile_id);
CREATE INDEX IF NOT EXISTS idx_coding_statistics_student ON coding_statistics(student_id);
CREATE INDEX IF NOT EXISTS idx_coding_statistics_platform ON coding_statistics(platform);
CREATE INDEX IF NOT EXISTS idx_coding_statistics_student ON coding_statistics(student_id);
CREATE INDEX IF NOT EXISTS idx_projects_student_id ON projects(student_id);
CREATE INDEX IF NOT EXISTS idx_certifications_student_id ON certifications(student_id);
CREATE INDEX IF NOT EXISTS idx_achievements_student_id ON achievements(student_id);
CREATE INDEX IF NOT EXISTS idx_placements_student_id ON placements(student_id);
