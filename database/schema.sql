CREATE DATABASE IF NOT EXISTS spectra;
USE spectra;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contests (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64) UNIQUE NOT NULL,
  duration_minutes INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'upcoming',
  start_time DATETIME NULL,
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_contests_code (code)
);

CREATE TABLE IF NOT EXISTS levels (
  id VARCHAR(64) PRIMARY KEY,
  contest_id VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  `order` INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contest_id) REFERENCES contests(id),
  INDEX idx_levels_contest (contest_id)
);

CREATE TABLE IF NOT EXISTS problems (
  id VARCHAR(64) PRIMARY KEY,
  level_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  input_format TEXT,
  output_format TEXT,
  constraints TEXT,
  sample_input TEXT,
  sample_output TEXT,
  marks INT NOT NULL,
  time_limit INT NOT NULL,
  memory_limit INT NOT NULL,
  allowed_languages TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (level_id) REFERENCES levels(id),
  INDEX idx_problems_level (level_id)
);

CREATE TABLE IF NOT EXISTS test_cases (
  id VARCHAR(64) PRIMARY KEY,
  problem_id VARCHAR(64) NOT NULL,
  input_text TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_hidden BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (problem_id) REFERENCES problems(id),
  INDEX idx_test_cases_problem (problem_id)
);

CREATE TABLE IF NOT EXISTS participants (
  id VARCHAR(64) PRIMARY KEY,
  participant_id VARCHAR(64) NOT NULL,
  contest_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  score INT DEFAULT 0,
  status VARCHAR(32) DEFAULT 'active',
  violations INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contest_id) REFERENCES contests(id),
  INDEX idx_participants_contest (contest_id),
  INDEX idx_participants_pid (participant_id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id VARCHAR(64) PRIMARY KEY,
  participant_id VARCHAR(64) NOT NULL,
  contest_id VARCHAR(64) NOT NULL,
  problem_id VARCHAR(64) NOT NULL,
  language VARCHAR(32) NOT NULL,
  source_code LONGTEXT NOT NULL,
  status VARCHAR(32) NOT NULL,
  score INT DEFAULT 0,
  passed INT DEFAULT 0,
  total INT DEFAULT 0,
  result_json JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contest_id) REFERENCES contests(id),
  FOREIGN KEY (problem_id) REFERENCES problems(id),
  INDEX idx_submissions_participant (participant_id),
  INDEX idx_submissions_contest (contest_id)
);

CREATE TABLE IF NOT EXISTS violations (
  id VARCHAR(64) PRIMARY KEY,
  participant_id VARCHAR(64) NOT NULL,
  contest_id VARCHAR(64) NOT NULL,
  event_name VARCHAR(128) NOT NULL,
  event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_violations_participant (participant_id),
  INDEX idx_violations_contest (contest_id)
);

CREATE TABLE IF NOT EXISTS contest_settings (
  id VARCHAR(64) PRIMARY KEY,
  contest_id VARCHAR(64) NOT NULL,
  violation_limit INT NOT NULL DEFAULT 3,
  action VARCHAR(32) NOT NULL DEFAULT 'warning',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contest_id) REFERENCES contests(id)
);

INSERT INTO users (id, email, password, name, role) VALUES
('host-1', 'admin@spectra.local', 'Spectra@123', 'Host Admin', 'host')
ON DUPLICATE KEY UPDATE email = VALUES(email);
