# Experimental environment for the Serendipity project

This is a Next.js project that serves as the experimental environment for the Serendipity project.
It has session tracking, random allocation to treatment groups, a music player with spoken explanations with lyrics, and a survey component.
Sessions, questions, answers and treatment groups are stored in the database (Neon PostgreSQL Free Tier).

## Experiment structure

The experiment is structured as follows:

1. **Welcome screen** - Introduction to the experiment
2. **Terms and conditions, informed consent**
   - Creates a new session in localStorage with unique session_id (timestamp in ms)
   - Randomly allocates user to "unfamiliar" or "familiar" group (50/50 chance)
   - Prevents duplicate participation by checking for existing completed sessions
   - Tracks engagement metrics: time on page, clicks, scrolls, interactions
3. **Onboarding survey** (gender, age, music frequency, favorite genres, music discovery)
   - Questions loaded from `src/data/questions.json`
   - All answers stored in localStorage
4. **Genre selection** - "Choose an unfamiliar/familiar genre" based on group allocation
5. **Audio player sequence** - 3 songs for chosen genre with randomized order and introductions:
   - **Song 1**: Random introduction style + random song selection
   - **Survey 1**: Post-listening questionnaire
   - **Song 2**: Remaining introduction style + remaining song
   - **Survey 2**: Post-listening questionnaire  
   - **Song 3**: Final introduction style + final song
   - **Survey 3**: Post-listening questionnaire
6. **Qualtrics survey** - Final questionnaire with all experiment data passed via URL parameters
7. **Thank you screen**

### Introduction Styles
- `no_introduction`: No spoken explanation
- `informative_introduction`: Introduction for users familiar with the genre
- `immersive_introduction`: Introduction for users unfamiliar with the genre

### Randomization
- **Group allocation**: 50/50 random assignment to unfamiliar/familiar
- **Song order**: Randomized per genre (3 songs, no repeats)
- **Introduction styles**: Randomized per song (3 styles, no repeats)
- **Session tracking**: All interactions and timing tracked in localStorage

## Tech stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Radix UI
- Class Variance Authority
- Clsx
- Lucide React
- Neon PostgreSQL Free Tier: 100 CU-hours per month, 0.5GB of storage, up to 2 vCPU, 8GB of RAM
- Posthog 

## Getting Started

1. Clone the repository
2. Run `npm install` to install the dependencies
3. Copy `.env.example` to `.env.local` and configure your Qualtrics URL:
   ```
   NEXT_PUBLIC_QUALTRICS_URL=https://your-qualtrics-instance.com/jfe/form/SV_xxx
   ```
4. Run `npm run dev` to start the development server
5. Open [http://localhost:3000](http://localhost:3000) to see the result

## localStorage Data Structure

All experiment data is stored locally in the browser under the key `serendipity_session`. See [METRICS_DOCUMENTATION.md](./METRICS_DOCUMENTATION.md) for complete details.

### Key Data Points
- **Session ID**: Unique timestamp-based identifier
- **Group**: Random allocation (unfamiliar/familiar)
- **Chosen Genre**: User's selected genre
- **Song Data**: For each of 3 songs - ID, introduction style, listening time, skip status, survey responses
- **Engagement Metrics**: Page timing, clicks, scrolls, audio interactions
- **Survey Responses**: Onboarding and post-listening questionnaires

## Qualtrics Integration

The final survey is embedded as an iframe and receives all experiment data via URL parameters. The integration automatically passes:
- Session metadata (ID, group, genre, timing)
- All survey responses (onboarding + post-listening)
- Song listening data (skips, timing, introduction styles)
- Engagement metrics (page times, interaction counts)

## Metrics Tracking

The experiment tracks comprehensive engagement metrics:
- **Page Timing**: Time spent on each screen
- **User Interactions**: Clicks, scrolls, audio controls
- **Audio Behavior**: Play/pause, skips, seeking, completion
- **Survey Responses**: All questionnaire answers
- **Session Data**: Group allocation, genre selection, randomization

See [METRICS_DOCUMENTATION.md](./METRICS_DOCUMENTATION.md) for detailed documentation of all tracked metrics and data analysis examples.

## Data structure (tables)
### - Questions
- id
- question: text
- type (multiple choice, checkbox, ratingscale, textinput)
- answer options: varchar[]
- survey_nr (1 -> onboarding, 2 -> post-exp, 3 -> final questionaire)


### - Sessions
- id (incremental)
- condition (id % 3 = 0 --> no, id % 3 = 1 --> inform, id % 3 --> immersive)
- posthog_session_id
- last_question: question_id
- session_completed BOOLEAN
- ip
- chosen_unfamiliar_genre
- song_likes: VARCHAR[] // song titles
- skipped_songs: JSONB // array [{title: "song title", skippedAfter: <milliseconds>}]
- start_time: DATETIME
- end_time: DATETIME

### - Anwsers
- id
- question_id
- session_id
- answer_option: VARCHAR

### Question ID Mapping:

Onboarding: 
on_
* Imagination: on_im_*
* Cognitive engagement: on_ce_*
* GMSI: on_gmsi_* 
* Intellect: on_in_*
* Emotional engagement: on_em_*


Demographics: 
dem_
* Gender: dem_1

Post-Item/post-listening: 
pi_
* Serendipity: pi_se_*
* Intellectual engagement: pi_ie_*
* Coping potential: pi_cp_*
* Perceived complexity: pi_pc_*
* Transportation: pi_tr_*

Final/post-list:
pl_
* Satisfaction: pl_sa_*
* Other comments: pl_oc_*
* Serendipity: pl_se_*
* Quality: pl_qu_*