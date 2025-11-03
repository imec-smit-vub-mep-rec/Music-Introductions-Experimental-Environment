"use client";

import { Button } from "@/components/ui/button";
import { ExperimentLayout } from "@/components/layout/ExperimentLayout";
import { ArrowRightIcon } from "lucide-react";

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
            Discover new music and help us understand how people explore
            different genres.
          </p>
          <p className="text-black mt-4 text-center bg-yellow-200/80 backdrop-blur-sm rounded-2xl p-4 border border-white/20 text-sm leading-relaxed">
            <span className="font-bold">Attention:</span> This experiment involves listening to music.
            Ensure you have a stable internet connection and are in an
            environment where you can play music and focus on the task. Connect
            headphones if needed.
          </p>
          <Button
            onClick={onStart}
            className="bg-dark-purple text-white hover:bg-dark-purple/90 px-8 py-4 text-lg rounded-full font-medium border-1 border-white"
          >
            Start Discovery
            <ArrowRightIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </ExperimentLayout>
  );
}
