import { IntroductionStyle } from './session';

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function randomizeSongsForGenre(songIds: string[]): string[] {
  if (songIds.length !== 3) {
    throw new Error('Expected exactly 3 songs per genre');
  }
  const randomized = shuffleArray(songIds);
  console.log('🎲 SONGS RANDOMIZED:', {
    original_order: songIds,
    randomized_order: randomized,
    timestamp: new Date().toISOString()
  });
  return randomized;
}

export function randomizeIntroductions(): IntroductionStyle[] {
  const styles: IntroductionStyle[] = ['no_introduction', 'informative_introduction', 'immersive_introduction'];
  const randomized = shuffleArray(styles);
  console.log('🎭 INTRODUCTION STYLES RANDOMIZED:', {
    original_order: styles,
    randomized_order: randomized,
    timestamp: new Date().toISOString()
  });
  return randomized;
}

export function getIntroductionUrl(
  song: { informIntroductionUrl?: string; immersIntroductionUrl?: string }, 
  introductionStyle: IntroductionStyle, 
  _sessionGroup: 'unfamiliar' | 'familiar' // eslint-disable-line @typescript-eslint/no-unused-vars
): string | null {
  switch (introductionStyle) {
    case 'no_introduction':
      return null;
    case 'informative_introduction':
      return song.informIntroductionUrl || null;
    case 'immersive_introduction':
      return song.immersIntroductionUrl || null;
    default:
      return null;
  }
}

export function getIntroductionTranscriptUrl(
  song: { id: string; audioUrl: string }, 
  introductionStyle: IntroductionStyle
): string | null {
  if (introductionStyle === 'no_introduction') {
    return null;
  }
  
  // Use naming convention based on introduction style
  const basePath = song.audioUrl.replace('/song.mp3', '');
  if (introductionStyle === 'informative_introduction') {
    return `${basePath}/inform.json`;
  } else if (introductionStyle === 'immersive_introduction') {
    return `${basePath}/immers.json`;
  }
  
  return null;
}
