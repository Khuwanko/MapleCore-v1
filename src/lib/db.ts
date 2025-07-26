// src/lib/db.ts
// Secure database configuration with connection pooling

import mysql from 'mysql2/promise';

// Create a connection pool instead of individual connections
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306'),
  
  // Connection pool settings
  waitForConnections: true,
  connectionLimit: 10,      // Max 10 connections
  queueLimit: 0,           // Unlimited queue
  
  // Security settings
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  
  // Timeouts
  connectTimeout: 60000,    // 60 seconds
  
  // SSL (uncomment in production)
  // ssl: {
  //   rejectUnauthorized: true
  // }
});

// Test connection on startup
pool.getConnection()
  .then(connection => {
    console.log('Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });

// Export pool for use in API routes
export default pool;

// ==========================================
// SECURE QUERY HELPERS
// ==========================================

// Execute query with automatic connection handling
export async function query<T = any>(
  sql: string, 
  params?: any[]
): Promise<T[]> {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows as T[];
  } catch (error) {
    console.error('Database query error:', error);
    throw new Error('Database operation failed');
  }
}

// Execute single row query
export async function queryOne<T = any>(
  sql: string, 
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] || null;
}

// Transaction helper
export async function transaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// ==========================================
// COMMON SECURE QUERIES
// ==========================================

export const secureQueries = {
  // User queries - UPDATED with secret question support
  getUserByUsername: async (username: string) => {
    return queryOne(
      `SELECT id, name, password, banned, email, nxCredit, votepoints, 
              secret_question_id, secret_answer, password_reset_token, password_reset_expires
       FROM accounts WHERE name = ? LIMIT 1`,
      [username]
    );
  },

  getUserByEmail: async (email: string) => {
    return queryOne(
      `SELECT id, name, password, banned, email, nxCredit, votepoints, 
              secret_question_id, secret_answer
       FROM accounts WHERE email = ? LIMIT 1`,
      [email]
    );
  },

  getUserById: async (userId: number) => {
    return queryOne(
      `SELECT id, name, email, createdat, nxCredit, votepoints, 
              secret_question_id, secret_answer
       FROM accounts WHERE id = ? LIMIT 1`,
      [userId]
    );
  },

  // UPDATED: Create user with secret question
  createUser: async (username: string, hashedPassword: string, email: string, birthday: string, secretQuestionId?: number, secretAnswer?: string) => {
    if (secretQuestionId && secretAnswer) {
      const result = await query(
        `INSERT INTO accounts (name, password, email, birthday, secret_question_id, secret_answer, createdat) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [username, hashedPassword, email, birthday, secretQuestionId, secretAnswer.toLowerCase().trim()]
      );
      return (result as any).insertId;
    } else {
      // Legacy support for accounts without secret questions
      const result = await query(
        'INSERT INTO accounts (name, password, email, birthday, createdat) VALUES (?, ?, ?, ?, NOW())',
        [username, hashedPassword, email, birthday]
      );
      return (result as any).insertId;
    }
  },

  updatePassword: async (userId: number, hashedPassword: string) => {
    await query(
      'UPDATE accounts SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );
  },

  // NEW: Reset password and clear PIN/PIC for security
  resetUserPassword: async (userId: number, newHashedPassword: string) => {
    await query(
      `UPDATE accounts 
       SET password = ?, 
           password_reset_token = NULL, 
           password_reset_expires = NULL,
           pin = NULL,
           pic = NULL
       WHERE id = ?`,
      [newHashedPassword, userId]
    );
  },

  // NEW: Secret Questions Management
  getSecretQuestions: async () => {
    return query(
      'SELECT id, question_text, is_active, created_at FROM secret_questions WHERE is_active = TRUE ORDER BY id'
    );
  },

  getSecretQuestionById: async (questionId: number) => {
    return queryOne(
      'SELECT id, question_text, is_active, created_at FROM secret_questions WHERE id = ? AND is_active = TRUE',
      [questionId]
    );
  },

  getUserSecretQuestion: async (userId: number) => {
    const result = await queryOne<{ question_text: string }>(
      `SELECT sq.question_text 
       FROM accounts a 
       JOIN secret_questions sq ON a.secret_question_id = sq.id 
       WHERE a.id = ? AND sq.is_active = TRUE`,
      [userId]
    );
    return result?.question_text || null;
  },

  updateSecretQuestion: async (userId: number, secretQuestionId: number, secretAnswer: string) => {
    await query(
      'UPDATE accounts SET secret_question_id = ?, secret_answer = ? WHERE id = ?',
      [secretQuestionId, secretAnswer.toLowerCase().trim(), userId]
    );
  },

  // NEW: Password Reset Attempt Logging
  logPasswordResetAttempt: async (accountId: number, ipAddress: string, success: boolean) => {
    await query(
      'INSERT INTO password_reset_attempts (account_id, ip_address, success) VALUES (?, ?, ?)',
      [accountId, ipAddress, success]
    );
  },

  getPasswordResetAttempts: async (accountId?: number, ipAddress?: string, timeWindowMinutes: number = 60) => {
    let sql = `
      SELECT COUNT(*) as count 
      FROM password_reset_attempts 
      WHERE attempt_time > DATE_SUB(NOW(), INTERVAL ? MINUTE)
    `;
    const params: any[] = [timeWindowMinutes];

    if (accountId) {
      sql += ' AND account_id = ?';
      params.push(accountId);
    }

    if (ipAddress) {
      sql += ' AND ip_address = ?';
      params.push(ipAddress);
    }

    const result = await queryOne<{ count: number }>(sql, params);
    return result?.count || 0;
  },

  cleanupOldPasswordResetAttempts: async (daysOld: number = 30) => {
    await query(
      'DELETE FROM password_reset_attempts WHERE attempt_time < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [daysOld]
    );
  },

  // Character queries - UPDATED to include appearance data
  getCharactersByAccountId: async (accountId: number) => {
    return query(
      `SELECT 
        id, 
        accountid,
        name, 
        level, 
        job, 
        exp, 
        meso, 
        str, 
        dex, 
        \`int\`, 
        luk,
        hp,
        mp,
        maxhp,
        maxmp,
        skincolor,
        gender,
        hair,
        face,
        fame,
        map,
        spawnpoint,
        gm,
        world,
        guildid,
        guildrank
       FROM characters 
       WHERE accountid = ? 
       ORDER BY level DESC, exp DESC`,
      [accountId]
    );
  },

  // NEW: Get character equipment
  getCharacterEquipment: async (characterId: number) => {
    const items = await query<{ itemid: number; position: number }>(
      `SELECT itemid, position
      FROM inventoryitems
      WHERE characterid = ? AND inventorytype = -1
      ORDER BY position DESC`, // Order by position DESC so cash items (-101) come before regular (-1)
      [characterId]
    );

    const equipment: { [key: string]: number } = {};
    
    // Process all items - cash items will naturally override regular items
    // because they have lower position numbers (-101 vs -1)
    items.forEach(item => {
      const slot = mapEquipmentPosition(item.position);
      if (slot) {
        // Only set if slot is empty OR this is a cash item overriding regular item
        if (!equipment[slot] || item.position <= -101) {
          equipment[slot] = item.itemid;
        }
      }
    });

    return equipment;
  },

  // NEW: Get multiple characters' equipment in one query
  getCharactersEquipment: async (characterIds: number[]) => {
    if (characterIds.length === 0) return [];
    
    const placeholders = characterIds.map(() => '?').join(',');
    const allItems = await query<{ characterid: number; itemid: number; position: number }>(
      `SELECT characterid, itemid, position
      FROM inventoryitems
      WHERE characterid IN (${placeholders}) AND inventorytype = -1
      ORDER BY characterid, position`,
      characterIds
    );

    // Group by character and apply cash override logic
    const result: { [characterId: number]: { [slot: string]: number } } = {};
    
    // Initialize all characters
    characterIds.forEach(id => {
      result[id] = {};
    });

    // First pass: add regular items
    allItems.forEach(item => {
      const slot = mapEquipmentPosition(item.position);
      if (slot && item.position >= -11 && item.position <= -1) {
        result[item.characterid][slot] = item.itemid;
      }
    });

    // Second pass: override with cash items
    allItems.forEach(item => {
      const slot = mapEquipmentPosition(item.position);
      if (slot && item.position >= -111 && item.position <= -101) {
        result[item.characterid][slot] = item.itemid; // Override regular item
      }
    });

    return result;
  },

  getMainCharacter: async (accountId: number) => {
    return queryOne(
      `SELECT name, level, job 
       FROM characters 
       WHERE accountid = ? 
       ORDER BY level DESC 
       LIMIT 1`,
      [accountId]
    );
  },

  // NEW: Get full character details with equipment
  getCharacterWithEquipment: async (characterId: number) => {
    const character = await queryOne(
      `SELECT 
        c.*,
        g.name as guildname
       FROM characters c
       LEFT JOIN guilds g ON c.guildid = g.guildid
       WHERE c.id = ?`,
      [characterId]
    );

    if (!character) return null;

    const equipment = await secureQueries.getCharacterEquipment(characterId);
    return { ...character, equipment };
  },

  // Admin queries - Check gm status in characters table
  isUserAdmin: async (userId: number) => {
    const result = await queryOne<{ isAdmin: number }>(
      `SELECT COUNT(*) as isAdmin 
       FROM characters 
       WHERE accountid = ? AND gm >= 6 
       LIMIT 1`,
      [userId]
    );
    return (result?.isAdmin || 0) > 0;
  },

  // Vote queries
  recordVote: async (userId: number, site: string, nxReward: number) => {
    await transaction(async (conn) => {
      // Record vote
      await conn.execute(
        'INSERT INTO vote_logs (user_id, site, voted_at, nx_reward) VALUES (?, ?, NOW(), ?)',
        [userId, site, nxReward]
      );
      
      // Update user NX (nxCredit) and vote points
      await conn.execute(
        'UPDATE accounts SET nxCredit = nxCredit + ?, votepoints = votepoints + 1 WHERE id = ?',
        [nxReward, userId]
      );
    });
  },

  getVoteStatus: async (userId: number, site: string, cooldownHours: number = 12) => {
    return queryOne<{ lastVote: Date }>(
      `SELECT voted_at as lastVote 
       FROM vote_records 
       WHERE user_id = ? AND site = ? 
       AND voted_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
       ORDER BY voted_at DESC 
       LIMIT 1`,
      [userId, site, cooldownHours]
    );
  },

  // NEW: Rankings queries
  getTopRankings: async (limit: number = 100) => {
    return query(
      `SELECT 
        c.id,
        c.name,
        c.level,
        c.job,
        c.exp,
        c.fame,
        c.guildid,
        g.name as guildname,
        @rank := @rank + 1 as rank
       FROM characters c
       LEFT JOIN guilds g ON c.guildid = g.guildid
       CROSS JOIN (SELECT @rank := 0) r
       WHERE c.gm = 0
       ORDER BY c.level DESC, c.exp DESC
       LIMIT ?`,
      [limit]
    );
  },

  getUserRanking: async (accountId: number) => {
    // Get the highest level character for this account
    const mainChar = await queryOne<{ id: number; level: number; exp: number }>(
      `SELECT id, level, exp 
       FROM characters 
       WHERE accountid = ? AND gm = 0
       ORDER BY level DESC, exp DESC 
       LIMIT 1`,
      [accountId]
    );

    if (!mainChar) return null;

    // Calculate rank
    const rankResult = await queryOne<{ rank: number }>(
      `SELECT COUNT(*) + 1 as rank
       FROM characters
       WHERE gm = 0 AND (
         level > ? OR 
         (level = ? AND exp > ?)
       )`,
      [mainChar.level, mainChar.level, mainChar.exp]
    );

    // Get full character details
    const character = await queryOne(
      `SELECT 
        c.id,
        c.name,
        c.level,
        c.job,
        c.exp,
        c.fame,
        c.guildid,
        g.name as guildname
       FROM characters c
       LEFT JOIN guilds g ON c.guildid = g.guildid
       WHERE c.id = ?`,
      [mainChar.id]
    );

    return character ? { ...character, rank: rankResult?.rank || 0 } : null;
  },

  // NEW: Get online count
  getOnlineCount: async () => {
    const result = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM accounts WHERE loggedin = 2',
      []
    );
    return result?.count || 0;
  },

  // NEW: Update character image hash (for caching)
  updateCharacterHash: async (characterId: number, hash: string) => {
    await query(
      `INSERT INTO chrimg (id, hash) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE hash = VALUES(hash)`,
      [characterId, hash]
    );
  },

  getCharacterHash: async (characterId: number) => {
    const result = await queryOne<{ hash: string }>(
      'SELECT hash FROM chrimg WHERE id = ?',
      [characterId]
    );
    return result?.hash || null;
  }
};

// ==========================================
// SQL INJECTION PREVENTION HELPERS
// ==========================================

// NEVER use these for user input - only for system-generated values
export function escapeIdentifier(identifier: string): string {
  // For table/column names that can't be parameterized
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error('Invalid identifier');
  }
  return `\`${identifier}\``;
}

// Validate sort order
export function validateSortOrder(order: string): 'ASC' | 'DESC' {
  const upperOrder = order.toUpperCase();
  if (upperOrder !== 'ASC' && upperOrder !== 'DESC') {
    throw new Error('Invalid sort order');
  }
  return upperOrder as 'ASC' | 'DESC';
}

// Equipment position mapping helper
export function mapEquipmentPosition(position: number): string | null {
  const positionMap: { [key: number]: string } = {
    '-1': 'cap', '-101': 'cap',
    '-2': 'mask', '-102': 'mask',
    '-3': 'eyes', '-103': 'eyes',
    '-4': 'ears', '-104': 'ears',
    '-5': 'coat', '-105': 'coat',
    '-6': 'pants', '-106': 'pants',
    '-7': 'shoes', '-107': 'shoes',
    '-8': 'glove', '-108': 'glove',
    '-9': 'cape', '-109': 'cape',
    '-10': 'shield', '-110': 'shield',
    '-11': 'weapon', '-111': 'weapon'
  };
  
  return positionMap[position] || null;
}