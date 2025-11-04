"use client";

import { ExperimentLayout } from "@/components/layout/ExperimentLayout";
import { Genre } from "@/lib/types";

interface GenreConfirmationScreenProps {
  chosenGenre: Genre;
  onBack: () => void;
  onStart: () => void;
}

export function GenreConfirmationScreen({
  chosenGenre,
  onBack,
  onStart,
}: GenreConfirmationScreenProps) {
  return (
    <ExperimentLayout >
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 mb-4">
            Great choice, you&apos;ve selected{" "}
            {chosenGenre?.name || "your genre"}!
          </h1>
          <p className="text-gray-700 leading-7 mb-4">
          We&apos;ve prepared a short playlist of three songs from this genre for you to listen to. Before some songs, you&apos;ll hear a short spoken introduction. 
          </p>
          <p className="text-gray-700 leading-7 mb-4">
          Feel free to listen at your own pace, you can move on after about thirty seconds if you feel you&apos;ve heard enough. After each song, a few short questions will follow about your listening experience. 
          </p>
          <p className="text-gray-700 leading-7 mb-8">Enjoy the music!</p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onStart}
              className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800"
            >
              Start listening
            </button>
          </div>
        </div>
      </div>
    </ExperimentLayout>
  );
}
