-- Complete Vote System Fresh Installation Script for MapleCore
-- This script drops all existing vote-related tables and recreates them from scratch
-- Compatible with MySQL 5.7 and 8.0

-- ============================================
-- STEP 1: DROP ALL EXISTING VOTE-RELATED OBJECTS
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
DROP TABLE IF EXISTS vote_sites;  -- Remove this table completely
DROP TABLE IF EXISTS vote_ip_cooldowns;
DROP TABLE IF EXISTS vote_cooldowns;
DROP TABLE IF EXISTS vote_rewards;
DROP TABLE IF EXISTS vote_history;

-- ============================================
-- STEP 2: CREATE FRESH TABLES
-- ============================================

-- 1. Create the vote_logs table
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

-- 2. Create vote_webhook_logs table (for debugging)
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

-- ============================================
-- STEP 3: NO DEFAULT DATA NEEDED
-- ============================================
-- All configuration comes from environment variables:
-- GTOP100_VOTE_URL, GTOP100_NX_REWARD, GTOP100_COOLDOWN_HOURS, etc.

-- ============================================
-- STEP 4: CREATE VIEWS FOR REPORTING
-- ============================================

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

-- ============================================
-- STEP 5: CREATE HELPER FUNCTION
-- ============================================

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
-- STEP 6: CREATE INDEXES ON ACCOUNTS TABLE
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

-- Add indexes to accounts table if they don't exist
CALL AddIndexIfNotExists('accounts', 'idx_accounts_name', 'name');
CALL AddIndexIfNotExists('accounts', 'idx_accounts_votepoints', 'votepoints');

-- Clean up the temporary procedure
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;

-- ============================================
-- STEP 7: DISPLAY INSTALLATION RESULTS
-- ============================================

SELECT '✅ Fresh vote system installation completed!' AS Status;

-- Show created tables
SELECT 
    TABLE_NAME as 'Table',
    TABLE_ROWS as 'Rows',
    DATE_FORMAT(CREATE_TIME, '%Y-%m-%d %H:%i:%s') as 'Created'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('vote_logs', 'vote_webhook_logs')
ORDER BY TABLE_NAME;

-- Show table structures (using standard SQL instead of \G)
SELECT '=== vote_logs table structure ===' as 'Table Structure';
SELECT 
    COLUMN_NAME as 'Column',
    DATA_TYPE as 'Type',
    IS_NULLABLE as 'Null',
    COLUMN_KEY as 'Key',
    COLUMN_DEFAULT as 'Default',
    EXTRA as 'Extra'
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'vote_logs'
ORDER BY ORDINAL_POSITION;

SELECT '=== vote_webhook_logs table structure ===' as 'Table Structure';
SELECT 
    COLUMN_NAME as 'Column',
    DATA_TYPE as 'Type',
    IS_NULLABLE as 'Null',
    COLUMN_KEY as 'Key',
    COLUMN_DEFAULT as 'Default',
    EXTRA as 'Extra'
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'vote_webhook_logs'
ORDER BY ORDINAL_POSITION;

-- Final summary
SELECT 
    'vote_logs' as TableName,
    COUNT(*) as RecordCount
FROM vote_logs
UNION ALL
SELECT 
    'vote_webhook_logs' as TableName,
    COUNT(*) as RecordCount
FROM vote_webhook_logs;