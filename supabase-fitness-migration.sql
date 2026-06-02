-- Fitness Tracker tables
-- Run this in your Supabase SQL editor

-- 1. Physical activity log (gym sessions, runs, swims, sports, etc.)
CREATE TABLE IF NOT EXISTS fitness_activities (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  type TEXT NOT NULL,          -- gym | swimming | running | cycling | sports | yoga | other
  name TEXT NOT NULL,
  duration INTEGER,            -- minutes
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Gym workout sessions
CREATE TABLE IF NOT EXISTS workout_sessions (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  template_id TEXT,
  notes TEXT,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Individual sets within a workout session
CREATE TABLE IF NOT EXISTS workout_sets (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  muscle_group TEXT,
  set_number INTEGER NOT NULL,
  weight DECIMAL(6,2) NOT NULL,  -- kg
  reps INTEGER NOT NULL,
  is_warmup BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Reusable workout templates (Push Day, Pull Day, etc.)
CREATE TABLE IF NOT EXISTS workout_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  exercises TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Daily step logs
CREATE TABLE IF NOT EXISTS daily_steps (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  steps INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Body weight logs
CREATE TABLE IF NOT EXISTS body_weight_logs (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  weight DECIMAL(5,2) NOT NULL,  -- kg
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_fitness_activities_date ON fitness_activities(date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_date   ON workout_sessions(date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sets_session    ON workout_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise   ON workout_sets(exercise_name);
CREATE INDEX IF NOT EXISTS idx_daily_steps_date        ON daily_steps(date DESC);
CREATE INDEX IF NOT EXISTS idx_body_weight_date        ON body_weight_logs(date DESC);
