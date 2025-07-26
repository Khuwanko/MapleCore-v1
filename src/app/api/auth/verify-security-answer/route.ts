// src/app/api/auth/verify-security-answer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { secureQueries } from '@/lib/db';
import { z } from 'zod';

const verifyAnswerSchema = z.object({
  username: z.string().min(1).max(13),
  secretAnswer: z.string().min(1).max(255)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = verifyAnswerSchema.parse(body);
    const { username, secretAnswer } = validatedData;
    
    // Get user by username
    const user = await secureQueries.getUserByUsername(username);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or security answer' },
        { status: 401 }
      );
    }

    // Check if user has secret question set up
    if (!user.secret_question_id || !user.secret_answer) {
      return NextResponse.json(
        { error: 'No security question found for this account' },
        { status: 400 }
      );
    }

    // Verify secret answer (case-insensitive, trimmed comparison)
    const providedAnswer = secretAnswer.toLowerCase().trim();
    const storedAnswer = user.secret_answer.toLowerCase().trim();
    
    if (providedAnswer === storedAnswer) {
      return NextResponse.json({
        success: true,
        message: 'Security answer verified'
      });
    } else {
      // Log failed attempt for security
      const ipAddress = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown';
      
      await secureQueries.logPasswordResetAttempt(
        user.id,
        ipAddress,
        false
      );
      
      console.log(`Failed security answer verification for user: ${username} from IP: ${ipAddress}`);
      
      return NextResponse.json(
        { error: 'Invalid username or security answer' },
        { status: 401 }
      );
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid input data',
          details: error.issues 
        },
        { status: 400 }
      );
    }

    console.error('Security answer verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}