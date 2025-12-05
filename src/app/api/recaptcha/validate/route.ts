import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { token, expectedAction } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "reCAPTCHA token is required" },
        { status: 400 }
      );
    }

    // Validate reCAPTCHA token with Google
    const projectId =
      process.env.GOOGLE_CLOUD_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_API_KEY?.split("-")[0];
    if (!projectId) {
      return NextResponse.json(
        { error: "Google Cloud Project ID not configured" },
        { status: 500 }
      );
    }

    const recaptchaResponse = await fetch(
      `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${process.env.GOOGLE_CLOUD_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: {
            token: token,
            expectedAction: expectedAction || "consent_form",
            siteKey: process.env.NEXT_PUBLIC_RECAPTCHA_API_KEY,
          },
        }),
      }
    );

    const recaptchaData = await recaptchaResponse.json();

    // TEST MODE: Force failure for testing (set FORCE_RECAPTCHA_FAIL=true in .env.local)
    if (process.env.FORCE_RECAPTCHA_FAIL === 'true') {
      console.log('reCAPTCHA: TEST MODE - Forcing validation failure');
      return NextResponse.json(
        {
          error: "reCAPTCHA validation failed (test mode)",
          details: { testMode: true },
        },
        { status: 400 }
      );
    }

    // Check if reCAPTCHA validation was successful
    if (
      !recaptchaData?.riskAnalysis?.score ||
      recaptchaData?.tokenProperties?.valid !== true ||
      recaptchaData?.riskAnalysis?.score < 0.3 // Adjust threshold as needed
    ) {
      console.log(
        "reCAPTCHA validation failed:",
        JSON.stringify(recaptchaData, null, 2)
      );
      return NextResponse.json(
        {
          error: "reCAPTCHA validation failed",
          details: recaptchaData,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      score: recaptchaData.riskAnalysis.score,
      valid: recaptchaData.tokenProperties.valid,
    });
  } catch (error) {
    console.error("reCAPTCHA validation error:", error);
    return NextResponse.json(
      { error: "Internal server error during reCAPTCHA validation" },
      { status: 500 }
    );
  }
}
