'use client';

import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ExperimentLayout } from '@/components/layout/ExperimentLayout';
import { createNewSession, saveSession, hasCompletedSession, clearAllSessionData } from '@/lib/session';

interface TermsScreenProps {
  onAccept: () => void;
}

export function TermsScreen({ onAccept }: TermsScreenProps) {
  const [consent1, setConsent1] = useState(false);
  const [consent2, setConsent2] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading spinner
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (consent1 && consent2) {
      // Check if user has already completed the experiment
      if (hasCompletedSession()) {
        // Redirect to thank you or show message
        console.log('User has already completed the experiment');
      }
      
      // Clear any existing session data and create new session
      const initializeSession = async () => {
        try {
          // Clear ALL existing session data (localStorage + database)
          await clearAllSessionData();
          
          // Force a small delay to ensure everything is cleared
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const session = await createNewSession();
          saveSession(session);
          
          console.log('🆕 NEW SESSION CREATED ON TERMS ACCEPTANCE:', {
            session_id: session.session_id,
            group: session.group,
            onboarding_answers: Object.keys(session.answers.onboarding).length,
            timestamp: new Date().toISOString()
          });
          
          const timer = setTimeout(onAccept, 200);
          return () => clearTimeout(timer);
        } catch (error) {
          console.error('Failed to create session:', error);
        }
      };
      
      initializeSession();
    }
  }, [consent1, consent2, onAccept]);

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
          {/* Privacy Card */}
          <div className="bg-ultra-violet/10 rounded-2xl p-6 border border-ultra-violet/20">
            <h2 className="text-2xl font-bold text-dark-purple mb-4">Privacy first</h2>
            <p className="text-dark-purple/80 leading-relaxed">
              Your participation in this experiment is completely anonymous. 
              We only collect your responses to help us understand music discovery patterns.
            </p>
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
                I understand that my participation is voluntary and I can withdraw at any time.
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
                I consent to the use of my anonymous responses for research purposes.
              </Label>
            </div>
          </div>

          {consent1 && consent2 && (
            <div className="text-center">
              <p className="text-dark-purple/70">Thank you! Proceeding...</p>
            </div>
          )}
        </div>
      </div>
    </ExperimentLayout>
  );
}
