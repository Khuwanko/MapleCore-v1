// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { forgotPasswordSchema, forgotPasswordRateLimit } from '@/lib/security/validation';
import { hashPassword, checkPasswordStrength } from '@/lib/security/password';
import { secureQueries } from '@/lib/db';
import { z } from 'zod';

async function forgotPasswordHandler(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = forgotPasswordSchema.parse(body);
    const { username, secretAnswer, newPassword } = validatedData;

    // Additional password strength check
    const strength = checkPasswordStrength(newPassword);
    if (strength.score < 3) {
      return NextResponse.json(
        { 
          error: 'New password is too weak',
          feedback: strength.feedback 
        },
        { status: 400 }
      );
    }

    // Get user by username
    const user = await secureQueries.getUserByUsername(username);
    if (!user) {
      // Don't reveal if username exists - security best practice
      return NextResponse.json(
        { error: 'Invalid username or security answer' },
        { status: 401 }
      );
    }

    // Check if account is banned
    if (user.banned > 0) {
      return NextResponse.json(
        { error: 'Cannot reset password for banned account' },
        { status: 403 }
      );
    }

    // Check if user has secret question set up
    if (!user.secret_question_id || !user.secret_answer) {
      return NextResponse.json(
        { error: 'No security question found for this account. Please contact support.' },
        { status: 400 }
      );
    }

    // Verify secret answer (case-insensitive, trimmed comparison)
    const providedAnswer = secretAnswer.toLowerCase().trim();
    const storedAnswer = user.secret_answer.toLowerCase().trim();
    
    if (providedAnswer !== storedAnswer) {
      // Log failed attempt
      const ipAddress = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown';
      
      await secureQueries.logPasswordResetAttempt(
        user.id,
        ipAddress,
        false
      );
      
      console.log(`Failed password reset attempt for user: ${username} from IP: ${ipAddress}`);
      
      return NextResponse.json(
        { error: 'Invalid username or security answer' },
        { status: 401 }
      );
    }

    // Check recent failed attempts to prevent brute force
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    const recentAttempts = await secureQueries.getPasswordResetAttempts(
      user.id, 
      undefined, // Don't filter by IP for user-specific check
      60 // Last hour
    );

    if (recentAttempts >= 5) {
      return NextResponse.json(
        { error: 'Too many password reset attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Reset password and clear PIN/PIC for security
    await secureQueries.resetUserPassword(user.id, hashedPassword);

    // Log successful attempt
    await secureQueries.logPasswordResetAttempt(
      user.id,
      ipAddress,
      true
    );

    console.log(`Password reset successful for user: ${username} from IP: ${ipAddress}`);

    return NextResponse.json({
      message: 'Password reset successful!',
      warning: 'Your PIN and PIC have been reset for security. Please log in and set them up again.'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid input data',
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      );
    }

    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Password reset failed. Please try again later.' },
      { status: 500 }
    );
  }
}

// Export with rate limiting
export const POST = forgotPasswordRateLimit(forgotPasswordHandler);