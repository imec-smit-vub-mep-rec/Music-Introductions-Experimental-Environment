'use client';

import { ExperimentLayout } from '@/components/layout/ExperimentLayout';

export function ThankYouScreen() {
  return (
    <ExperimentLayout background="image">
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-8 max-w-md">
          <div className="text-6xl">🎉</div>
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">
            Thank You!
          </h1>
          <p className="text-white/90 text-lg leading-relaxed">
            Your participation in this music discovery experiment is complete. 
            Your responses will help us understand how people explore new genres.
          </p>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <p className="text-white/80 text-sm">
              This experiment was designed to study music discovery patterns and 
              the role of serendipity in finding new favorite genres.
            </p>
          </div>
        </div>
      </div>
    </ExperimentLayout>
  );
}
