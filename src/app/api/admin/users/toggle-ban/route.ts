// src/app/api/admin/users/toggle-ban/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AuthenticatedRequest } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import { z } from 'zod';

const toggleBanSchema = z.object({
  userId: z.number().positive(),
  banStatus: z.number().min(0).max(1)
});

export const POST = requireAdmin(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const { userId, banStatus } = toggleBanSchema.parse(body);

    // Update ban status
    await query(
      'UPDATE accounts SET banned = ? WHERE id = ?',
      [banStatus, userId]
    );

    console.log(`Admin ${req.user!.username} ${banStatus === 1 ? 'banned' : 'unbanned'} user ID: ${userId}`);

    return NextResponse.json({
      success: true,
      message: `User ${banStatus === 1 ? 'banned' : 'unbanned'} successfully`
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    console.error('Toggle ban error:', error);
    return NextResponse.json(
      { error: 'Failed to update ban status' },
      { status: 500 }
    );
  }
});