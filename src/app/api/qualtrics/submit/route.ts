import { NextRequest, NextResponse } from 'next/server';
import { submitToQualtrics } from '@/lib/qualtrics';
import { SessionData, AnswerValue } from '@/lib/types';

/**
 * API Route: Submit survey response to Qualtrics
 * 
 * This endpoint handles both initial submission and updates of survey responses
 * to Qualtrics using their API. It ensures data redundancy by saving to both
 * Qualtrics and the Neon database.
 * 
 * POST /api/qualtrics/submit
 * 
 * Body:
 * {
 *   sessionData: SessionData,
 *   finalAnswers: Record<string, AnswerValue>,
 *   existingResponseId?: string
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   responseId?: string,
 *   error?: string,
 *   retryable?: boolean
 * }
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionData, finalAnswers, existingResponseId } = body;

    // Validate required fields
    if (!sessionData || !finalAnswers) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: sessionData and finalAnswers',
          retryable: false 
        },
        { status: 400 }
      );
    }

    // Validate session data structure
    if (!sessionData.session_id || !sessionData.group) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid session data: missing session_id or group',
          retryable: false 
        },
        { status: 400 }
      );
    }

    console.log('📤 QUALTRICS API SUBMISSION REQUEST:', {
      sessionId: sessionData.session_id,
      group: sessionData.group,
      hasExistingResponseId: !!existingResponseId,
      finalAnswersCount: Object.keys(finalAnswers).length,
      timestamp: new Date().toISOString(),
    });

    // Submit to Qualtrics
    const result = await submitToQualtrics(sessionData, finalAnswers, existingResponseId);

    if (result.success) {
      console.log('✅ QUALTRICS SUBMISSION SUCCESSFUL:', {
        sessionId: sessionData.session_id,
        responseId: result.responseId,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error('❌ QUALTRICS SUBMISSION FAILED:', {
        sessionId: sessionData.session_id,
        error: result.error,
        retryable: result.retryable,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ QUALTRICS API ROUTE ERROR:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true 
      },
      { status: 500 }
    );
  }
}
