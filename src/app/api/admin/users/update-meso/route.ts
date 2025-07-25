// src/app/api/admin/characters/update-meso/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AuthenticatedRequest } from '@/lib/middleware/auth';
import { query } from '@/lib/db';
import { z } from 'zod';

const updateMesoSchema = z.object({
  characterId: z.number().positive(),
  amount: z.number().min(0)
});

export const POST = requireAdmin(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const { characterId, amount } = updateMesoSchema.parse(body);

    // Update character meso
    await query(
      'UPDATE characters SET meso = ? WHERE id = ?',
      [amount, characterId]
    );

    console.log(`Admin ${req.user!.username} updated meso for character ID ${characterId} to ${amount}`);

    return NextResponse.json({
      success: true,
      message: 'Meso updated successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    console.error('Update meso error:', error);
    return NextResponse.json(
      { error: 'Failed to update meso' },
      { status: 500 }
    );
  }
});