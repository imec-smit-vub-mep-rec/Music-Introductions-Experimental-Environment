'use client';

import { Button } from '@/components/ui/button';
import { ExperimentLayout } from '@/components/layout/ExperimentLayout';

interface WelcomeScreenProps {
  onStart: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <ExperimentLayout background="image">
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-8 max-w-md">
          <h1 className="text-6xl font-bold text-white drop-shadow-lg">
            WELCOME
          </h1>
          <p className="text-white/90 text-lg leading-relaxed">
            Discover new music and help us understand how people explore different genres.
          </p>
          <Button
            onClick={onStart}
            className="bg-dark-purple text-white hover:bg-dark-purple/90 px-8 py-3 text-lg rounded-full font-medium"
          >
            Start Discovery
          </Button>
        </div>
      </div>
    </ExperimentLayout>
  );
}
