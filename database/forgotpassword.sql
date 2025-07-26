-- ==========================================
-- MAPLECORE FORGOT PASSWORD SYSTEM - COMPLETE SETUP
-- Single SQL file to run everything at once
-- BACKUP YOUR DATABASE BEFORE RUNNING THIS!
-- ==========================================

START TRANSACTION;

-- Add new columns to existing accounts table
ALTER TABLE accounts 
ADD COLUMN secret_question_id INT DEFAULT NULL,
ADD COLUMN secret_answer VARCHAR(255) DEFAULT NULL,
ADD COLUMN password_reset_token VARCHAR(255) DEFAULT NULL,
ADD COLUMN password_reset_expires TIMESTAMP NULL DEFAULT NULL;

-- Create secret questions table
CREATE TABLE secret_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    question_text VARCHAR(500) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert all 15 default secret questions
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

-- Create password reset attempts table for security monitoring
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

-- Add indexes for better performance
CREATE INDEX idx_password_reset_token ON accounts(password_reset_token);
CREATE INDEX idx_password_reset_expires ON accounts(password_reset_expires);
CREATE INDEX idx_secret_answer ON accounts(secret_answer);

-- Add email index if it doesn't exist (ignore if already exists)
CREATE INDEX idx_email ON accounts(email);

-- ==========================================
-- FIX PIN AND PIC COLUMNS TO ALLOW NULL
-- This fixes the "Column 'pin' cannot be null" error
-- ==========================================

-- Check if PIN column exists and modify it to allow NULL
SET @pin_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'accounts' 
                   AND COLUMN_NAME = 'pin');

-- Only modify PIN column if it exists
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

-- Only modify PIC column if it exists
SET @pic_sql = IF(@pic_exists > 0, 
    'ALTER TABLE accounts MODIFY COLUMN pic VARCHAR(255) NULL DEFAULT NULL',
    'SELECT "PIC column does not exist, skipping..." as Info');

PREPARE stmt FROM @pic_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Commit all changes
COMMIT;

-- ==========================================
-- VERIFICATION - Check if everything was created correctly
-- ==========================================

-- Display final accounts table structure
SELECT 'Accounts table structure:' as Info;
DESCRIBE accounts;

-- Show count of secret questions
SELECT 'Secret questions created:' as Info, COUNT(*) as Count FROM secret_questions;

-- Show first few secret questions
SELECT 'Sample secret questions:' as Info;
SELECT id, question_text FROM secret_questions LIMIT 5;

-- Show password reset attempts table structure
SELECT 'Password reset attempts table:' as Info;
DESCRIBE password_reset_attempts;

-- Show all indexes on accounts table
SELECT 'Accounts table indexes:' as Info;
SHOW INDEX FROM accounts;

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
AND COLUMN_NAME IN ('pin', 'pic');

-- Final success message
SELECT '✅ FORGOT PASSWORD SYSTEM INSTALLED SUCCESSFULLY!' as Status;
SELECT '🔧 PIN and PIC columns now allow NULL values for password reset!' as PIN_PIC_Status;