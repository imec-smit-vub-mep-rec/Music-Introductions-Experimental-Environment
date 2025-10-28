"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ExperimentLayout } from "@/components/layout/ExperimentLayout";
import { RecaptchaWrapper } from "@/components/RecaptchaWrapper";
import {
  createNewSession,
  saveSession,
  hasCompletedSession,
  clearAllSessionData,
} from "@/lib/session";
import { validateRecaptcha } from "@/lib/recaptcha";

interface TermsScreenProps {
  onAccept: () => void;
}

export function TermsScreen({ onAccept }: TermsScreenProps) {
  const [consent1, setConsent1] = useState(false);
  const [consent2, setConsent2] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaValidating, setRecaptchaValidating] = useState(false);
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading spinner
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (consent1 && consent2 && recaptchaToken) {
      // Check if user has already completed the experiment
      if (hasCompletedSession()) {
        // Redirect to thank you or show message
        console.log("User has already completed the experiment");
      }

      // Clear any existing session data and create new session
      const initializeSession = async () => {
        try {
          setRecaptchaValidating(true);
          setRecaptchaError(null);

          // Validate reCAPTCHA token
          console.log('🛡️ reCAPTCHA: Starting validation in TermsScreen', {
            hasToken: !!recaptchaToken,
            tokenLength: recaptchaToken?.length,
            timestamp: new Date().toISOString()
          });
          
          await validateRecaptcha(recaptchaToken, 'consent_form');
          
          console.log('🛡️ reCAPTCHA: Validation completed successfully in TermsScreen');

          // Clear ALL existing session data (localStorage only - database sessions are preserved)
          await clearAllSessionData();

          // Force a small delay to ensure everything is cleared
          await new Promise((resolve) => setTimeout(resolve, 200));

          // Create new session ONLY after informed consent is accepted
          const session = await createNewSession();
          saveSession(session);

          console.log("🆕 NEW SESSION CREATED AFTER INFORMED CONSENT:", {
            session_id: session.session_id,
            group: session.group,
            client_ip: session.client_ip,
            referer: session.referer,
            onboarding_answers: Object.keys(session.answers.onboarding).length,
            timestamp: new Date().toISOString(),
          });

          // Sync the new session to database immediately after creation
          try {
            const response = await fetch('/api/session/sync', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(session),
            });

            if (!response.ok) {
              throw new Error(`Sync failed: ${response.statusText}`);
            }

            console.log('✅ SESSION SYNCED TO DATABASE AFTER CONSENT:', {
              session_id: session.session_id,
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.error('❌ FAILED TO SYNC SESSION TO DATABASE AFTER CONSENT:', error);
            // Continue anyway - session is saved locally
          }

          const timer = setTimeout(onAccept, 200);
          return () => clearTimeout(timer);
        } catch (error) {
          console.error("Failed to create session or validate reCAPTCHA:", error);
          setRecaptchaError(error instanceof Error ? error.message : 'Validation failed');
          setRecaptchaValidating(false);
        }
      };

      initializeSession();
    }
  }, [consent1, consent2, recaptchaToken, onAccept]);

  if (loading) {
    return (
      <ExperimentLayout background="light">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ultra-violet"></div>
        </div>
      </ExperimentLayout>
    );
  }

  return (
    <ExperimentLayout background="light">
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md space-y-8">
          {/* reCAPTCHA Wrapper */}
          <RecaptchaWrapper 
            action="consent_form" 
            onTokenGenerated={(token) => {
              console.log('🛡️ reCAPTCHA: Token received in TermsScreen', {
                tokenLength: token.length,
                timestamp: new Date().toISOString()
              });
              setRecaptchaToken(token);
            }}
          />
          {/* Privacy Card */}
          <div className="bg-ultra-violet/10 rounded-2xl p-6 border border-ultra-violet/20">
            <h2 className="text-2xl font-bold text-dark-purple mb-4">
              Privacy first
            </h2>
            <p className="text-dark-purple/80 leading-relaxed"></p>
            Please read the informed consent document carefully and check the
            boxes below to indicate that you have read and agree with the
            document.
            <div className="mt-4">
                <ul className="list-disc list-inside">
                  <li>
                  English version:{" "}
                  <a
                    href="/data/ic/informed_consent_en.pdf"
                    target="_blank"
                    className="text-dark-purple/80 underline"
                  >
                    Informed Consent Document
                  </a>

                  </li>
                  <li>
                    Dutch version:{" "}
                  <a
                    href="/data/ic/informed_consent_nl.pdf"
                    target="_blank"
                    className="text-dark-purple/80 underline"
                  >
                    Informed Consent Document (Nederlands)
                  </a>
                  </li>
                </ul>
              </div>
          </div>

          {/* Consent Checkboxes */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="consent1"
                checked={consent1}
                onCheckedChange={(checked) => setConsent1(checked as boolean)}
                className="border-dark-purple data-[state=checked]:bg-maize data-[state=checked]:border-maize mt-1"
              />
              <Label
                htmlFor="consent1"
                className="text-dark-purple cursor-pointer leading-relaxed"
              >
                I understand that my participation is voluntary and I can
                withdraw at any time.
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="consent2"
                checked={consent2}
                onCheckedChange={(checked) => setConsent2(checked as boolean)}
                className="border-dark-purple data-[state=checked]:bg-maize data-[state=checked]:border-maize mt-1"
              />
              <Label
                htmlFor="consent2"
                className="text-dark-purple cursor-pointer leading-relaxed"
              >
                I have read and agree with the informed consent document.
              </Label>
            </div>
          </div>

          {consent1 && consent2 && (
            <div className="text-center space-y-2">
              {!recaptchaToken && (
                <p className="text-dark-purple/70">Please wait while we verify you&apos;re human...</p>
              )}
              {recaptchaToken && !recaptchaValidating && !recaptchaError && (
                <p className="text-dark-purple/70">Thank you! Proceeding...</p>
              )}
              {recaptchaValidating && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-ultra-violet"></div>
                  <p className="text-dark-purple/70">Validating...</p>
                </div>
              )}
              {recaptchaError && (
                <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                  <p className="text-red-700 text-sm">
                    Verification failed. Please refresh the page and try again.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ExperimentLayout>
  );
}
