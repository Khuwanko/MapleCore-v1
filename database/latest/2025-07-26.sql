-- ==========================================
-- COMPLETE MAPLECORE DATABASE SETUP
-- Single SQL file for all systems: Forgot Password, Vote System, and Announcements
-- BACKUP YOUR DATABASE BEFORE RUNNING THIS!
-- ==========================================

START TRANSACTION;

-- ==========================================
-- SECTION 1: FORGOT PASSWORD SYSTEM
-- ==========================================

-- Add new columns to existing accounts table
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS secret_question_id INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS secret_answer VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP NULL DEFAULT NULL;

-- Create secret questions table
CREATE TABLE IF NOT EXISTS secret_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    question_text VARCHAR(500) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert all 15 default secret questions (only if table is empty)
INSERT IGNORE INTO secret_questions (question_text) VALUES
('What was the name of your first pet?'),
('What is your mother''s maiden name?'),
('What was the name of your first school?'),
('What city were you born in?'),
('What is your favorite book?'),
('What was your childhood nickname?'),
('What is the name of your favorite teacher?'),
('What was the make of your first car?'),
('What is your favorite movie?'),
('What street did you grow up on?'),
('What is your favorite food?'),
('What was the name of your first boss?'),
('What is your favorite color?'),
('What was your high school mascot?'),
('What is your favorite sports team?');

-- Create password reset attempts table for security monitoring
CREATE TABLE IF NOT EXISTS password_reset_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT FALSE,
    INDEX idx_account_time (account_id, attempt_time),
    INDEX idx_ip_time (ip_address, attempt_time),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- ==========================================
-- SECTION 2: VOTE SYSTEM
-- ==========================================

-- Drop existing vote-related views and functions if they exist
DROP VIEW IF EXISTS user_vote_summary;
DROP VIEW IF EXISTS daily_vote_stats;
DROP VIEW IF EXISTS user_next_vote;
DROP FUNCTION IF EXISTS can_user_vote;

-- Drop and recreate vote tables for clean installation
DROP TABLE IF EXISTS vote_webhook_logs;
DROP TABLE IF EXISTS vote_logs;
DROP TABLE IF EXISTS vote_sites;
DROP TABLE IF EXISTS vote_ip_cooldowns;
DROP TABLE IF EXISTS vote_cooldowns;
DROP TABLE IF EXISTS vote_rewards;
DROP TABLE IF EXISTS vote_history;

-- Create the vote_logs table
CREATE TABLE vote_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  site VARCHAR(50) NOT NULL DEFAULT 'gtop100',
  vote_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) COMMENT 'For audit/security purposes only',
  status ENUM('success', 'failed') DEFAULT 'success',
  failure_reason VARCHAR(255),
  nx_awarded INT DEFAULT 0,
  votepoints_awarded INT DEFAULT 1,
  INDEX idx_username_site_time (username, site, vote_time DESC),
  INDEX idx_username_status (username, status),
  INDEX idx_vote_time (vote_time DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create vote_webhook_logs table (for debugging)
CREATE TABLE vote_webhook_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  request_type VARCHAR(20) COMMENT 'JSON or FORM',
  username VARCHAR(50),
  success_flag INT COMMENT '0=success, 1=failed from Gtop100',
  reason VARCHAR(255),
  processed BOOLEAN DEFAULT FALSE,
  error_message VARCHAR(500),
  INDEX idx_received_at (received_at DESC),
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- SECTION 3: ANNOUNCEMENTS SYSTEM
-- ==========================================

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id INT NOT NULL AUTO_INCREMENT,
  type ENUM('event', 'update', 'maintenance') NOT NULL DEFAULT 'event',
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  active TINYINT(1) NOT NULL DEFAULT '1',
  priority INT NOT NULL DEFAULT '0',
  PRIMARY KEY (id),
  KEY idx_active (active),
  KEY idx_priority (priority),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- SECTION 4: ADD INDEXES AND CONSTRAINTS
-- ==========================================

-- Add foreign key constraint for secret questions (ignore if already exists)
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                  WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = 'accounts' 
                  AND CONSTRAINT_NAME = 'fk_secret_question');

SET @fk_sql = IF(@fk_exists = 0, 
    'ALTER TABLE accounts ADD CONSTRAINT fk_secret_question FOREIGN KEY (secret_question_id) REFERENCES secret_questions(id)',
    'SELECT "Foreign key fk_secret_question already exists" as Info');

PREPARE stmt FROM @fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add indexes for forgot password system (ignore if already exist)
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON accounts(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON accounts(password_reset_expires);
CREATE INDEX IF NOT EXISTS idx_secret_answer ON accounts(secret_answer);
CREATE INDEX IF NOT EXISTS idx_email ON accounts(email);

-- Add indexes for vote system on accounts table
CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(name);
CREATE INDEX IF NOT EXISTS idx_accounts_votepoints ON accounts(votepoints);

-- ==========================================
-- SECTION 5: FIX PIN AND PIC COLUMNS
-- ==========================================

-- Check if PIN column exists and modify it to allow NULL
SET @pin_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'accounts' 
                   AND COLUMN_NAME = 'pin');

SET @pin_sql = IF(@pin_exists > 0, 
    'ALTER TABLE accounts MODIFY COLUMN pin VARCHAR(255) NULL DEFAULT NULL',
    'SELECT "PIN column does not exist, skipping..." as Info');

PREPARE stmt FROM @pin_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if PIC column exists and modify it to allow NULL
SET @pic_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'accounts' 
                   AND COLUMN_NAME = 'pic');

SET @pic_sql = IF(@pic_exists > 0, 
    'ALTER TABLE accounts MODIFY COLUMN pic VARCHAR(255) NULL DEFAULT NULL',
    'SELECT "PIC column does not exist, skipping..." as Info');

PREPARE stmt FROM @pic_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==========================================
-- SECTION 6: CREATE VOTE SYSTEM VIEWS
-- ==========================================

-- User vote summary view
CREATE VIEW user_vote_summary AS
SELECT 
  username,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_votes,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_votes,
  SUM(nx_awarded) as total_nx_earned,
  SUM(votepoints_awarded) as total_vote_points,
  MAX(vote_time) as last_vote_time,
  COUNT(DISTINCT DATE(vote_time)) as days_voted
FROM vote_logs
GROUP BY username;

-- Daily vote statistics view
CREATE VIEW daily_vote_stats AS
SELECT 
  DATE(vote_time) as vote_date,
  site,
  COUNT(*) as total_attempts,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_votes,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_votes,
  COUNT(DISTINCT username) as unique_voters,
  SUM(nx_awarded) as total_nx_awarded
FROM vote_logs
GROUP BY DATE(vote_time), site
ORDER BY vote_date DESC;

-- User next vote availability view
CREATE VIEW user_next_vote AS
SELECT 
  username,
  site,
  MAX(vote_time) as last_vote_time,
  DATE_ADD(MAX(vote_time), INTERVAL 24 HOUR) as can_vote_at,
  CASE 
    WHEN DATE_ADD(MAX(vote_time), INTERVAL 24 HOUR) <= NOW() THEN 'Can Vote Now'
    ELSE CONCAT('Can vote in ', 
      FLOOR(TIMESTAMPDIFF(MINUTE, NOW(), DATE_ADD(MAX(vote_time), INTERVAL 24 HOUR)) / 60), 'h ',
      MOD(TIMESTAMPDIFF(MINUTE, NOW(), DATE_ADD(MAX(vote_time), INTERVAL 24 HOUR)), 60), 'm'
    )
  END as vote_status
FROM vote_logs
WHERE status = 'success'
GROUP BY username, site;

-- ==========================================
-- SECTION 7: CREATE VOTE HELPER FUNCTION
-- ==========================================

DELIMITER $$

CREATE FUNCTION can_user_vote(p_username VARCHAR(50), p_site VARCHAR(50))
RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE last_vote DATETIME;
    
    SELECT MAX(vote_time) INTO last_vote
    FROM vote_logs
    WHERE username = p_username 
    AND site = p_site 
    AND status = 'success';
    
    IF last_vote IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Check if 24 hours have passed
    IF DATE_ADD(last_vote, INTERVAL 24 HOUR) <= NOW() THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END$$

DELIMITER ;

-- Commit all changes
COMMIT;

-- ==========================================
-- SECTION 8: VERIFICATION AND RESULTS
-- ==========================================

-- Display results for forgot password system
SELECT '🔐 FORGOT PASSWORD SYSTEM' as System_Component;
SELECT 'Secret questions created:' as Info, COUNT(*) as Count FROM secret_questions;

-- Display results for vote system
SELECT '🗳️ VOTE SYSTEM' as System_Component;
SELECT 
    TABLE_NAME as 'Vote Table',
    TABLE_ROWS as 'Rows',
    DATE_FORMAT(CREATE_TIME, '%Y-%m-%d %H:%i:%s') as 'Created'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('vote_logs', 'vote_webhook_logs')
ORDER BY TABLE_NAME;

-- Display results for announcements system
SELECT '📢 ANNOUNCEMENTS SYSTEM' as System_Component;
SELECT 
    TABLE_NAME as 'Announcements Table',
    TABLE_ROWS as 'Rows',
    DATE_FORMAT(CREATE_TIME, '%Y-%m-%d %H:%i:%s') as 'Created'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'announcements';

-- Show accounts table structure (updated)
SELECT '👤 ACCOUNTS TABLE UPDATES' as System_Component;
DESCRIBE accounts;

-- Check PIN and PIC column status
SELECT 'PIN/PIC Column Status:' as Info;
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'accounts' 
AND COLUMN_NAME IN ('pin', 'pic', 'secret_question_id', 'secret_answer');

-- Show all indexes on accounts table
SELECT 'Accounts Table Indexes:' as Info;
SHOW INDEX FROM accounts;

-- Final success messages
SELECT '✅ COMPLETE MAPLECORE SYSTEM INSTALLED SUCCESSFULLY!' as Status;
SELECT '🔐 Forgot Password System: Ready' as Forgot_Password_Status;
SELECT '🗳️ Vote System: Ready' as Vote_System_Status;
SELECT '📢 Announcements System: Ready' as Announcements_Status;
SELECT '🔧 PIN and PIC columns: Now allow NULL values' as PIN_PIC_Status;