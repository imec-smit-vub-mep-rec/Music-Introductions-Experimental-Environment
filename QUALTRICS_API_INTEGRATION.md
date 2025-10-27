# Qualtrics API Integration Documentation

## Overview

This document describes the integration of the Qualtrics API to replace the previous redirect-based approach for survey submission. The new implementation provides:

- **Direct API submission** to Qualtrics instead of redirecting users
- **Data redundancy** by saving responses to both Qualtrics and Neon database
- **Answer correction support** with automatic updates to both systems
- **Error handling and retry logic** for robust operation
- **Comprehensive logging** for debugging and monitoring

## Architecture

### Components

1. **QualtricsClient** (`src/lib/qualtrics.ts`) - Core API client
2. **API Route** (`src/app/api/qualtrics/submit/route.ts`) - Server-side submission handler
3. **Updated QualtricsScreen** (`src/components/screens/QualtricsScreen.tsx`) - UI component
4. **Session Management** (`src/lib/session.ts`) - Enhanced with Qualtrics response tracking
5. **Database Schema** (`neon-schema-redesigned.sql`) - Updated to include Qualtrics response ID

### Data Flow

```
User Answers → QualtricsScreen → API Route → QualtricsClient → Qualtrics API
                    ↓
              Session Management → Neon Database
```

## Configuration

### Environment Variables

Add these variables to your `.env.local` file:

```bash
# Qualtrics API Configuration
QUALTRICS_TOKEN=your_qualtrics_api_token
QUALTRICS_DATACENTER_ID=your_datacenter_id
QUALTRICS_SURVEY_ID=your_survey_id

# Remove or comment out the old redirect URL
# NEXT_PUBLIC_QUALTRICS_URL=https://your-qualtrics-instance.com/jfe/form/SV_xxx
```

### Getting Qualtrics Credentials

1. **API Token**:
   - Log in to your Qualtrics account
   - Navigate to Account Settings > Qualtrics IDs
   - Under the API section, generate and copy your API token

2. **Datacenter ID**:
   - In the same Qualtrics IDs section, note your Datacenter ID
   - This is used to construct the API base URL

3. **Survey ID**:
   - Find your survey ID in the survey settings
   - This is typically in the format `SV_xxxxxxxxxxxxxxxx`

## Features

### 1. Direct API Submission

Instead of redirecting users to Qualtrics, the system now submits responses directly via the API:

```typescript
// Submit new response
const result = await submitToQualtrics(sessionData, finalAnswers);

// Update existing response
const result = await submitToQualtrics(sessionData, finalAnswers, existingResponseId);
```

### 2. Data Redundancy

All responses are saved to both systems:

- **Qualtrics**: Primary survey platform with embedded data
- **Neon Database**: Local backup with complete session data

### 3. Answer Corrections

When users change their answers, the system automatically:

1. Updates the local session
2. Syncs to Neon database
3. Updates the Qualtrics response (if response ID exists)

```typescript
// Automatic correction handling
const handleAnswerWithCorrection = async (questionId: string, answer: AnswerValue) => {
  const isCorrection = responses[questionId] !== undefined;
  
  if (isCorrection) {
    await handleAnswerCorrection(questionId, answer);
  } else {
    handleAnswer(questionId, answer);
  }
};
```

### 4. Error Handling

The system includes comprehensive error handling:

- **Retry logic** for transient failures (3 attempts with exponential backoff)
- **Graceful degradation** - experiment continues even if Qualtrics fails
- **User feedback** - clear error messages when operations fail
- **Logging** - detailed logs for debugging

### 5. Embedded Data

All session data is sent to Qualtrics as embedded data:

```typescript
const embeddedData = {
  session_id: "1234567890",
  group: "unfamiliar",
  chosen_genre: "jazz",
  // ... all session metadata, answers, and engagement metrics
};
```

## API Reference

### QualtricsClient

#### `submitResponse(sessionData, finalAnswers)`

Submits a new survey response to Qualtrics.

**Parameters:**
- `sessionData: SessionData` - Complete session data
- `finalAnswers: Record<string, AnswerValue>` - Final survey answers

**Returns:**
- `Promise<QualtricsSubmissionResult>` - Submission result with response ID

#### `updateResponse(responseId, sessionData, finalAnswers)`

Updates an existing Qualtrics response.

**Parameters:**
- `responseId: string` - Qualtrics response ID
- `sessionData: SessionData` - Complete session data
- `finalAnswers: Record<string, AnswerValue>` - Updated answers

**Returns:**
- `Promise<QualtricsSubmissionResult>` - Update result

### Session Management

#### `updateQualtricsResponseId(responseId: string)`

Stores the Qualtrics response ID in the session for future updates.

#### `getQualtricsResponseId(): string | undefined`

Retrieves the stored Qualtrics response ID.

#### `updateFinalAnswersWithSync(answers: Record<string, AnswerValue>)`

Updates final answers and syncs to both Qualtrics and Neon database.

## Database Schema Updates

The database schema has been updated to include Qualtrics response tracking:

```sql
-- New column for Qualtrics integration
qualtrics_response_id VARCHAR(255), -- Qualtrics response ID for updates
```

## Migration Guide

### From Redirect to API

1. **Update Environment Variables**:
   ```bash
   # Add new variables
   QUALTRICS_TOKEN=your_token
   QUALTRICS_DATACENTER_ID=your_datacenter
   QUALTRICS_SURVEY_ID=your_survey_id
   
   # Remove old variable
   # NEXT_PUBLIC_QUALTRICS_URL=...
   ```

2. **Update Database Schema**:
   ```sql
   ALTER TABLE experiment_sessions 
   ADD COLUMN qualtrics_response_id VARCHAR(255);
   ```

3. **Deploy New Code**:
   - The new implementation is backward compatible
   - Existing sessions will work without Qualtrics response IDs
   - New sessions will automatically use the API

### Testing

1. **Test New Submissions**:
   - Complete a full experiment
   - Verify data appears in both Qualtrics and Neon database
   - Check that response ID is stored in session

2. **Test Answer Corrections**:
   - Submit initial answers
   - Change an answer
   - Verify both systems are updated

3. **Test Error Handling**:
   - Temporarily disable Qualtrics API
   - Verify experiment continues and data is saved locally

## Troubleshooting

### Common Issues

1. **"Qualtrics client not configured"**:
   - Check environment variables are set correctly
   - Verify API token is valid and has proper permissions

2. **"Qualtrics API request failed"**:
   - Check datacenter ID is correct
   - Verify survey ID exists and is accessible
   - Check API token permissions

3. **"Answer correction failed"**:
   - Verify response ID is stored in session
   - Check if Qualtrics response still exists
   - Review API logs for specific error details

### Debugging

Enable detailed logging by checking browser console and server logs:

```typescript
// Look for these log patterns:
console.log("📤 SUBMITTING TO QUALTRICS API:", ...);
console.log("✅ QUALTRICS SUBMISSION SUCCESSFUL:", ...);
console.error("❌ QUALTRICS SUBMISSION FAILED:", ...);
console.log("🔄 UPDATING QUALTRICS RESPONSE FOR ANSWER CORRECTION:", ...);
```

### Monitoring

Key metrics to monitor:

- **Submission Success Rate**: Percentage of successful Qualtrics submissions
- **Answer Correction Rate**: How often users change their answers
- **Error Rates**: Frequency of API failures
- **Response Times**: API call performance

## Security Considerations

1. **API Token Security**:
   - Store API token in server-side environment variables only
   - Never expose token in client-side code
   - Rotate tokens regularly

2. **Data Privacy**:
   - All data is still subject to GDPR compliance
   - Qualtrics data retention policies apply
   - Local database has 2-year expiration

3. **Error Handling**:
   - Sensitive data is not exposed in error messages
   - Failed operations don't compromise data integrity

## Performance Considerations

1. **API Rate Limits**:
   - Qualtrics has rate limits (typically 100 requests/minute)
   - Retry logic includes exponential backoff
   - Consider implementing request queuing for high volume

2. **Response Times**:
   - API calls are asynchronous and don't block UI
   - Users can continue even if Qualtrics is slow
   - Local database provides immediate backup

3. **Caching**:
   - Session data is cached in localStorage
   - Database syncs are batched for efficiency
   - Qualtrics response IDs are stored locally

## Future Enhancements

1. **Webhook Integration**:
   - Set up Qualtrics webhooks for real-time updates
   - Automatic sync when responses are modified in Qualtrics

2. **Batch Processing**:
   - Queue multiple submissions for batch processing
   - Reduce API call frequency during peak times

3. **Analytics Dashboard**:
   - Real-time monitoring of submission success rates
   - Error tracking and alerting
   - Performance metrics

4. **Advanced Error Recovery**:
   - Automatic retry for failed submissions
   - Manual retry interface for administrators
   - Data reconciliation tools
