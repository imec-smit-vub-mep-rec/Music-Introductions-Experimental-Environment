# Dummy Data Generator

This script generates realistic dummy data for the Serendipity Experiment database.

## Usage

```bash
# Generate 10 dummy sessions (default)
npm run generate-dummy-data

# Generate 100 dummy sessions
npm run generate-dummy-data 100

# Generate 1000 dummy sessions
npm run generate-dummy-data 1000
```

## What it generates

The script creates realistic dummy data for the `experiment_sessions` table including:

- **Session metadata**: Unique session IDs, group types (unfamiliar/familiar), chosen genres
- **Randomized content**: Song selections and introduction types (inform/immers)
- **Survey responses**: Realistic answers for all questionnaire sections:
  - Onboarding (personality, music preferences)
  - Demographics (gender, age, country)
  - Post-listening (song-specific questions for each of 3 songs)
  - Final (overall experience questions)
- **Engagement metrics**: Time spent, clicks, scrolls, device info, etc.
- **Raw session data**: Complete session backup with step-by-step progress
- **Qualtrics integration**: Response IDs for completed sessions
- **GDPR compliance**: Automatic expiration dates (2 years from start)

## Features

- **Realistic data**: Survey responses follow realistic patterns and distributions
- **Batch processing**: Efficiently inserts large amounts of data in batches
- **Conflict avoidance**: Automatically generates unique session IDs
- **Statistics**: Shows database statistics after insertion
- **Error handling**: Comprehensive error handling and logging

## Database Requirements

- PostgreSQL database with the `experiment_sessions` table
- `DATABASE_URL` environment variable or local PostgreSQL connection
- Proper permissions for INSERT operations

## Configuration

The script uses your existing experiment configuration from `src/lib/config.ts` to ensure:
- Correct question structures and IDs
- Valid genre and song selections
- Proper survey flow and response formats

## Example Output

```
Generating 100 dummy sessions for the Serendipity Experiment database...
Generating 100 dummy sessions...
Inserting sessions into database...
Inserted batch 1/1
Successfully inserted 100 dummy sessions!

Database Statistics:
Total sessions: 100
Completed sessions: 82
Unfamiliar group: 48
Familiar group: 52
Genres used: 5
```

## Notes

- The script generates data that follows realistic patterns (80% completion rate, balanced group distribution)
- All timestamps are randomized within reasonable ranges
- Survey responses are generated based on actual question structures
- The script is safe to run multiple times (generates unique session IDs)
- Maximum recommended batch size is 10,000 sessions per run

