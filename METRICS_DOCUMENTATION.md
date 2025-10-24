# Metrics Documentation

This document describes all the metrics tracked during the Serendipity experiment and how they are stored in localStorage.

## localStorage Data Structure

The experiment stores all data in localStorage under the key `serendipity_session`. The complete data structure is:

```typescript
{
  session_id: number,                    // Timestamp in ms when session was created
  group: "unfamiliar" | "familiar",     // Random allocation (50/50)
  chosen_genre: string | null,          // Selected genre ID
  start_time: string,                   // ISO timestamp of session start
  answers: {
    onboarding: Record<string, AnswerValue>,  // Onboarding survey responses
    songs: Array<{                        // Data for each of the 3 songs
      songId: string,                    // ID of the song played
      introduction_style: string,       // "no_introduction" | "informative_introduction" | "immersive_introduction"
      answers: Record<string, AnswerValue>, // Post-listening survey responses
      skipped: boolean,                  // Whether song was skipped
      skipped_at_ms: number | null,     // Milliseconds into song when skipped (if skipped)
      listening_time_ms: number         // Total time spent listening to song
    }>
  },
  engagement_metrics: {
    page_times: Record<string, number>, // Time spent on each page (milliseconds)
    interactions: Array<{               // All user interactions
      page: string,                     // Page where interaction occurred
      type: string,                     // Type of interaction
      timestamp: number,                // When interaction occurred
      data?: any                       // Additional interaction data
    }>
  }
}
```

## Tracked Metrics

### Session-Level Metrics

1. **Session ID**: Unique identifier (timestamp in milliseconds)
2. **Group Allocation**: Random assignment to "unfamiliar" or "familiar" group
3. **Chosen Genre**: The genre selected by the user
4. **Session Duration**: Total time from start to completion

### Onboarding Survey Metrics

All responses from the onboarding survey are stored in `answers.onboarding`:
- Gender
- Age range
- Music listening frequency
- Favorite genres (multiple selection)
- Music discovery methods

### Song-Level Metrics

For each of the 3 songs, the following data is tracked:

#### Song Selection & Introduction
- **Song ID**: Which song was played (randomized order)
- **Introduction Style**: Which introduction type was used (randomized)
  - `no_introduction`: No spoken introduction
  - `informative_introduction`: Introduction for familiar users
  - `immersive_introduction`: Introduction for unfamiliar users

#### Listening Behavior
- **Skipped**: Boolean indicating if song was skipped
- **Skipped At (ms)**: Exact timestamp when skip occurred (in milliseconds)
- **Listening Time (ms)**: Total time spent listening to the song

#### Post-Listening Survey
All responses from the post-listening survey are stored in `answers.songs[].answers`:
- Enjoyment rating (1-5)
- Familiarity with genre (1-5)
- Primary emotional response
- Likelihood to listen again
- Additional thoughts (text)

### Engagement Metrics

#### Page Timing
Time spent on each page is tracked in `engagement_metrics.page_times`:
- `welcome`: Time on welcome screen
- `terms`: Time on terms and conditions
- `onboarding`: Time on onboarding survey
- `genre-selection`: Time on genre selection
- `audio-song-1/2/3`: Time on each song player
- `survey-song-1/2/3`: Time on each post-listening survey
- `qualtrics`: Time on final survey
- `thank-you`: Time on thank you screen

#### User Interactions
All user interactions are tracked in `engagement_metrics.interactions`:

**Click Interactions**:
- `click`: All clicks with element type, text, and coordinates
- `audio_play`: Play button clicks
- `audio_pause`: Pause button clicks
- `audio_seek`: Seeking within audio
- `song_skip`: Skip button clicks
- `song_completion`: When song finishes naturally

**Scroll Interactions**:
- `scroll`: Page scrolling (throttled to once per second)

**Audio Player Interactions**:
- `audio_play`: When audio starts playing
- `audio_pause`: When audio is paused
- `audio_seek`: When user seeks to different position
- `song_skip`: When user skips a song
- `song_completion`: When song completes naturally

## Qualtrics Integration

The final survey is embedded as an iframe and receives all experiment data via URL parameters:

### URL Parameters Sent to Qualtrics

**Session Data**:
- `session_id`: Session identifier
- `group`: User's group allocation
- `chosen_genre`: Selected genre
- `start_time`: Session start timestamp

**Onboarding Responses**:
- `onboarding_[question_id]`: Each onboarding answer

**Song Data** (for each of 3 songs):
- `song_[1-3]_id`: Song identifier
- `song_[1-3]_introduction_style`: Introduction type used
- `song_[1-3]_skipped`: Whether song was skipped
- `song_[1-3]_skipped_at_ms`: Skip timestamp
- `song_[1-3]_listening_time_ms`: Total listening time
- `song_[1-3]_[question_id]`: Post-listening survey answers

**Engagement Metrics**:
- `page_time_[page_name]`: Time spent on each page
- `interaction_[page]_[type]`: Count of each interaction type per page

### Example Qualtrics URL

```
https://your-qualtrics-instance.com/jfe/form/SV_xxx?
session_id=1703123456789&
group=unfamiliar&
chosen_genre=disco&
start_time=2023-12-21T10:30:00.000Z&
onboarding_gender=Female&
onboarding_age=25-34&
song_1_id=disco_1&
song_1_introduction_style=informative_introduction&
song_1_skipped=false&
song_1_listening_time_ms=180000&
song_1_enjoyment=4&
song_1_familiarity=2&
page_time_welcome=5000&
interaction_audio-song-1_click=3&
...
```

## Data Analysis Examples

### Calculate Average Listening Time
```javascript
const session = JSON.parse(localStorage.getItem('serendipity_session'));
const avgListeningTime = session.answers.songs.reduce((sum, song) => 
  sum + song.listening_time_ms, 0) / session.answers.songs.length;
```

### Count Skipped Songs
```javascript
const skippedCount = session.answers.songs.filter(song => song.skipped).length;
```

### Get User's Group and Genre
```javascript
const { group, chosen_genre } = session;
```

### Analyze Engagement by Page
```javascript
const pageEngagement = session.engagement_metrics.page_times;
const totalTime = Object.values(pageEngagement).reduce((sum, time) => sum + time, 0);
```

### Count Interactions by Type
```javascript
const interactions = session.engagement_metrics.interactions;
const clickCount = interactions.filter(i => i.type === 'click').length;
const audioInteractions = interactions.filter(i => i.type.startsWith('audio_')).length;
```

## Privacy and Data Protection

- All data is stored locally in the user's browser
- No data is sent to external servers except for the final Qualtrics survey
- Session data can be cleared by calling `clearSession()` from the session utilities
- Users can participate anonymously - no personal identifiers are collected beyond the survey responses

## Technical Implementation

### Session Management
- Session is created on terms acceptance
- Data is automatically saved to localStorage on each interaction
- Session persists across page refreshes
- Duplicate participation is prevented by checking for existing completed sessions

### Engagement Tracking
- Page timing is tracked automatically using the `useEngagementTracking` hook
- Audio interactions are tracked through the AudioPlayer component
- All interactions are timestamped and stored with context

### Randomization
- Group allocation: 50/50 random assignment
- Song order: Randomized per genre (3 songs)
- Introduction styles: Randomized per song (3 styles, no repeats)
- All randomization is deterministic based on session creation time
