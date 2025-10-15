import { ExperimentConfig } from './types';
import questionsData from '../data/questions.json';
import songsData from '../data/songs.json';

export const experimentConfig: ExperimentConfig = {
  songsPerGenre: songsData.songsPerGenre,
  genres: songsData.genres,
  surveys: {
    onboarding: questionsData.onboarding,
    postListening: questionsData.postListening,
    final: questionsData.final,
  },
};

export const experimentSteps = [
  'welcome',
  'terms',
  'onboarding',
  'genre-familiar',
  'audio-familiar',
  'survey-familiar',
  'genre-unfamiliar',
  'audio-unfamiliar',
  'survey-unfamiliar',
  'final-survey',
  'thank-you',
] as const;

export const getSongsByGenre = (genre: string) => {
  return songsData.songs.filter(song => song.genre === genre);
};
