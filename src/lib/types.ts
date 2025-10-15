export type QuestionType = 'multiple-choice' | 'checkbox' | 'text' | 'rating';

export type ExperimentStep = 
  | 'welcome' 
  | 'terms' 
  | 'onboarding' 
  | 'genre-familiar' 
  | 'audio-familiar' 
  | 'survey-familiar' 
  | 'genre-unfamiliar' 
  | 'audio-unfamiliar' 
  | 'survey-unfamiliar' 
  | 'final-survey' 
  | 'thank-you';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  description?: string;
  options?: string[];
  required?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  genre: string;
  audioUrl: string;
  duration: number;
  albumArt?: string;
}

export interface Genre {
  id: string;
  name: string;
  color: string;
  pattern: string;
}

export interface ExperimentState {
  currentStep: number;
  responses: Record<string, any>;
  selectedGenres: {
    familiar: string | null;
    unfamiliar: string | null;
  };
  currentSongIndex: number;
  songsPlayed: {
    familiar: number;
    unfamiliar: number;
  };
  currentQuestionIndex: number;
}

export interface SurveyConfig {
  id: string;
  title: string;
  questions: Question[];
}

export interface ExperimentConfig {
  songsPerGenre: number;
  genres: Genre[];
  surveys: {
    onboarding: SurveyConfig;
    postListening: SurveyConfig;
    final: SurveyConfig;
  };
}
