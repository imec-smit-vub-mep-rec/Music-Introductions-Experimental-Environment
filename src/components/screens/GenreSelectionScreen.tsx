"use client";

import { Button } from "@/components/ui/button";
import { ExperimentLayout } from "@/components/layout/ExperimentLayout";
import { Genre } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "lucide-react";

interface GenreSelectionScreenProps {
  genres: Genre[];
  selectedGenre: string | null;
  onSelectGenre: (genreId: string) => void;
  onStart: () => void;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  sessionGroup?: "unfamiliar" | "familiar";
}

export function GenreSelectionScreen({
  genres,
  selectedGenre,
  onSelectGenre,
  onStart,
  onBack,
  title,
  subtitle,
  sessionGroup,
}: GenreSelectionScreenProps) {
  // Generate title and subtitle based on session group
  const displayTitle =
    sessionGroup === "unfamiliar"
      ? "Choose an Unfamiliar Genre"
      : "Choose a Familiar Genre";
  const displaySubtitle =
    subtitle ||
    (sessionGroup === "unfamiliar"
      ? "Select a genre you're less familiar with"
      : "Select a genre you already know.");

  return (
    <ExperimentLayout background="light">
      <div className="min-h-screen px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            {/* {onBack && (
              <Button
                variant="ghost"
                onClick={onBack}
                className="text-dark-purple hover:bg-maize/20"
              >
                ← Back
              </Button>
            )} */}
            <div className="flex-1 text-center">
              <h1 className="text-xl font-bold text-dark-purple mb-2 md:text-2xl">
                {displayTitle}
              </h1>
              <p className="text-dark-purple/70 text-sm md:text-base">
                {displaySubtitle} <br /> Then click the button below to start
                the experiment.
              </p>
            </div>
          </div>

          {/* Selected Genre Header */}
          {/* {selectedGenre && (
            <div className="text-center">
              <p className="text-lg text-dark-purple">
                You choose this genre:{" "}
                <span className="font-bold">
                  {genres.find((g) => g.id === selectedGenre)?.name}
                </span>
              </p>
            </div>
          )} */}

          {/* Genre Grid */}
          <div className="grid grid-cols-3  gap-6">
            {genres.map((genre) => {
              const isSelected = selectedGenre === genre.id;

              return (
                <button
                  key={genre.id}
                  onClick={() => onSelectGenre(genre.id)}
                  className={cn(
                    "relative aspect-square rounded-2xl overflow-hidden transition-all duration-300",
                    "hover:scale-105 focus:outline-none focus:ring-4 focus:ring-maize/50",
                    isSelected && "ring-4 ring-maize scale-105"
                  )}
                  style={{ backgroundColor: genre.color }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white flex flex-col items-center justify-center gap-2">
                      <div className="text-3xl">{genre.icon}</div>
                      <div className="text-lg font-bold drop-shadow-lg">
                        {genre.name}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Start Button */}
          {selectedGenre ? (
            <div className="flex justify-center">
              <Button
                onClick={onStart}
                className="bg-dark-purple text-white hover:bg-dark-purple/90 px-12 py-4 text-md rounded-full font-medium"
              >
                I am{" "}
                <strong className="font-bold">
                  {sessionGroup === "unfamiliar" ? "unfamiliar" : "familiar"}
                </strong>{" "}
                with {genres.find((g) => g.id === selectedGenre)?.name}
                <ArrowRightIcon className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="bg-gray-100 text-gray-500 px-12 py-4 text-lg rounded-full font-medium cursor-not-allowed">
                Please select a genre to continue
              </div>
            </div>
          )}
        </div>
      </div>
    </ExperimentLayout>
  );
}
