import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { neon } from "@neondatabase/serverless";
import * as XLSX from "xlsx";
import questionsData from "@/data/questions.json";

type SessionRow = {
  session_id: number;
  group_type: string;
  chosen_genre: string | null;
  referer: string | null;
  start_time: string;
  onboarding_answers: unknown;
  demographics_answers: unknown;
  post_listening_answers: unknown;
  final_answers: unknown;
  qualtrics_response_id: string | null;
  engagement_metrics: unknown;
  created_at: string;
  updated_at: string;
};

// Neon PostgreSQL configuration
const connectionString = process.env.DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;

// Helper function to get question text by ID
function getQuestionText(
  questionId: string,
  surveyType: "onboarding" | "demographics" | "final"
): string {
  try {
    const survey = questionsData[surveyType as keyof typeof questionsData];
    if (!survey || !survey.blocks) {
      console.log(`❌ Survey ${surveyType} not found or has no blocks`);
      return questionId;
    }

    for (const block of survey.blocks) {
      if (block.questions) {
        for (const question of block.questions) {
          if (question.id === questionId) {
            // Use dataExportTag if available, otherwise use text, otherwise fall back to ID
            const result = block.title + " - " + question.text || questionId;
            console.log(`✅ Found question ${questionId}: "${result}"`);
            return result;
          }
        }
      }
    }
    console.log(`❌ Question ${questionId} not found in ${surveyType}`);
    return questionId;
  } catch (error) {
    console.log(`❌ Error getting question text for ${questionId}:`, error);
    return questionId;
  }
}

// Helper function to get all expected question IDs for a survey type
function getExpectedQuestionIds(
  surveyType: "onboarding" | "demographics" | "final"
): string[] {
  try {
    const survey = questionsData[surveyType];
    if (!survey || !survey.blocks) return [];

    const questionIds: string[] = [];
    for (const block of survey.blocks) {
      if (block.questions) {
        for (const question of block.questions) {
          if (question.id) {
            questionIds.push(question.id);
          }
        }
      }
    }
    return questionIds;
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  // Check authentication
  const cookieStore = await cookies();
  const adminAuth = cookieStore.get("admin-auth");

  if (adminAuth?.value !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get query parameters
  const { searchParams } = new URL(request.url);
  const useQuestionText = searchParams.get('useQuestionText') !== 'false'; // Default to true
  const columnFormat = useQuestionText ? 'questionText' : 'questionId';

  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 }
    );
  }

  try {
    // Get all session data
    const query = `
      SELECT 
        session_id,
        group_type,
        chosen_genre,
        referer,
        start_time,
        onboarding_answers,
        demographics_answers,
        post_listening_answers,
        final_answers,
        qualtrics_response_id,
        engagement_metrics,
        created_at,
        updated_at
      FROM experiment_sessions 
      ORDER BY created_at DESC
    `;

    const sessions = await sql(query) as SessionRow[];

    // Get expected question IDs for validation
    const expectedOnboardingIds = getExpectedQuestionIds("onboarding");
    const expectedDemographicsIds = getExpectedQuestionIds("demographics");
    const expectedFinalIds = getExpectedQuestionIds("final");

    // Transform data for Excel export
    const exportData = sessions.map((session: SessionRow) => {
      // Safely parse JSON data, handling cases where it might already be parsed
      let onboardingAnswers: Record<string, unknown> = {};
      let demographicsAnswers: Record<string, unknown> = {};
      let postListeningAnswers: unknown[] = [];
      let finalAnswers: Record<string, unknown> = {};
      let engagementMetrics: {
        page_times: Record<string, number>;
        interactions: unknown[];
      } = { page_times: {}, interactions: [] };

      try {
        onboardingAnswers =
          typeof session.onboarding_answers === "string"
            ? JSON.parse(session.onboarding_answers)
            : session.onboarding_answers || {};
      } catch {
        console.warn("Failed to parse onboarding_answers");
      }

      try {
        demographicsAnswers =
          typeof session.demographics_answers === "string"
            ? JSON.parse(session.demographics_answers)
            : session.demographics_answers || {};
      } catch {
        console.warn("Failed to parse demographics_answers");
      }

      try {
        postListeningAnswers =
          typeof session.post_listening_answers === "string"
            ? JSON.parse(session.post_listening_answers)
            : session.post_listening_answers || [];
      } catch {
        console.warn("Failed to parse post_listening_answers");
      }

      try {
        finalAnswers =
          typeof session.final_answers === "string"
            ? JSON.parse(session.final_answers)
            : session.final_answers || {};
      } catch {
        console.warn("Failed to parse final_answers");
      }

      try {
        engagementMetrics =
          typeof session.engagement_metrics === "string"
            ? JSON.parse(session.engagement_metrics)
            : session.engagement_metrics || {};
      } catch {
        console.warn("Failed to parse engagement_metrics");
      }

      // Ensure engagementMetrics has the expected structure
      if (!engagementMetrics || typeof engagementMetrics !== "object") {
        engagementMetrics = { page_times: {}, interactions: [] };
      }
      if (
        !engagementMetrics.page_times ||
        typeof engagementMetrics.page_times !== "object"
      ) {
        engagementMetrics.page_times = {};
      }
      if (!Array.isArray(engagementMetrics.interactions)) {
        engagementMetrics.interactions = [];
      }

      // Check for unanswered questions and log them
      const sessionId = session.session_id;

      // Check onboarding questions
      const unansweredOnboarding = expectedOnboardingIds.filter(
        (qId) =>
          !onboardingAnswers[qId] ||
          onboardingAnswers[qId] === "" ||
          onboardingAnswers[qId] === null
      );

      // Check demographics questions
      const unansweredDemographics = expectedDemographicsIds.filter(
        (qId) =>
          !demographicsAnswers[qId] ||
          demographicsAnswers[qId] === "" ||
          demographicsAnswers[qId] === null
      );

      // Check final questions
      const unansweredFinal = expectedFinalIds.filter(
        (qId) =>
          !finalAnswers[qId] ||
          finalAnswers[qId] === "" ||
          finalAnswers[qId] === null
      );

      if (
        unansweredOnboarding.length > 0 ||
        unansweredDemographics.length > 0 ||
        unansweredFinal.length > 0
      ) {
        console.log(`⚠️ SESSION ${sessionId} HAS UNANSWERED QUESTIONS:`, {
          session_id: sessionId,
          unanswered_onboarding: unansweredOnboarding.map((qId) =>
            getQuestionText(qId, "onboarding")
          ),
          unanswered_demographics: unansweredDemographics.map((qId) =>
            getQuestionText(qId, "demographics")
          ),
          unanswered_final: unansweredFinal.map((qId) =>
            getQuestionText(qId, "final")
          ),
          total_unanswered:
            unansweredOnboarding.length +
            unansweredDemographics.length +
            unansweredFinal.length,
        });
      } else {
        console.log(`✅ SESSION ${sessionId}: ALL QUESTIONS ANSWERED`);
      }

      // Flatten the data for Excel
      const flattened: Record<string, unknown> = {
        // Basic session info
        session_id: session.session_id,
        group_type: session.group_type,
        chosen_genre: session.chosen_genre,
        referer: session.referer || "",
        start_time: new Date(session.start_time).toLocaleString(),
        qualtrics_response_id: session.qualtrics_response_id || "",
        created_at: new Date(session.created_at).toLocaleString(),
        updated_at: new Date(session.updated_at).toLocaleString(),

        // Onboarding answers (flattened with configurable headers)
        ...Object.entries(onboardingAnswers).reduce((acc, [key, value]) => {
          const questionText = getQuestionText(key, "onboarding");
          const header = useQuestionText 
            ? `Onboarding: ${questionText}` 
            : `Onboarding: ${key}`;
          console.log(`📝 Mapping onboarding ${key} -> "${header}"`);
          acc[header] = Array.isArray(value) ? value.join(", ") : value;
          return acc;
        }, {} as Record<string, unknown>),

        // Demographics answers (flattened with configurable headers)
        ...Object.entries(demographicsAnswers).reduce((acc, [key, value]) => {
          const questionText = getQuestionText(key, "demographics");
          const header = useQuestionText 
            ? `Demographics: ${questionText}` 
            : `Demographics: ${key}`;
          console.log(`📝 Mapping demographics ${key} -> "${header}"`);
          acc[header] = Array.isArray(value) ? value.join(", ") : value;
          return acc;
        }, {} as Record<string, unknown>),

        // Final answers (flattened with configurable headers)
        ...Object.entries(finalAnswers).reduce((acc, [key, value]) => {
          const questionText = getQuestionText(key, "final");
          const header = useQuestionText 
            ? `Final: ${questionText}` 
            : `Final: ${key}`;
          console.log(`📝 Mapping final ${key} -> "${header}"`);
          acc[header] = Array.isArray(value) ? value.join(", ") : value;
          return acc;
        }, {} as Record<string, unknown>),

        // Song data summary
        total_songs: postListeningAnswers.length,
        completed_songs: postListeningAnswers.filter((song: unknown) => {
          if (
            typeof song === "object" &&
            song !== null &&
            "answers" in song
          ) {
            const answers = (song as { answers?: unknown }).answers;
            return (
              typeof answers === "object" &&
              answers !== null &&
              Object.keys(answers).length > 0
            );
          }
          return false;
        }).length,

        // Engagement metrics
        total_page_time: Object.values(
          engagementMetrics.page_times || {}
        ).reduce(
          (sum: number, time: unknown) =>
            sum + (typeof time === "number" ? time : 0),
          0
        ),
        total_interactions: engagementMetrics.interactions?.length || 0,
      };

      // Add individual song data
      if (Array.isArray(postListeningAnswers)) {
        postListeningAnswers.forEach((song: unknown, index: number) => {
          if (song && typeof song === "object" && song !== null) {
            const songObj = song as Record<string, unknown>;
            flattened[`song_${index + 1}_id`] = songObj.songId || "";
            flattened[`song_${index + 1}_introduction_style`] =
              songObj.introduction_style || "";
            flattened[`song_${index + 1}_skipped`] = songObj.skipped || false;
            flattened[`song_${index + 1}_skipped_at_ms`] =
              songObj.skipped_at_ms || null;
            flattened[`song_${index + 1}_listening_time_ms`] =
              songObj.listening_time_ms || 0;
            flattened[`song_${index + 1}_liked`] = songObj.liked || false;
            flattened[`song_${index + 1}_liked_at_ms`] =
              songObj.liked_at_ms || null;
            flattened[`song_${index + 1}_disliked`] =
              songObj.dislike || false;
            flattened[`song_${index + 1}_disliked_at_ms`] =
              songObj.dislike_at_ms || null;

            // Add song answers
            if (
              songObj.answers &&
              typeof songObj.answers === "object" &&
              songObj.answers !== null
            ) {
              Object.entries(songObj.answers).forEach(([key, value]) => {
                flattened[`song_${index + 1}_${key}`] = Array.isArray(value)
                  ? value.join(", ")
                  : value;
              });
            }
          }
        });
      }

      return flattened;
    });

    console.log(`📊 EXPORTING DATA with ${columnFormat} column headers`);
    console.log(`📊 Total sessions to export: ${sessions.length}`);

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();

    // Main data sheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Experiment Data");

    // Calculate song interaction statistics
    let totalLikes = 0;
    let totalDislikes = 0;
    let totalSongs = 0;

    sessions.forEach((session: SessionRow) => {
      try {
        const postListeningAnswers =
          typeof session.post_listening_answers === "string"
            ? JSON.parse(session.post_listening_answers)
            : session.post_listening_answers || [];

        if (Array.isArray(postListeningAnswers)) {
          postListeningAnswers.forEach((song: unknown) => {
            if (song && typeof song === "object" && song !== null) {
              const songObj = song as Record<string, unknown>;
              totalSongs++;
              if (songObj.liked === true) totalLikes++;
              if (songObj.dislike === true) totalDislikes++;
            }
          });
        }
      } catch {
        // Skip invalid data
      }
    });

    // Create summary sheet
    const summaryData = [
      { metric: "Total Sessions", value: sessions.length },
      {
        metric: "Unfamiliar Group",
        value: sessions.filter((s: SessionRow) => s.group_type === "unfamiliar").length,
      },
      {
        metric: "Familiar Group",
        value: sessions.filter((s: SessionRow) => s.group_type === "familiar").length,
      },
      {
        metric: "Completed Sessions",
        value: sessions.filter((s: SessionRow) => {
          try {
            const postListeningAnswers =
              typeof s.post_listening_answers === "string"
                ? JSON.parse(s.post_listening_answers)
                : s.post_listening_answers || [];
            return (
              Array.isArray(postListeningAnswers) &&
              postListeningAnswers.length > 0
            );
          } catch {
            return false;
          }
        }).length,
      },
      {
        metric: "Average Session Duration (minutes)",
        value:
          sessions.length > 0
            ? (
                sessions.reduce((sum: number, s: SessionRow) => {
                  const start = new Date(s.start_time).getTime();
                  const end = new Date(s.updated_at).getTime();
                  return sum + (end - start) / (1000 * 60);
                }, 0) / sessions.length
              ).toFixed(2)
            : 0,
      },
      { metric: "Total Songs Played", value: totalSongs },
      { metric: "Total Likes", value: totalLikes },
      { metric: "Total Dislikes", value: totalDislikes },
      {
        metric: "Like Rate (%)",
        value:
          totalSongs > 0 ? ((totalLikes / totalSongs) * 100).toFixed(2) : 0,
      },
      {
        metric: "Dislike Rate (%)",
        value:
          totalSongs > 0
            ? ((totalDislikes / totalSongs) * 100).toFixed(2)
            : 0,
      },
      { metric: "Column Format", value: columnFormat },
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    console.log(`✅ EXPORT COMPLETE: ${sessions.length} sessions exported with ${columnFormat} headers`);

    // Return Excel file
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="serendipity-experiment-data-${columnFormat}-${
          new Date().toISOString().split("T")[0]
        }.xlsx"`,
      },
    });
  } catch (error) {
    console.error("❌ EXPORT ERROR:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
