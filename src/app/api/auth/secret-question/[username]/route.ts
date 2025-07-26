// src/app/api/auth/secret-question/[username]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { secureQueries } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const username = params.username;
    
    if (!username) {
      return NextResponse.json(
        { error: 'Username required' },
        { status: 400 }
      );
    }

    // Get user to check if they exist and have a secret question
    const user = await secureQueries.getUserByUsername(username);
    
    if (!user) {
      return NextResponse.json(
        { 
          hasSecretQuestion: false,
          error: 'User not found' 
        },
        { status: 404 }
      );
    }

    if (!user.secret_question_id) {
      return NextResponse.json({
        hasSecretQuestion: false,
        error: 'No security question found for this account'
      });
    }

    // Get the question text (but not the answer!)
    const questionText = await secureQueries.getUserSecretQuestion(user.id);
    
    if (!questionText) {
      return NextResponse.json({
        hasSecretQuestion: false,
        error: 'Security question not found'
      });
    }
    
    return NextResponse.json({
      hasSecretQuestion: true,
      questionText: questionText
    });

  } catch (error) {
    console.error('Error fetching user secret question:', error);
    return NextResponse.json(
      { 
        hasSecretQuestion: false,
        error: 'Failed to fetch security question' 
      },
      { status: 500 }
    );
  }
}