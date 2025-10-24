export type QuestionType = 'multiple-choice' | 'checkbox' | 'text' | 'rating' | 'number';

export type AnswerValue = string | string[] | number | null | undefined;

export type ExperimentStep = 
  | 'welcome' 
  | 'terms' 
  | 'onboarding' 
  | 'genre-selection'
  | 'audio-song-1'
  | 'survey-song-1'
  | 'audio-song-2'
  | 'survey-song-2'
  | 'audio-song-3'
  | 'survey-song-3'
  | 'qualtrics'
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
  albumArt?: string;
  informIntroductionUrl?: string;
  immersIntroductionUrl?: string;
}

export interface Genre {
  id: string;
  name: string;
  icon: string;
  color: string;
  pattern: string;
}

export interface ExperimentState {
  currentStep: number;
  responses: Record<string, AnswerValue>;
  selectedGenre: string | null;
  currentSongIndex: number;
  randomizedSongs: string[];
  randomizedIntroductions: string[];
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
