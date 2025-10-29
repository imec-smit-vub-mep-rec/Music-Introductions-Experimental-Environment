import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;

type VisualizationRow = {
  session_id: number;
  group_type: string;
  post_listening_answers: unknown;
  randomized_introductions: unknown;
};

export async function GET() {
  // Check authentication
  const cookieStore = await cookies();
  const adminAuth = cookieStore.get('admin-auth');

  if (adminAuth?.value !== 'authenticated') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  if (!sql) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    // Get all song data with scores
    const query = `
      SELECT 
        session_id,
        group_type,
        post_listening_answers,
        randomized_introductions
      FROM experiment_sessions 
      WHERE post_listening_answers IS NOT NULL 
      AND jsonb_array_length(COALESCE(post_listening_answers, '[]'::jsonb)) > 0
      ORDER BY created_at DESC
    `;
    
    const sessions = await sql(query) as VisualizationRow[];

      // Process the data for visualization
      const visualizationData = {
        scatterPlotData: [] as Array<{
          sessionId: number;
          group: string;
          songId: string;
          songIndex: number;
          introductionType: string;
          question: string;
          score: number;
          x: number;
          y: number;
        }>,
        boxPlotData: {} as Record<string, Record<string, number[]>>,
        summaryStats: {} as Record<string, Record<string, {
          mean: number;
          median: number;
          q1: number;
          q3: number;
          min: number;
          max: number;
          count: number;
          stdDev: number;
        }>>
      };

      sessions.forEach((session: VisualizationRow) => {
        try {
          const songAnswers = typeof session.post_listening_answers === 'string' 
            ? JSON.parse(session.post_listening_answers) 
            : session.post_listening_answers || [];
          
          const introductions = typeof session.randomized_introductions === 'string'
            ? JSON.parse(session.randomized_introductions)
            : session.randomized_introductions || [];

          if (Array.isArray(songAnswers) && Array.isArray(introductions)) {
            songAnswers.forEach((song: unknown, songIndex: number) => {
              if (song && typeof song === 'object' && song !== null && 'answers' in song) {
                const songObj = song as { answers?: Record<string, unknown>; songId?: string };
                if (!songObj.answers || typeof songObj.answers !== 'object') return;
                const introductionType = introductions[songIndex] || 'no_introduction';
                
                // Process each question in the song answers
                Object.entries(songObj.answers).forEach(([questionKey, answerValue]) => {
                  // Only process numeric answers (ratings, scores)
                  if (typeof answerValue === 'number' || 
                      (typeof answerValue === 'string' && !isNaN(Number(answerValue)))) {
                    const numericValue = typeof answerValue === 'number' ? answerValue : Number(answerValue);
                    
                    // Add to scatter plot data
                    visualizationData.scatterPlotData.push({
                      sessionId: session.session_id,
                      group: session.group_type,
                      songId: songObj.songId || '',
                      songIndex: songIndex + 1,
                      introductionType,
                      question: questionKey,
                      score: numericValue,
                      x: songIndex + 1, // Song position
                      y: numericValue
                    });

                    // Add to box plot data
                    const key = `${questionKey}_${introductionType}`;
                    if (!visualizationData.boxPlotData[key]) {
                      visualizationData.boxPlotData[key] = {};
                    }
                    if (!visualizationData.boxPlotData[key][introductionType]) {
                      visualizationData.boxPlotData[key][introductionType] = [];
                    }
                    visualizationData.boxPlotData[key][introductionType].push(numericValue);
                  }
                });
              }
            });
          }
        } catch (error) {
          console.warn('Failed to process session data for visualization:', error);
        }
      });

      // Calculate summary statistics
      Object.entries(visualizationData.boxPlotData).forEach(([questionKey, introData]) => {
        visualizationData.summaryStats[questionKey] = {};
        
        Object.entries(introData).forEach(([introType, scores]) => {
          if (scores.length > 0) {
            const sortedScores = scores.sort((a, b) => a - b);
            const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
            const median = sortedScores.length % 2 === 0 
              ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
              : sortedScores[Math.floor(sortedScores.length / 2)];
            
            const q1 = sortedScores[Math.floor(sortedScores.length * 0.25)];
            const q3 = sortedScores[Math.floor(sortedScores.length * 0.75)];
            const min = Math.min(...scores);
            const max = Math.max(...scores);

            visualizationData.summaryStats[questionKey][introType] = {
              mean,
              median,
              q1,
              q3,
              min,
              max,
              count: scores.length,
              stdDev: Math.sqrt(scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length)
            };
          }
        });
      });

      // Get unique questions for chart organization
      const uniqueQuestions = [...new Set(visualizationData.scatterPlotData.map(d => d.question))];
      const uniqueIntroductionTypes = [...new Set(visualizationData.scatterPlotData.map(d => d.introductionType))];

    return NextResponse.json({
      scatterPlotData: visualizationData.scatterPlotData,
      boxPlotData: visualizationData.boxPlotData,
      summaryStats: visualizationData.summaryStats,
      uniqueQuestions,
      uniqueIntroductionTypes,
      totalSessions: sessions.length,
      totalDataPoints: visualizationData.scatterPlotData.length
    });
  } catch (error) {
    console.error('❌ VISUALIZATION ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to load visualization data' },
      { status: 500 }
    );
  }
}
