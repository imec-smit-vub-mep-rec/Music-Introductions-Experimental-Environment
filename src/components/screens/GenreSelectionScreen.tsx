'use client';

import { Button } from '@/components/ui/button';
import { ExperimentLayout } from '@/components/layout/ExperimentLayout';
import { Genre } from '@/lib/types';
import { cn } from '@/lib/utils';

interface GenreSelectionScreenProps {
  genres: Genre[];
  selectedGenre: string | null;
  onSelectGenre: (genreId: string) => void;
  onStart: () => void;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  disabledGenres?: string[];
}

export function GenreSelectionScreen({
  genres,
  selectedGenre,
  onSelectGenre,
  onStart,
  onBack,
  title = "Choose a Genre",
  subtitle,
  disabledGenres = []
}: GenreSelectionScreenProps) {
  const isDisabled = (genreId: string) => disabledGenres.includes(genreId);

  return (
    <ExperimentLayout background="light">
      <div className="min-h-screen px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            {onBack && (
              <Button
                variant="ghost"
                onClick={onBack}
                className="text-dark-purple hover:bg-maize/20"
              >
                ← Back
              </Button>
            )}
            <div className="flex-1 text-center">
              <h1 className="text-3xl font-bold text-dark-purple mb-2">
                {title}
              </h1>
              {subtitle && (
                <p className="text-dark-purple/70">{subtitle}</p>
              )}
            </div>
            <div className="w-16" /> {/* Spacer for centering */}
          </div>

          {/* Selected Genre Header */}
          {selectedGenre && (
            <div className="text-center">
              <p className="text-lg text-dark-purple">
                You choose this genre: <span className="font-bold">{genres.find(g => g.id === selectedGenre)?.name}</span>
              </p>
            </div>
          )}

          {/* Genre Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {genres.map((genre) => {
              const isSelected = selectedGenre === genre.id;
              const disabled = isDisabled(genre.id);
              
              return (
                <button
                  key={genre.id}
                  onClick={() => !disabled && onSelectGenre(genre.id)}
                  disabled={disabled}
                  className={cn(
                    "relative aspect-square rounded-2xl overflow-hidden transition-all duration-300",
                    "hover:scale-105 focus:outline-none focus:ring-4 focus:ring-maize/50",
                    isSelected && "ring-4 ring-maize scale-105",
                    disabled && "opacity-50 cursor-not-allowed hover:scale-100"
                  )}
                  style={{ backgroundColor: genre.color }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="text-2xl font-bold drop-shadow-lg">
                        {genre.name}
                      </div>
                    </div>
                  </div>
                  
                  {disabled && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">Already selected</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Start Button */}
          {selectedGenre && (
            <div className="flex justify-center">
              <Button
                onClick={onStart}
                className="bg-dark-purple text-white hover:bg-dark-purple/90 px-12 py-4 text-lg rounded-full font-medium"
              >
                Start
              </Button>
            </div>
          )}
        </div>
      </div>
    </ExperimentLayout>
  );
}
