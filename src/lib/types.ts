export type QuestionType = 'multiple-choice' | 'checkbox' | 'text' | 'rating';

export type AnswerValue = string | string[] | number | null | undefined;

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
  explanationAudioUrl?: string;
  explanationTranscriptUrl?: string;
}

export interface Genre {
  id: string;
  name: string;
  color: string;
  pattern: string;
}

export interface ExperimentState {
  currentStep: number;
  responses: Record<string, AnswerValue>;
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

export interface Word {
  id: string;
  text: string;
  start: number;
  end: number;
  line: number;
}

export interface Subtitle {
  id: number;
  text: string;
  words: Word[];
  timing: {
    start: number;
    end: number;
    duration: number;
  };
  speaker: {
    id: number;
    name: string;
  };
}

export interface Transcript {
  metadata: {
    title: string;
    exportDate: string;
    totalSubtitles: number;
    totalWords: number;
  };
  subtitles: Subtitle[];
}
