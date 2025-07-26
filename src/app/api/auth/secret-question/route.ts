// src/app/api/auth/secret-questions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { secureQueries } from '@/lib/db';

export async function GET() {
  try {
    const questions = await secureQueries.getSecretQuestions();
    
    return NextResponse.json({
      questions: questions
    });
  } catch (error) {
    console.error('Error fetching secret questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security questions' },
      { status: 500 }
    );
  }
}