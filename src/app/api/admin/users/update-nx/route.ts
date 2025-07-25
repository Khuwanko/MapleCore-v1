// src/app/api/admin/users/update-nx/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AuthenticatedRequest } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import { z } from 'zod';

const updateNXSchema = z.object({
  userId: z.number().positive(),
  amount: z.number().min(0)
});

export const POST = requireAdmin(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const { userId, amount } = updateNXSchema.parse(body);

    // Update NX Credits
    await query(
      'UPDATE accounts SET nxCredit = ? WHERE id = ?',
      [amount, userId]
    );

    console.log(`Admin ${req.user!.username} updated NX for user ID ${userId} to ${amount}`);

    return NextResponse.json({
      success: true,
      message: 'NX Credits updated successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    console.error('Update NX error:', error);
    return NextResponse.json(
      { error: 'Failed to update NX Credits' },
      { status: 500 }
    );
  }
});