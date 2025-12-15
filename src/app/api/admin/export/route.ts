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
  prolific_pid: string | null;
  prolific_study_id: string | null;
  prolific_session_id: string | null;
  start_time: string;
  onboarding_answers: unknown;
  demographics_answers: unknown;
  post_listening_answers: unknown;
  final_answers: unknown;
  qualtrics_response_id: string | null;
  engagement_metrics: unknown;
  created_at: string;
  updated_at: string;
  experiment_completed: boolean;
};

// Helper function to normalize session data to handle question changes during the study
// This ensures all sessions have consistent fields regardless of when they were collected
function normalizeSessionData(session: SessionRow): {
  onboardingAnswers: Record<string, unknown>;
  demographicsAnswers: Record<string, unknown>;
  postListeningAnswers: unknown[];
  finalAnswers: Record<string, unknown>;
} {
  // Parse JSON data
  let onboardingAnswers: Record<string, unknown> = {};
  let demographicsAnswers: Record<string, unknown> = {};
  let postListeningAnswers: unknown[] = [];
  let finalAnswers: Record<string, unknown> = {};

  try {
    onboardingAnswers =
      typeof session.onboarding_answers === "string"
        ? JSON.parse(session.onboarding_answers)
        : (session.onboarding_answers as Record<string, unknown>) || {};
  } catch {
    console.warn(`Failed to parse onboarding_answers for session ${session.session_id}`);
  }

  try {
    demographicsAnswers =
      typeof session.demographics_answers === "string"
        ? JSON.parse(session.demographics_answers)
        : (session.demographics_answers as Record<string, unknown>) || {};
  } catch {
    console.warn(`Failed to parse demographics_answers for session ${session.session_id}`);
  }

  try {
    postListeningAnswers =
      typeof session.post_listening_answers === "string"
        ? JSON.parse(session.post_listening_answers)
        : (session.post_listening_answers as unknown[]) || [];
  } catch {
    console.warn(`Failed to parse post_listening_answers for session ${session.session_id}`);
  }

  try {
    finalAnswers =
      typeof session.final_answers === "string"
        ? JSON.parse(session.final_answers)
        : (session.final_answers as Record<string, unknown>) || {};
  } catch {
    console.warn(`Failed to parse final_answers for session ${session.session_id}`);
  }

  // === NORMALIZE ONBOARDING ANSWERS ===
  
  // Handle attention_check_1 (added later): if not present, set to "2" (correct answer)
  if (onboardingAnswers["attention_check_1"] === undefined || onboardingAnswers["attention_check_1"] === null) {
    onboardingAnswers["attention_check_1"] = "2";
    console.log(`📝 Session ${session.session_id}: Added missing onboarding attention_check_1 = "2"`);
  }

  // Handle attention_check_2 (added later): if not present, set to "5" (correct answer)
  if (onboardingAnswers["attention_check_2"] === undefined || onboardingAnswers["attention_check_2"] === null) {
    onboardingAnswers["attention_check_2"] = "5";
    console.log(`📝 Session ${session.session_id}: Added missing onboarding attention_check_2 = "5"`);
  }

  // === NORMALIZE FINAL ANSWERS ===

  // Handle 71_pl_ci_1 (removed later): if not present, add it as empty string
  if (finalAnswers["71_pl_ci_1"] === undefined) {
    finalAnswers["71_pl_ci_1"] = "";
    console.log(`📝 Session ${session.session_id}: Added missing 71_pl_ci_1 = ""`);
  }

  // Handle attention_check_2 (removed later): if not present, set to "5" (correct answer)
  if (finalAnswers["attention_check_2"] === undefined || finalAnswers["attention_check_2"] === null) {
    finalAnswers["attention_check_2"] = "5";
    console.log(`📝 Session ${session.session_id}: Added missing final attention_check_2 = "5"`);
  }

  // === NORMALIZE POST-LISTENING ANSWERS ===
  
  if (Array.isArray(postListeningAnswers)) {
    postListeningAnswers = postListeningAnswers.map((song: unknown, songIndex: number) => {
      if (song && typeof song === "object" && song !== null && "answers" in song) {
        const songObj = song as { answers?: Record<string, unknown>; [key: string]: unknown };
        const songAnswers = songObj.answers || {};

        // Handle attention_check_postlistening → attention_check_1 rename
        // If attention_check_postlistening is present, move its value to attention_check_1
        if (songAnswers["attention_check_postlistening"] !== undefined) {
          if (songAnswers["attention_check_1"] === undefined) {
            songAnswers["attention_check_1"] = songAnswers["attention_check_postlistening"];
            console.log(`📝 Session ${session.session_id}, Song ${songIndex + 1}: Renamed attention_check_postlistening to attention_check_1`);
          }
          delete songAnswers["attention_check_postlistening"];
        }

        return { ...songObj, answers: songAnswers };
      }
      return song;
    });
  }

  return {
    onboardingAnswers,
    demographicsAnswers,
    postListeningAnswers,
    finalAnswers,
  };
}

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
  surveyType: "onboarding" | "demographics" | "final" | "postListening"
): string[] {
  try {
    const survey = questionsData[surveyType as keyof typeof questionsData];
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

// Helper function to get only REQUIRED question IDs (excluding attention checks)
function getRequiredQuestionIds(
  surveyType: "onboarding" | "demographics" | "final" | "postListening"
): string[] {
  try {
    const survey = questionsData[surveyType as keyof typeof questionsData];
    if (!survey || !survey.blocks) return [];

    const questionIds: string[] = [];
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
  const filter = searchParams.get('filter'); // 'completed' or null (all)

  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 }
    );
  }

  try {
    // Build query to fetch sessions
    // When filtering for 'completed', we use experiment_completed = TRUE from the database
    // and then apply additional validation for birth year > 1920
    // Always filter by start_time > November 5th 2025 (study start date)
    let query = `
      SELECT 
        session_id,
        group_type,
        chosen_genre,
        referer,
        prolific_pid,
        prolific_study_id,
        prolific_session_id,
        start_time,
        onboarding_answers,
        demographics_answers,
        post_listening_answers,
        final_answers,
        qualtrics_response_id,
        engagement_metrics,
        created_at,
        updated_at,
        experiment_completed
      FROM experiment_sessions 
      WHERE start_time > '2025-11-05'::timestamp
    `;

    // Filter by experiment_completed when filter=completed
    if (filter === 'completed') {
      query += ` AND experiment_completed = TRUE`;
    }

    query += ` ORDER BY created_at DESC`;

    let sessions = await sql(query) as SessionRow[];

    // Get expected question IDs for validation (used for logging)
    const expectedOnboardingIds = getExpectedQuestionIds("onboarding");
    const expectedDemographicsIds = getExpectedQuestionIds("demographics");
    const expectedFinalIds = getExpectedQuestionIds("final");

    // If filtering for completed sessions, apply validation filters
    if (filter === 'completed') {
      // Filter sessions based on multiple criteria
      const originalCount = sessions.length;
      sessions = sessions.filter((session: SessionRow) => {
        // Filter out sessions with null/undefined chosen_genre
        if (session.chosen_genre === null || session.chosen_genre === undefined || session.chosen_genre === "") {
          console.log(`❌ Session ${session.session_id}: No chosen_genre, excluding from export`);
          return false;
        }

        // Filter out test sessions (prolific_pid = "testpid")
        if (session.prolific_pid === "testpid") {
          console.log(`❌ Session ${session.session_id}: Test session (prolific_pid=testpid), excluding from export`);
          return false;
        }

        // Parse demographics to check birth year
        let demographicsAnswers: Record<string, unknown> = {};
        try {
          demographicsAnswers =
            typeof session.demographics_answers === "string"
              ? JSON.parse(session.demographics_answers)
              : (session.demographics_answers as Record<string, unknown>) || {};
        } catch {
          console.log(`❌ Session ${session.session_id}: Failed to parse demographics_answers for birth year check`);
          return false;
        }

        // Get birth year from demographics (field id: 35_dem_2)
        const birthYearStr = demographicsAnswers["35_dem_2"];
        if (birthYearStr === undefined || birthYearStr === null || birthYearStr === "") {
          console.log(`❌ Session ${session.session_id}: No birth year found, excluding from export`);
          return false;
        }

        const birthYear = parseInt(String(birthYearStr), 10);
        if (isNaN(birthYear)) {
          console.log(`❌ Session ${session.session_id}: Invalid birth year "${birthYearStr}", excluding from export`);
          return false;
        }

        if (birthYear <= 1920) {
          console.log(`❌ Session ${session.session_id}: Birth year ${birthYear} <= 1920, excluding from export`);
          return false;
        }

        return true;
      });

      console.log(`✅ Filtered from ${originalCount} to ${sessions.length} sessions (experiment_completed=TRUE, birth_year > 1920, has chosen_genre, not test)`);
    }

    // Transform data for Excel export
    const exportData = sessions.map((session: SessionRow) => {
      // Normalize session data to ensure consistent fields across all sessions
      // This handles question changes that occurred during the study
      const normalized = normalizeSessionData(session);
      const { onboardingAnswers, demographicsAnswers, postListeningAnswers, finalAnswers } = normalized;
      
      // Parse engagement metrics separately (not part of normalization)
      let engagementMetrics: {
        page_times: Record<string, number>;
        interactions: unknown[];
      } = { page_times: {}, interactions: [] };

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
        prolific_pid: session.prolific_pid || "",
        prolific_study_id: session.prolific_study_id || "",
        prolific_session_id: session.prolific_session_id || "",
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

    // Create Field Statistics sheet - overview of all columns with counts and stats
    const fieldStatsData: { 
      field: string; 
      non_null_count: number; 
      null_count: number;
      response_rate: string;
      is_numeric: boolean;
      average: string;
      median: string;
      min: string;
      max: string;
    }[] = [];

    // Get all unique column names from exportData
    const allColumns = new Set<string>();
    exportData.forEach((row) => {
      Object.keys(row).forEach((key) => allColumns.add(key));
    });

    // Calculate statistics for each column
    allColumns.forEach((columnName) => {
      const values = exportData.map((row) => row[columnName]);
      
      // Count non-null values (exclude undefined, null, and empty strings)
      const nonNullValues = values.filter(
        (v) => v !== undefined && v !== null && v !== ""
      );
      const nonNullCount = nonNullValues.length;
      const nullCount = values.length - nonNullCount;
      const responseRate = values.length > 0 
        ? ((nonNullCount / values.length) * 100).toFixed(1) + "%" 
        : "0%";

      // Check if values are numeric
      const numericValues = nonNullValues
        .map((v) => {
          if (typeof v === "number") return v;
          if (typeof v === "string") {
            const parsed = parseFloat(v);
            return isNaN(parsed) ? null : parsed;
          }
          return null;
        })
        .filter((v): v is number => v !== null);

      const isNumeric = numericValues.length > 0 && numericValues.length >= nonNullCount * 0.5;

      let average = "-";
      let median = "-";
      let min = "-";
      let max = "-";

      if (isNumeric && numericValues.length > 0) {
        // Calculate average
        const sum = numericValues.reduce((a, b) => a + b, 0);
        average = (sum / numericValues.length).toFixed(2);

        // Calculate median
        const sorted = [...numericValues].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        median = sorted.length % 2 !== 0
          ? sorted[mid].toFixed(2)
          : ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2);

        // Calculate min and max
        min = Math.min(...numericValues).toFixed(2);
        max = Math.max(...numericValues).toFixed(2);
      }

      fieldStatsData.push({
        field: columnName,
        non_null_count: nonNullCount,
        null_count: nullCount,
        response_rate: responseRate,
        is_numeric: isNumeric,
        average,
        median,
        min,
        max,
      });
    });

    // Sort by field name for easier reading
    fieldStatsData.sort((a, b) => a.field.localeCompare(b.field));

    const fieldStatsSheet = XLSX.utils.json_to_sheet(fieldStatsData);
    XLSX.utils.book_append_sheet(workbook, fieldStatsSheet, "Field Statistics");

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
