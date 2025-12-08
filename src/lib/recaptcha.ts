'use server';

export async function validateRecaptcha(token: string, expectedAction: string = 'consent_form') {
  try {
    console.log('🛡️ reCAPTCHA: Starting server-side validation', {
      expectedAction: expectedAction,
      tokenLength: token.length,
      timestamp: new Date().toISOString()
    });

    if (!token) {
      throw new Error('reCAPTCHA token is required');
    }

    // Validate reCAPTCHA token with Google
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_API_KEY?.split('-')[0];
    if (!projectId) {
      throw new Error('Google Cloud Project ID not configured');
    }

    console.log('🛡️ reCAPTCHA: Sending validation request to Google', {
      projectId: projectId,
      hasApiKey: !!process.env.GOOGLE_CLOUD_API_KEY,
      hasSiteKey: !!process.env.NEXT_PUBLIC_RECAPTCHA_API_KEY
    });

    const recaptchaResponse = await fetch(
      `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${process.env.GOOGLE_CLOUD_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: {
            token: token,
            expectedAction: expectedAction,
            siteKey: process.env.NEXT_PUBLIC_RECAPTCHA_API_KEY,
          },
        }),
      }
    );

    const recaptchaData = await recaptchaResponse.json();

    console.log('🛡️ reCAPTCHA: Received validation response', {
      status: recaptchaResponse.status,
      score: recaptchaData?.riskAnalysis?.score,
      valid: recaptchaData?.tokenProperties?.valid,
      action: recaptchaData?.tokenProperties?.action,
      timestamp: new Date().toISOString()
    });

    // Check if reCAPTCHA validation was successful
    if (
      !recaptchaData?.riskAnalysis?.score ||
      recaptchaData?.tokenProperties?.valid !== true ||
      recaptchaData?.riskAnalysis?.score < 0.5 // Adjust threshold as needed
    ) {
      console.log('🛡️ reCAPTCHA: Validation failed', JSON.stringify(recaptchaData, null, 2));
      throw new Error('reCAPTCHA validation failed');
    }

    console.log('🛡️ reCAPTCHA: Validation successful', {
      score: recaptchaData.riskAnalysis.score,
      valid: recaptchaData.tokenProperties.valid,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      score: recaptchaData.riskAnalysis.score,
      valid: recaptchaData.tokenProperties.valid,
    };

  } catch (error) {
    console.error('🛡️ reCAPTCHA: Validation error:', error);
    throw error;
  }
}
