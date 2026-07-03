-- Prisma migration: Add coding analytics tables and preserve existing data.
-- This migration is safe to apply on PostgreSQL and uses IF NOT EXISTS
-- to avoid dropping or replacing existing tables.

CREATE TABLE IF NOT EXISTS coding_handles (
  id BIGSERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  platform VARCHAR(100) NOT NULL,
  handle VARCHAR(255) NOT NULL,
  profile_url TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_handles_student_platform UNIQUE (student_id, platform),
  CONSTRAINT uq_handle_platform UNIQUE (platform, handle)
);

CREATE INDEX IF NOT EXISTS idx_coding_handles_student ON coding_handles(student_id);
CREATE INDEX IF NOT EXISTS idx_coding_handles_platform ON coding_handles(platform);
CREATE INDEX IF NOT EXISTS idx_coding_handles_handle ON coding_handles(handle);

CREATE TABLE IF NOT EXISTS platform_profiles (
  id BIGSERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  coding_handle_id BIGINT REFERENCES coding_handles(id) ON DELETE CASCADE,
  platform VARCHAR(100) NOT NULL,
  username VARCHAR(255),
  profile_url TEXT,
  raw_data JSONB DEFAULT '{}'::jsonb,
  stats JSONB DEFAULT '{}'::jsonb,
  tags TEXT[],
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_platform_profile UNIQUE (student_id, platform, username)
);

CREATE INDEX IF NOT EXISTS idx_platform_profiles_student ON platform_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_platform_profiles_platform ON platform_profiles(platform);
CREATE INDEX IF NOT EXISTS idx_platform_profiles_handle ON platform_profiles(coding_handle_id);

CREATE TABLE IF NOT EXISTS leetcode_stats (
  id BIGSERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  total_solved INTEGER,
  easy_solved INTEGER,
  medium_solved INTEGER,
  hard_solved INTEGER,
  active_days INTEGER,
  max_streak INTEGER,
  reputation INTEGER,
  global_rank INTEGER,
  country_rank INTEGER,
  contest_count INTEGER,
  problems_solved INTEGER,
  coding_score INTEGER,
  badges JSONB,
  languages TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leetcode_stats_student ON leetcode_stats(student_id);

CREATE TABLE IF NOT EXISTS leetcode_topics (
  id BIGSERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  leetcode_stat_id BIGINT REFERENCES leetcode_stats(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  questions_count INTEGER,
  solved_count INTEGER,
  difficulty_distribution JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_leetcode_topic_student_name UNIQUE (student_id, name)
);

CREATE INDEX IF NOT EXISTS idx_leetcode_topics_student ON leetcode_topics(student_id);
CREATE INDEX IF NOT EXISTS idx_leetcode_topics_stat ON leetcode_topics(leetcode_stat_id);

CREATE TABLE IF NOT EXISTS leetcode_questions (
  id BIGSERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  leetcode_stat_id BIGINT REFERENCES leetcode_stats(id) ON DELETE SET NULL,
  question_id TEXT,
  question_slug TEXT,
  title TEXT,
  question_url TEXT,
  difficulty VARCHAR(50),
  status VARCHAR(50),
  solved_at TIMESTAMP WITH TIME ZONE,
  topics TEXT[],
  tags TEXT[],
  runtime VARCHAR(100),
  memory VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_leetcode_question_student_question UNIQUE (student_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_leetcode_questions_student ON leetcode_questions(student_id);
CREATE INDEX IF NOT EXISTS idx_leetcode_questions_stat ON leetcode_questions(leetcode_stat_id);

CREATE TABLE IF NOT EXISTS leetcode_contests (
  id BIGSERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  contest_id TEXT NOT NULL,
  contest_name TEXT,
  contest_url TEXT,
  contest_date DATE,
  rank INTEGER,
  rating_before INTEGER,
  rating_after INTEGER,
  rating_change INTEGER,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_leetcode_contest_student_contest UNIQUE (student_id, contest_id)
);

CREATE INDEX IF NOT EXISTS idx_leetcode_contests_student ON leetcode_contests(student_id);
CREATE INDEX IF NOT EXISTS idx_leetcode_contests_contest ON leetcode_contests(contest_id);

CREATE TABLE IF NOT EXISTS codechef_stats (
  id BIGSERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  rating INTEGER,
  max_rating INTEGER,
  problems_solved INTEGER,
  contest_count INTEGER,
  global_rank INTEGER,
  country_rank INTEGER,
  stars_badges TEXT,
  reputation INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_codechef_stats_student ON codechef_stats(student_id);

CREATE TABLE IF NOT EXISTS codechef_contests (
  id BIGSERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  contest_id TEXT NOT NULL,
  contest_name TEXT,
  contest_url TEXT,
  contest_date DATE,
  rank INTEGER,
  rating_before INTEGER,
  rating_after INTEGER,
  rating_change INTEGER,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_codechef_contest_student_contest UNIQUE (student_id, contest_id)
);

CREATE INDEX IF NOT EXISTS idx_codechef_contests_student ON codechef_contests(student_id);
CREATE INDEX IF NOT EXISTS idx_codechef_contests_contest ON codechef_contests(contest_id);

CREATE TABLE IF NOT EXISTS hackerrank_stats (
  id BIGSERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  total_points INTEGER,
  badges_count INTEGER,
  reputation INTEGER,
  global_rank INTEGER,
  problems_solved INTEGER,
  skills_count INTEGER,
  certificates_count INTEGER,
  profile_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hackerrank_stats_student ON hackerrank_stats(student_id);

CREATE TABLE IF NOT EXISTS hackerrank_skills (
  id BIGSERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  skill_name VARCHAR(255) NOT NULL,
  rank INTEGER,
  score INTEGER,
  level VARCHAR(100),
  badges_count INTEGER,
  last_updated_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_hackerrank_skill_student_name UNIQUE (student_id, skill_name)
);

CREATE INDEX IF NOT EXISTS idx_hackerrank_skills_student ON hackerrank_skills(student_id);

CREATE TABLE IF NOT EXISTS hackerrank_certificates (
  id BIGSERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  certificate_id TEXT,
  title TEXT NOT NULL,
  issued_by TEXT,
  issue_date DATE,
  expiry_date DATE,
  score INTEGER,
  certificate_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_hackerrank_certificate_student_certificate UNIQUE (student_id, certificate_id)
);

CREATE INDEX IF NOT EXISTS idx_hackerrank_certificates_student ON hackerrank_certificates(student_id);

CREATE TABLE IF NOT EXISTS github_stats (
  id BIGSERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL,
  profile_url TEXT,
  total_repos INTEGER,
  total_stars INTEGER,
  total_forks INTEGER,
  total_watchers INTEGER,
  followers INTEGER,
  following INTEGER,
  contributions_last_year INTEGER,
  top_languages JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_github_stats_student ON github_stats(student_id);

CREATE TABLE IF NOT EXISTS github_repositories (
  id BIGSERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  repo_id TEXT,
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  repo_url TEXT NOT NULL,
  description TEXT,
  language VARCHAR(100),
  stargazers_count INTEGER,
  forks_count INTEGER,
  watchers_count INTEGER,
  topics TEXT[],
  license VARCHAR(255),
  is_fork BOOLEAN,
  is_private BOOLEAN,
  pushed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_github_repository_student_repo UNIQUE (student_id, repo_id)
);

CREATE INDEX IF NOT EXISTS idx_github_repositories_student ON github_repositories(student_id);
CREATE INDEX IF NOT EXISTS idx_github_repositories_repo ON github_repositories(repo_id);

CREATE TABLE IF NOT EXISTS coding_scores (
  id BIGSERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  platform VARCHAR(100),
  category VARCHAR(100),
  score INTEGER NOT NULL,
  source VARCHAR(255),
  computed_at TIMESTAMP WITH TIME ZONE,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coding_scores_student ON coding_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_coding_scores_platform ON coding_scores(platform);
