-- ==========================================
-- MAPLECORE COMPLETE SYSTEM SETUP
-- Includes: Vote System + Forgot Password System + Announcements System
-- BACKUP YOUR DATABASE BEFORE RUNNING THIS!
-- Compatible with MySQL 5.7 and 8.0
-- ==========================================

START TRANSACTION;

-- ============================================
-- PART 1: VOTE SYSTEM INSTALLATION
-- ============================================

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS user_vote_summary;
DROP VIEW IF EXISTS daily_vote_stats;
DROP VIEW IF EXISTS user_next_vote;

-- Drop functions
DROP FUNCTION IF EXISTS can_user_vote;

-- Drop stored procedures if they exist
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
DROP PROCEDURE IF EXISTS DropColumnIfExists;
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;
DROP PROCEDURE IF EXISTS DropIndexIfExists;

-- Drop all vote-related tables
DROP TABLE IF EXISTS vote_webhook_logs;
DROP TABLE IF EXISTS vote_logs;
DROP TABLE IF EXISTS vote_sites;
DROP TABLE IF EXISTS vote_ip_cooldowns;
DROP TABLE IF EXISTS vote_cooldowns;
DROP TABLE IF EXISTS vote_rewards;
DROP TABLE IF EXISTS vote_history;

-- Create vote_logs table
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

-- Create vote system views
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

-- Create vote helper function
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

-- ============================================
-- PART 2: FORGOT PASSWORD SYSTEM
-- ============================================

-- Drop forgot password related tables first
DROP TABLE IF EXISTS password_reset_attempts;
DROP TABLE IF EXISTS secret_questions;

-- Drop foreign key constraint if exists
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                  WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = 'accounts' 
                  AND CONSTRAINT_NAME = 'fk_secret_question');

SET @sql = IF(@fk_exists > 0, 
    'ALTER TABLE accounts DROP FOREIGN KEY fk_secret_question',
    'SELECT "fk_secret_question does not exist" as Info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add columns to accounts table if they don't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'accounts' 
                   AND COLUMN_NAME = 'secret_question_id');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE accounts ADD COLUMN secret_question_id INT DEFAULT NULL',
    'SELECT "secret_question_id already exists" as Info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'accounts' 
                   AND COLUMN_NAME = 'secret_answer');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE accounts ADD COLUMN secret_answer VARCHAR(255) DEFAULT NULL',
    'SELECT "secret_answer already exists" as Info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'accounts' 
                   AND COLUMN_NAME = 'password_reset_token');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE accounts ADD COLUMN password_reset_token VARCHAR(255) DEFAULT NULL',
    'SELECT "password_reset_token already exists" as Info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'accounts' 
                   AND COLUMN_NAME = 'password_reset_expires');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE accounts ADD COLUMN password_reset_expires TIMESTAMP NULL DEFAULT NULL',
    'SELECT "password_reset_expires already exists" as Info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create secret questions table
CREATE TABLE secret_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    question_text VARCHAR(500) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default secret questions
INSERT INTO secret_questions (question_text) VALUES
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

-- Create password reset attempts table
CREATE TABLE password_reset_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT FALSE,
    INDEX idx_account_time (account_id, attempt_time),
    INDEX idx_ip_time (ip_address, attempt_time),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Add foreign key constraint for secret questions
ALTER TABLE accounts 
ADD CONSTRAINT fk_secret_question 
FOREIGN KEY (secret_question_id) REFERENCES secret_questions(id);

-- ============================================
-- PART 3: CREATE INDEXES AND FIX COLUMNS
-- ============================================

-- Create procedure to safely add indexes
DELIMITER $$

CREATE PROCEDURE AddIndexIfNotExists(
    IN tableName VARCHAR(128),
    IN indexName VARCHAR(128),
    IN indexColumns VARCHAR(256)
)
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.statistics
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = tableName
        AND INDEX_NAME = indexName
    ) THEN
        SET @sql = CONCAT('ALTER TABLE `', tableName, '` ADD INDEX `', indexName, '` (', indexColumns, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

-- Add all necessary indexes
CALL AddIndexIfNotExists('accounts', 'idx_accounts_name', 'name');
CALL AddIndexIfNotExists('accounts', 'idx_accounts_votepoints', 'votepoints');
CALL AddIndexIfNotExists('accounts', 'idx_password_reset_token', 'password_reset_token');
CALL AddIndexIfNotExists('accounts', 'idx_password_reset_expires', 'password_reset_expires');
CALL AddIndexIfNotExists('accounts', 'idx_secret_answer', 'secret_answer');
CALL AddIndexIfNotExists('accounts', 'idx_email', 'email');

-- Fix PIN and PIC columns to allow NULL
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

-- Clean up temporary procedure
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;

-- ============================================
-- PART 4: ANNOUNCEMENTS SYSTEM
-- ============================================

-- Drop announcements table if exists
DROP TABLE IF EXISTS `announcements`;

-- Create announcements table fresh
CREATE TABLE `announcements` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `type` ENUM('event', 'update', 'maintenance') NOT NULL DEFAULT 'event',
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `active` TINYINT(1) NOT NULL DEFAULT '1',
  `priority` INT NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_active` (`active`),
  KEY `idx_priority` (`priority`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Commit all changes
COMMIT;

-- ============================================
-- VERIFICATION AND SUMMARY
-- ============================================

SELECT '✅ COMPLETE MAPLECORE SYSTEM INSTALLATION FINISHED!' AS Status;

-- Vote System Summary
SELECT '=== VOTE SYSTEM STATUS ===' as 'System Check';
SELECT 
    TABLE_NAME as 'Vote Tables Created',
    TABLE_ROWS as 'Rows'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('vote_logs', 'vote_webhook_logs')
ORDER BY TABLE_NAME;

-- Password Reset System Summary
SELECT '=== PASSWORD RESET SYSTEM STATUS ===' as 'System Check';
SELECT 
    'Secret Questions' as 'Component',
    COUNT(*) as 'Count'
FROM secret_questions
UNION ALL
SELECT 
    'Password Reset Attempts Table' as 'Component',
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.TABLES 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'password_reset_attempts')
        THEN 'Created'
        ELSE 'Failed'
    END as 'Count';

-- Announcements System Summary
SELECT '=== ANNOUNCEMENTS SYSTEM STATUS ===' as 'System Check';
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.TABLES 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'announcements')
        THEN 'Announcements Table Created'
        ELSE 'Announcements Table Failed'
    END as 'Status';

-- Show important columns in accounts table
SELECT '=== ACCOUNTS TABLE MODIFICATIONS ===' as 'System Check';
SELECT 
    COLUMN_NAME as 'Column',
    DATA_TYPE as 'Type',
    IS_NULLABLE as 'Nullable',
    COLUMN_DEFAULT as 'Default'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'accounts' 
AND COLUMN_NAME IN ('secret_question_id', 'secret_answer', 'password_reset_token', 
                    'password_reset_expires', 'pin', 'pic', 'votepoints')
ORDER BY COLUMN_NAME;

-- Final summary
SELECT '🎉 Vote System, Forgot Password System, and Announcements System installed successfully!' as 'Final Status';
SELECT '📝 Remember to configure your environment variables for the vote system!' as 'Important Note';