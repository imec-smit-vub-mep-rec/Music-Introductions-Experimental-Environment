"use client";

import Script from "next/script";
import { useEffect } from "react";

declare global {
  const grecaptcha: {
    enterprise: {
      ready: (cb: () => void) => void;
      execute: (
        siteKey: string,
        options: { action: string }
      ) => Promise<string>;
    };
  };
}

interface RecaptchaWrapperProps {
  action: string;
  onTokenGenerated?: (token: string) => void;
}

export function RecaptchaWrapper({ action, onTokenGenerated }: RecaptchaWrapperProps) {
  const executeRecaptcha = () => {
    if (typeof grecaptcha !== "undefined") {
      grecaptcha.enterprise.ready(async () => {
        try {
          console.log('🛡️ reCAPTCHA: Generating token for action:', action);
          const token = await grecaptcha.enterprise.execute(
            process.env.NEXT_PUBLIC_RECAPTCHA_API_KEY!,
            { action }
          );
          
          console.log('🛡️ reCAPTCHA: Token generated successfully', {
            action: action,
            tokenLength: token.length,
            timestamp: new Date().toISOString()
          });
          
          // Store token in hidden input for form submission
          const tokenInput = document.getElementById(
            "recaptcha-token"
          ) as HTMLInputElement;
          if (tokenInput) {
            tokenInput.value = token;
          }
          
          // Call callback if provided
          if (onTokenGenerated) {
            onTokenGenerated(token);
          }
        } catch (e) {
          console.error("🛡️ reCAPTCHA: Token generation failed", e);
        }
      });
    } else {
      console.warn('🛡️ reCAPTCHA: grecaptcha not available');
    }
  };

  useEffect(() => {
    // Execute reCAPTCHA when component mounts
    const timer = setTimeout(executeRecaptcha, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Script
        src={`https://www.google.com/recaptcha/enterprise.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_API_KEY}`}
        strategy="afterInteractive"
        onLoad={executeRecaptcha}
      />
      <input type="hidden" name="recaptchaToken" id="recaptcha-token" />
    </>
  );
}
