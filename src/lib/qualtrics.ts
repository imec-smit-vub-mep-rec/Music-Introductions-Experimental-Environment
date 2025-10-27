/**
 * Qualtrics API Client
 * 
 * This module provides functionality to submit survey responses to Qualtrics
 * using their API instead of redirecting users to Qualtrics directly.
 * 
 * Features:
 * - Submit survey responses with embedded data
 * - Update existing responses when users correct answers
 * - Handle answer corrections with proper data redundancy
 * - Error handling and retry logic
 * 
 * Environment Variables Required:
 * - QUALTRICS_TOKEN: Your Qualtrics API token
 * - QUALTRICS_DATACENTER_ID: Your Qualtrics datacenter ID
 * - QUALTRICS_SURVEY_ID: The survey ID to submit responses to
 */

import { SessionData, AnswerValue } from './types';

export interface QualtricsResponse {
  responseId: string;
  values: Record<string, string>;
  embeddedData?: Record<string, string>;
}

export interface QualtricsSubmissionResult {
  success: boolean;
  responseId?: string;
  error?: string;
  retryable?: boolean;
}

export interface QualtricsConfig {
  token: string;
  datacenterId: string;
  surveyId: string;
  baseUrl: string;
}

class QualtricsAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'QualtricsAPIError';
  }
}

export class QualtricsClient {
  private config: QualtricsConfig;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second

  constructor(config: QualtricsConfig) {
    this.config = config;
  }

  /**
   * Submit a survey response to Qualtrics
   */
  async submitResponse(
    sessionData: SessionData,
    finalAnswers: Record<string, AnswerValue>
  ): Promise<QualtricsSubmissionResult> {
    const embeddedData = this.buildEmbeddedData(sessionData);
    const responseValues = this.buildResponseValues(finalAnswers);

    const payload = {
      values: responseValues,
      embeddedData: embeddedData,
    };

    return this.makeRequestWithRetry('/responses', 'POST', payload);
  }

  /**
   * Update an existing survey response
   */
  async updateResponse(
    responseId: string,
    sessionData: SessionData,
    finalAnswers: Record<string, AnswerValue>
  ): Promise<QualtricsSubmissionResult> {
    const embeddedData = this.buildEmbeddedData(sessionData);
    const responseValues = this.buildResponseValues(finalAnswers);

    const payload = {
      values: responseValues,
      embeddedData: embeddedData,
    };

    return this.makeRequestWithRetry(`/responses/${responseId}`, 'PUT', payload);
  }

  /**
   * Build embedded data from session data
   */
  private buildEmbeddedData(sessionData: SessionData): Record<string, string> {
    const embeddedData: Record<string, string> = {};

    // Session metadata
    embeddedData.session_id = sessionData.session_id.toString();
    embeddedData.group = sessionData.group;
    embeddedData.chosen_genre = sessionData.chosen_genre || '';
    embeddedData.start_time = sessionData.start_time;

    // Onboarding answers
    Object.entries(sessionData.answers.onboarding).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        embeddedData[`onboarding_${key}`] = Array.isArray(value) 
          ? value.join(',') 
          : String(value);
      }
    });

    // Demographics answers
    Object.entries(sessionData.answers.demographics).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        embeddedData[`demographics_${key}`] = Array.isArray(value) 
          ? value.join(',') 
          : String(value);
      }
    });

    // Song data
    sessionData.answers.songs.forEach((song, index) => {
      embeddedData[`song_${index + 1}_id`] = song.songId;
      embeddedData[`song_${index + 1}_introduction_style`] = song.introduction_style;
      embeddedData[`song_${index + 1}_skipped`] = song.skipped.toString();
      embeddedData[`song_${index + 1}_skipped_at_ms`] = song.skipped_at_ms?.toString() || '';
      embeddedData[`song_${index + 1}_listening_time_ms`] = song.listening_time_ms.toString();
      embeddedData[`song_${index + 1}_liked`] = song.liked?.toString() || '';
      embeddedData[`song_${index + 1}_liked_at_ms`] = song.liked_at_ms?.toString() || '';
      embeddedData[`song_${index + 1}_dislike`] = song.dislike?.toString() || '';
      embeddedData[`song_${index + 1}_dislike_at_ms`] = song.dislike_at_ms?.toString() || '';

      // Song answers
      Object.entries(song.answers).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          embeddedData[`song_${index + 1}_${key}`] = Array.isArray(value) 
            ? value.join(',') 
            : String(value);
        }
      });
    });

    // Engagement metrics
    Object.entries(sessionData.engagement_metrics.page_times).forEach(([page, time]) => {
      embeddedData[`page_time_${page}`] = time.toString();
    });

    // Interaction counts
    const interactionCounts: Record<string, number> = {};
    sessionData.engagement_metrics.interactions.forEach((interaction) => {
      const key = `${interaction.page}_${interaction.type}`;
      interactionCounts[key] = (interactionCounts[key] || 0) + 1;
    });

    Object.entries(interactionCounts).forEach(([key, count]) => {
      embeddedData[`interaction_${key}`] = count.toString();
    });

    return embeddedData;
  }

  /**
   * Build response values from final answers
   */
  private buildResponseValues(finalAnswers: Record<string, AnswerValue>): Record<string, string> {
    const values: Record<string, string> = {};

    Object.entries(finalAnswers).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        values[key] = Array.isArray(value) ? value.join(',') : String(value);
      }
    });

    return values;
  }

  /**
   * Make API request with retry logic
   */
  private async makeRequestWithRetry(
    endpoint: string,
    method: 'POST' | 'PUT',
    payload: any,
    attempt: number = 1
  ): Promise<QualtricsSubmissionResult> {
    try {
      const response = await fetch(`${this.config.baseUrl}/surveys/${this.config.surveyId}${endpoint}`, {
        method,
        headers: {
          'X-API-TOKEN': this.config.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ QUALTRICS API ERROR (${response.status}):`, errorText);
        
        // Determine if error is retryable
        const retryable = response.status >= 500 || response.status === 429;
        
        if (retryable && attempt < this.maxRetries) {
          console.log(`🔄 RETRYING QUALTRICS API REQUEST (attempt ${attempt + 1}/${this.maxRetries})`);
          await this.delay(this.retryDelay * attempt);
          return this.makeRequestWithRetry(endpoint, method, payload, attempt + 1);
        }
        
        throw new QualtricsAPIError(
          `Qualtrics API request failed: ${response.status} ${response.statusText}`,
          response.status,
          retryable
        );
      }

      const result = await response.json();
      
      console.log('✅ QUALTRICS RESPONSE SUBMITTED:', {
        method,
        endpoint,
        responseId: result.result?.responseId,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        responseId: result.result?.responseId,
      };
    } catch (error) {
      console.error('❌ QUALTRICS API REQUEST FAILED:', error);
      
      if (error instanceof QualtricsAPIError) {
        return {
          success: false,
          error: error.message,
          retryable: error.retryable,
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      };
    }
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create Qualtrics client instance from environment variables
 */
export function createQualtricsClient(): QualtricsClient | null {
  const token = process.env.QUALTRICS_TOKEN;
  const datacenterId = process.env.QUALTRICS_DATACENTER_ID;
  const surveyId = process.env.QUALTRICS_SURVEY_ID;

  if (!token || !datacenterId || !surveyId) {
    console.error('❌ QUALTRICS CONFIGURATION MISSING:', {
      hasToken: !!token,
      hasDatacenterId: !!datacenterId,
      hasSurveyId: !!surveyId,
    });
    return null;
  }

  const baseUrl = `https://${datacenterId}.qualtrics.com/API/v3`;

  return new QualtricsClient({
    token,
    datacenterId,
    surveyId,
    baseUrl,
  });
}

/**
 * Submit survey response to Qualtrics API
 * This function handles both initial submission and updates
 */
export async function submitToQualtrics(
  sessionData: SessionData,
  finalAnswers: Record<string, AnswerValue>,
  existingResponseId?: string
): Promise<QualtricsSubmissionResult> {
  const client = createQualtricsClient();
  
  if (!client) {
    return {
      success: false,
      error: 'Qualtrics client not configured',
      retryable: false,
    };
  }

  try {
    if (existingResponseId) {
      console.log('🔄 UPDATING EXISTING QUALTRICS RESPONSE:', {
        responseId: existingResponseId,
        sessionId: sessionData.session_id,
        timestamp: new Date().toISOString(),
      });
      return await client.updateResponse(existingResponseId, sessionData, finalAnswers);
    } else {
      console.log('📤 SUBMITTING NEW QUALTRICS RESPONSE:', {
        sessionId: sessionData.session_id,
        timestamp: new Date().toISOString(),
      });
      return await client.submitResponse(sessionData, finalAnswers);
    }
  } catch (error) {
    console.error('❌ QUALTRICS SUBMISSION FAILED:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      retryable: true,
    };
  }
}
