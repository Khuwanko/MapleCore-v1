// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AuthenticatedRequest } from '@/lib/middleware/auth';
import { query } from '@/lib/db';

export const GET = requireAdmin(async (req: AuthenticatedRequest) => {
  try {
    // Get all users with essential fields
    const users = await query<any>(
      `SELECT 
        id, 
        name, 
        email, 
        createdat,
        lastlogin,
        banned,
        nxCredit,
        votepoints,
        webadmin,
        loggedin
      FROM accounts 
      ORDER BY id DESC
      LIMIT 200`
    );

    // Get characters for all users in one query
    if (users.length > 0) {
      const userIds = users.map((u: any) => u.id);
      const placeholders = userIds.map(() => '?').join(',');
      
      const characters = await query<any>(
        `SELECT 
          id,
          accountid,
          name,
          level,
          meso,
          job,
          exp,
          str,
          dex,
          \`int\`,
          luk,
          maxhp,
          maxmp
        FROM characters 
        WHERE accountid IN (${placeholders})
        ORDER BY level DESC`,
        userIds
      );

      // Create a map of characters by account ID
      const charactersByAccount: { [key: number]: any[] } = {};
      characters.forEach((char: any) => {
        if (!charactersByAccount[char.accountid]) {
          charactersByAccount[char.accountid] = [];
        }
        charactersByAccount[char.accountid].push(char);
      });

      // Add characters to each user
      users.forEach((user: any) => {
        user.characters = charactersByAccount[user.id] || [];
      });
    }

    return NextResponse.json({ 
      users,
      total: users.length
    });

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
});