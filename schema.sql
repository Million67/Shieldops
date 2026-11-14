-- ThreatTalk database schema.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  quiz_exit_count INTEGER NOT NULL DEFAULT 0,   -- quizzes abandoned (docked from Risk Awareness Score)
  streak_count INTEGER NOT NULL DEFAULT 0,      -- consecutive active days
  last_active_date DATE,
  avatar BYTEA,                                 -- profile photo bytes; NULL = no photo
  avatar_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS topic_progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_slug VARCHAR(50) NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, topic_slug)
);

-- One row per quiz attempt, including retakes
CREATE TABLE IF NOT EXISTS quiz_completions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_slug VARCHAR(50),
  correct_count INTEGER NOT NULL,
  question_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per chat scenario answered or timed out
CREATE TABLE IF NOT EXISTS scenario_attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_slug VARCHAR(50) NOT NULL,
  correct BOOLEAN NOT NULL,
  timed_out BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scenario_attempts_user_topic_idx ON scenario_attempts (user_id, topic_slug);
