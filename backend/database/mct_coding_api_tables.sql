-- MCT Coding API - Production-ready schema (migration-safe)
-- File: backend/database/mct_coding_api_tables.sql
-- This file adds the tables required by the MCT Coding API.
-- Use `psql -f mct_coding_api_tables.sql` or include in your migration pipeline.

-- coding_handles: canonical handles a student has on various platforms
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

-- platform_profiles: normalized profile snapshots (one per handle/platform)
CREATE TABLE IF NOT EXISTS platform_profiles (
  id BIGSERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  coding_handle_id BIGINT REFERENCES coding_handles(id) ON DELETE CASCADE,
  platform VARCHAR(100) NOT NULL,
  username VARCHAR(255),
  profile_url TEXT,
  raw_data JSONB DEFAULT '{}'::jsonb,     -- raw scraped/API response
  stats JSONB DEFAULT '{}'::jsonb,        -- normalized stats (rating, solved, rank...)
  tags TEXT[],                             -- any normalized tags/labels
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_platform_profile UNIQUE (student_id, platform, username)
);

CREATE INDEX IF NOT EXISTS idx_platform_profiles_student ON platform_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_platform_profiles_platform ON platform_profiles(platform);
CREATE INDEX IF NOT EXISTS idx_platform_profiles_handle ON platform_profiles(coding_handle_id);

-- contest_history: one row per student-contest (prevent duplicates)
CREATE TABLE IF NOT EXISTS contest_history (
  id BIGSERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  platform VARCHAR(100) NOT NULL,         -- e.g., leetcode, codechef, codeforces, atcoder
  contest_id TEXT NOT NULL,               -- platform-specific contest id
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
  CONSTRAINT uq_contest_unique UNIQUE (student_id, platform, contest_id)
);

CREATE INDEX IF NOT EXISTS idx_contest_history_student ON contest_history(student_id);
CREATE INDEX IF NOT EXISTS idx_contest_history_platform ON contest_history(platform);
CREATE INDEX IF NOT EXISTS idx_contest_history_contest ON contest_history(contest_id);

-- rating_history: time series of rating snapshots (supports multiple platforms)
CREATE TABLE IF NOT EXISTS rating_history (
  id BIGSERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  platform VARCHAR(100) NOT NULL,
  rating INTEGER,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,      -- optional context (contest_id, source, note)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rating_history_student ON rating_history(student_id);
CREATE INDEX IF NOT EXISTS idx_rating_history_platform ON rating_history(platform);
CREATE INDEX IF NOT EXISTS idx_rating_history_recorded_at ON rating_history(recorded_at);

-- problem_history: tracks solved problems and attempts per student per platform
CREATE TABLE IF NOT EXISTS problem_history (
  id BIGSERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  platform VARCHAR(100) NOT NULL,
  problem_id TEXT NOT NULL,                -- platform-specific problem identifier
  problem_name TEXT,
  difficulty VARCHAR(50),
  solved_at TIMESTAMP WITH TIME ZONE,
  attempt_data JSONB DEFAULT '{}'::jsonb,  -- attempts, languages, runtimes
  source VARCHAR(100),                     -- e.g., contest, practice
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_problem_unique UNIQUE (student_id, platform, problem_id)
);

CREATE INDEX IF NOT EXISTS idx_problem_history_student ON problem_history(student_id);
CREATE INDEX IF NOT EXISTS idx_problem_history_platform ON problem_history(platform);
CREATE INDEX IF NOT EXISTS idx_problem_history_problem ON problem_history(problem_id);

-- sync_logs: audit trail for profile synchronization operations
CREATE TABLE IF NOT EXISTS sync_logs (
  id BIGSERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  platform VARCHAR(100),
  operation VARCHAR(100) NOT NULL,         -- e.g., fetch_profile, sync_history
  status VARCHAR(50) NOT NULL,             -- e.g., started, success, failed
  message TEXT,                             -- short human-readable message
  response JSONB DEFAULT '{}'::jsonb,      -- raw API responses or errors
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_student ON sync_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_platform ON sync_logs(platform);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at);

-- leaderboard_scores: daily/periodic leaderboard snapshots per platform
CREATE TABLE IF NOT EXISTS leaderboard_scores (
  id BIGSERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  platform VARCHAR(100) NOT NULL,
  snapshot_date DATE NOT NULL,
  score NUMERIC,
  rank INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_leaderboard_snapshot UNIQUE (platform, snapshot_date, student_id)
);


CREATE INDEX IF NOT EXISTS idx_leaderboard_platform_date ON leaderboard_scores(platform, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_leaderboard_student ON leaderboard_scores(student_id);

-- End of MCT Coding API schema additions
