import { ExperimentConfig, SurveyConfig } from './types';
import questionsData from '../data/questions.json';
import songsData from '../data/songs.json';

export const experimentConfig: ExperimentConfig = {
  songsPerGenre: songsData.songsPerGenre,
  genres: songsData.genres,
  surveys: {
    onboarding: questionsData.onboarding as SurveyConfig,
    demographics: questionsData.demographics as SurveyConfig,
    postListening: questionsData.postListening as SurveyConfig,
    final: questionsData.final as SurveyConfig,
  },
} as const;

export const experimentSteps = [
  'welcome',
  'terms',
  'onboarding',
  'demographics',
  'genre-selection',
  'audio-song-1',
  'survey-song-1',
  'audio-song-2',
  'survey-song-2',
  'audio-song-3',
  'survey-song-3',
  'qualtrics',
  'thank-you',
] as const;

export const getSongsByGenre = (genre: string) => {
  return songsData.songs.filter(song => song.genre === genre);
};
