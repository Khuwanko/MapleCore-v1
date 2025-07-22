// src/app/api/vote/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool, { transaction, query, queryOne } from '@/lib/db';

// Load configuration from environment variables
const VOTE_CONFIG = {
  gtop100: {
    pingbackKey: process.env.GTOP100_PINGBACK_KEY!,
    nxReward: parseInt(process.env.GTOP100_NX_REWARD || '8000'),
    cooldownHours: parseInt(process.env.GTOP100_COOLDOWN_HOURS || '24'),
    siteId: process.env.GTOP100_SITE_ID || '104927'
  },
  features: {
    enableLogging: process.env.ENABLE_VOTE_LOGGING === 'true',
    enableDebug: process.env.ENABLE_VOTE_WEBHOOK_DEBUG === 'true'
  }
};

// Get client IP from headers
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const cloudflare = request.headers.get('cf-connecting-ip');
  
  if (cloudflare) return cloudflare;
  if (forwarded) return forwarded.split(',')[0].trim();
  if (real) return real;
  
  return 'unknown';
}

// Debug logger that only logs if debug is enabled
function debugLog(...args: any[]) {
  if (VOTE_CONFIG.features.enableDebug) {
    console.log('[VOTE_DEBUG]', ...args);
  }
}

export async function POST(request: NextRequest) {
  console.log('🔔 Vote webhook received!');
  
  const clientIp = getClientIp(request);
  debugLog('Client IP:', clientIp);
  debugLog('Headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    const contentType = request.headers.get('content-type') || '';
    let pingbackData: any[] = [];

    if (contentType.includes('application/json')) {
      // Handle JSON format (recommended by Gtop100)
      const jsonData = await request.json();
      debugLog('JSON data received:', jsonData);
      
      if (!jsonData || !jsonData.Common) {
        console.log('Invalid JSON structure');
        return new Response('Invalid JSON data.', { status: 400 });
      }

      const pingbackkey = jsonData.pingbackkey;
      
      // Verify pingback key
      if (pingbackkey !== VOTE_CONFIG.gtop100.pingbackKey) {
        console.log('Invalid pingback key');
        return new Response('Invalid pingback key.', { status: 403 });
      }

      // Verify site ID if provided
      if (jsonData.siteid && jsonData.siteid !== VOTE_CONFIG.gtop100.siteId) {
        debugLog(`Site ID mismatch: expected ${VOTE_CONFIG.gtop100.siteId}, got ${jsonData.siteid}`);
      }

      // Process each vote in the Common array
      for (const entry of jsonData.Common) {
        const mappedData: any = {};
        for (const subEntry of entry) {
          Object.assign(mappedData, subEntry);
        }

        pingbackData.push({
          success: Math.abs(parseInt(mappedData.success || '1')),
          reason: mappedData.reason,
          username: mappedData.pb_name,
          voterIp: mappedData.ip,
          site: 'gtop100'
        });
      }

    } else {
      // Handle POST form data format
      const formData = await request.formData();
      debugLog('Form data received');
      
      const success = Math.abs(parseInt(formData.get('Successful')?.toString() || '1'));
      const reason = formData.get('Reason')?.toString();
      const username = formData.get('pingUsername')?.toString();
      const voterIp = formData.get('VoterIP')?.toString();
      const pingbackkey = formData.get('pingbackkey')?.toString();

      // Verify pingback key
      if (pingbackkey !== VOTE_CONFIG.gtop100.pingbackKey) {
        console.log('Invalid pingback key');
        return new Response('Invalid pingback key.', { status: 403 });
      }

      pingbackData.push({
        success,
        reason,
        username,
        voterIp,
        site: 'gtop100'
      });
    }

    const processedVotes: string[] = [];
    const failedVotes: string[] = [];

    // Log webhook attempt if enabled
    if (VOTE_CONFIG.features.enableLogging) {
      await query(
        `INSERT INTO vote_webhook_logs (ip_address, request_type, username, success_flag, reason, processed) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          clientIp, 
          contentType.includes('application/json') ? 'JSON' : 'FORM',
          pingbackData[0]?.username || 'unknown',
          pingbackData[0]?.success || 1,
          pingbackData[0]?.reason || null,
          false
        ]
      );
    }

    // Process each vote
    for (const vote of pingbackData) {
      const { success, reason, username, voterIp, site } = vote;

      console.log(`Processing vote: username=${username}, success=${success}, reason=${reason}`);

      if (!username) {
        console.log('Vote received without username');
        continue;
      }

      // IMPORTANT: Trust Gtop100's validation
      // If success = 0, the vote is valid according to Gtop100
      if (success !== 0) {
        // Vote failed on Gtop100's end
        console.log(`Failed vote for ${username}: ${reason}`);
        
        // Log the failed vote for records
        await query(
          `INSERT INTO vote_logs (username, site, vote_time, nx_awarded, ip_address, status, failure_reason) 
           VALUES (?, ?, NOW(), 0, ?, 'failed', ?)`,
          [username, site, voterIp || clientIp, reason || 'Vote rejected by Gtop100']
        );
        
        failedVotes.push(`${username}: ${reason || 'Failed'}`);
        continue;
      }

      // Vote was successful on Gtop100 - process the reward
      try {
        await transaction(async (connection) => {
          // Check if user exists and get current NX
          const [accountRows] = await connection.execute(
            'SELECT id, name, nxCredit, votepoints FROM accounts WHERE name = ? FOR UPDATE',
            [username]
          );

          if (!Array.isArray(accountRows) || accountRows.length === 0) {
            console.log(`Vote received for non-existent user: ${username}`);
            
            // Log the invalid attempt
            await connection.execute(
              `INSERT INTO vote_logs (username, site, vote_time, nx_awarded, ip_address, status, failure_reason) 
               VALUES (?, ?, NOW(), 0, ?, 'failed', 'User not found')`,
              [username, site, voterIp || clientIp]
            );
            
            failedVotes.push(`${username}: User not found`);
            return;
          }

          const account = accountRows[0] as any;
          
          // Calculate new NX amount using environment variable
          const currentNX = parseInt(account.nxCredit?.toString() || '0');
          const currentVotePoints = parseInt(account.votepoints?.toString() || '0');
          const nxReward = VOTE_CONFIG.gtop100.nxReward;
          const newNXAmount = currentNX + nxReward;
          const newVotePoints = currentVotePoints + 1;

          console.log(`Rewarding ${username}: ${currentNX} -> ${newNXAmount} NX (+${nxReward})`);

          // Update NX and vote points
          const [updateResult] = await connection.execute(
            'UPDATE accounts SET nxCredit = ?, votepoints = ? WHERE name = ?',
            [newNXAmount, newVotePoints, username]
          );

          if ((updateResult as any).affectedRows > 0) {
            // Log the successful vote
            await connection.execute(
              `INSERT INTO vote_logs (username, site, vote_time, nx_awarded, ip_address, status) 
               VALUES (?, ?, NOW(), ?, ?, 'success')`,
              [username, site, nxReward, voterIp || clientIp]
            );

            console.log(`✅ Vote processed successfully: ${username} received ${nxReward} NX`);
            processedVotes.push(`${username}: +${nxReward} NX (Total: ${newNXAmount})`);
          } else {
            console.log(`❌ Failed to update account for ${username}`);
            failedVotes.push(`${username}: Database update failed`);
          }
        });
      } catch (error) {
        console.error(`❌ Transaction error for ${username}:`, error);
        failedVotes.push(`${username}: Transaction error`);
      }
    }

    // Update webhook log as processed
    if (VOTE_CONFIG.features.enableLogging && pingbackData.length > 0) {
      await query(
        `UPDATE vote_webhook_logs 
         SET processed = TRUE 
         WHERE username = ? 
         ORDER BY received_at DESC 
         LIMIT 1`,
        [pingbackData[0].username]
      );
    }

    // Build response message
    const responseLines = [];
    if (processedVotes.length > 0) {
      responseLines.push(`✅ Successful: ${processedVotes.length} votes`);
      responseLines.push(...processedVotes);
    }
    if (failedVotes.length > 0) {
      responseLines.push(`⚠️ Failed: ${failedVotes.length} votes`);
      responseLines.push(...failedVotes);
    }
    if (responseLines.length === 0) {
      responseLines.push('No votes processed');
    }

    const responseMessage = responseLines.join('\n');
    console.log('\n' + responseMessage);
    
    // Return 200 as required by Gtop100
    return new Response(responseMessage, { status: 200 });

  } catch (error) {
    console.error('❌ Vote webhook error:', error);
    
    // Log error if enabled
    if (VOTE_CONFIG.features.enableLogging) {
      await query(
        `INSERT INTO vote_webhook_logs (ip_address, request_type, error_message, processed) 
         VALUES (?, 'ERROR', ?, FALSE)`,
        [clientIp, error instanceof Error ? error.message : 'Unknown error']
      );
    }
    
    // Still return 200 to prevent retry spam from Gtop100
    return new Response('Internal server error', { status: 200 });
  }
}

// Handle GET requests for webhook verification
export async function GET(request: NextRequest) {
  const serverName = process.env.NEXT_PUBLIC_SERVER_NAME;
  return new Response(`${serverName} Gtop100 webhook endpoint active`, { status: 200 });
}