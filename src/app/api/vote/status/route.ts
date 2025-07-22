// src/app/api/vote/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware/auth';
import { query, queryOne } from '@/lib/db';

export const GET = requireAuth(async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user!.userId;
    const username = req.user!.username;

    // Get user info
    const user = await queryOne<any>(
      'SELECT nxCredit, votepoints FROM accounts WHERE id = ?',
      [userId]
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build vote site info from environment variables
    const baseUrl = process.env.GTOP100_VOTE_URL || 'https://gtop100.com';
    // Don't append username here - let the frontend handle it
    const voteUrl = baseUrl.includes('?') 
      ? `${baseUrl}&pingUsername=`
      : `${baseUrl}?vote=1&pingUsername=`;

    const site = {
      id: 1,
      name: 'Gtop100',
      url: voteUrl,
      nx_reward: parseInt(process.env.GTOP100_NX_REWARD || '8000'),
      cooldown_hours: parseInt(process.env.GTOP100_COOLDOWN_HOURS || '24'),
      icon: '🏆'
    };

    // Check last successful vote
    const lastVote = await queryOne<any>(
      `SELECT vote_time, nx_awarded FROM vote_logs 
       WHERE username = ? AND site = 'gtop100' AND status = 'success'
       ORDER BY vote_time DESC 
       LIMIT 1`,
      [username]
    );

    // Get today's rewards
    const todayResult = await queryOne<any>(
      `SELECT SUM(nx_awarded) as today_nx FROM vote_logs 
       WHERE username = ? AND DATE(vote_time) = CURDATE() AND status = 'success'`,
      [username]
    );

    const todayRewards = todayResult?.today_nx || 0;

    // Calculate vote status
    let voted = false;
    let canVoteAt = null;

    if (lastVote) {
      const lastVoteTime = new Date(lastVote.vote_time);
      const nextVoteTime = new Date(lastVoteTime.getTime() + (site.cooldown_hours * 60 * 60 * 1000));
      
      if (nextVoteTime > new Date()) {
        voted = true;
        canVoteAt = nextVoteTime.getTime();
      }
    }

    const voteStatus = {
      gtop100: {
        voted,
        pending: false,
        canVoteAt,
        lastVoteTime: lastVote ? new Date(lastVote.vote_time).getTime() : null
      }
    };

    // Get vote statistics
    const stats = await queryOne<any>(
      `SELECT 
        COUNT(DISTINCT DATE(vote_time)) as days_voted,
        COUNT(*) as total_successful_votes,
        SUM(nx_awarded) as total_nx_earned
      FROM vote_logs 
      WHERE username = ? AND status = 'success'`,
      [username]
    );

    // Get recent vote history
    const recentVotes = await query<any>(
      `SELECT site, vote_time, nx_awarded, status, failure_reason 
       FROM vote_logs 
       WHERE username = ? 
       ORDER BY vote_time DESC 
       LIMIT 10`,
      [username]
    );

    // Debug logging if enabled
    if (process.env.ENABLE_VOTE_WEBHOOK_DEBUG === 'true') {
      console.log(`[VOTE_DEBUG] Status check for ${username}: NX=${user.nxCredit}, Votes=${user.votepoints}`);
      console.log(`[VOTE_DEBUG] Vote URL: ${site.url}`);
    }

    return NextResponse.json({
      username,
      sites: [site], // Array for compatibility with frontend
      voteStatus,
      todayRewards,
      currentNX: user.nxCredit || 0,
      totalVotes: user.votepoints || 0,
      stats: {
        daysVoted: stats?.days_voted || 0,
        totalSuccessfulVotes: stats?.total_successful_votes || 0,
        totalNXEarned: stats?.total_nx_earned || 0
      },
      recentVotes: recentVotes || [],
      serverName: process.env.NEXT_PUBLIC_SERVER_NAME
    });

  } catch (error) {
    console.error('Vote status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vote status' },
      { status: 500 }
    );
  }
});