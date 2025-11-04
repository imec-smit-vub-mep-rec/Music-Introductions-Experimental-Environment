export type QuestionType = 'multipleChoice' | 'checkbox' | 'textInput' | 'textDisplay' | 'rating' | 'number' | 'likertGrid' | 'searchableSelect';

export type AnswerValue = string | string[] | number | Record<string, string> | null | undefined;

export type ExperimentStep = 
  | 'welcome' 
  | 'terms' 
  | 'onboarding' 
  | 'demographics'
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
  choices?: Array<{
    id: string;
    text: string;
    value: string;
  }>;
  answers?: Array<{
    id: string;
    text: string;
    value: string;
  }>;
  required?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
  statements?: string[];
  scale?: string[];
  dataExportTag?: string;
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

export interface QuestionBlock {
  id: string;
  title: string;
  description?: string;
  // When provided, this block is only shown if the current song's
  // introduction style is included in the specified list
  onlyShowForIntroductionTypes?: import('./session').IntroductionStyle[];
  questions: Question[];
}

export interface ExperimentState {
  currentStep: number;
  responses: Record<string, AnswerValue>;
  selectedGenre: string | null;
  currentSongIndex: number;
  randomizedSongs: string[];
  randomizedIntroductions: string[];
  currentQuestionIndex: number;
  currentBlockIndex: number;
}

export interface SurveyConfig {
  id: string;
  title: string;
  intro?: string;
  blocks: QuestionBlock[];
  randomizeBlocks?: boolean;
}

export interface ExperimentConfig {
  songsPerGenre: number;
  genres: Genre[];
  surveys: {
    onboarding: SurveyConfig;
    demographics: SurveyConfig;
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
