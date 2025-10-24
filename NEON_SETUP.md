# Neon PostgreSQL Setup Guide

## 🚀 Quick Setup

### 1. Create Neon Account
1. Go to [console.neon.tech](https://console.neon.tech/)
2. Sign up for free account
3. Create a new project

### 2. Get Connection String
1. In your Neon dashboard, go to "Connection Details"
2. Copy the connection string (starts with `postgresql://`)
3. Add it to your `.env.local` file:

```bash
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### 3. Run Database Schema
1. Install dependencies: `npm install`
2. Connect to your Neon database using any PostgreSQL client
3. Run the SQL from `neon-schema.sql` to create the tables

**Note**: If you have an existing database, run `migration-add-onboarding-columns.sql` first to add the new columns.

### 4. Test the Setup
The session sync will automatically work once you have the `DATABASE_URL` environment variable set.

**Note**: The database operations run server-side via Next.js API routes (`/api/session/*`), so there are no browser compatibility issues.

### 5. API Routes Available
- `POST /api/session/sync` - Sync session data to Neon
- `GET /api/session/get?sessionId=123` - Retrieve session from Neon
- `DELETE /api/session/delete?sessionId=123` - Delete session (GDPR compliance)

### 6. Database Schema Features
- **`onboarding_answers`** - Dedicated JSONB column for onboarding survey responses
- **`song_answers`** - Dedicated JSONB column for song-specific survey responses  
- **GIN indexes** - Optimized for querying JSONB data
- **Automatic data expiration** - Sessions auto-delete after 2 years
- **GDPR compliance** - Built-in data export and deletion capabilities

## 🔒 GDPR Compliance Features

### ✅ Built-in Privacy Features:
- **Automatic data expiration** (2 years)
- **Data encryption** at rest and in transit
- **EU data residency** options
- **Right to deletion** support
- **Data export** capabilities

### ✅ GDPR Compliance Checklist:
- [x] Data minimization (only store necessary data)
- [x] Consent management (built into your app)
- [x] Data retention policies (automatic deletion)
- [x] Encryption (TLS + database encryption)
- [x] Access controls (database-level security)
- [x] Audit trails (built into schema)
- [x] Data export (for user requests)
- [x] Right to deletion (implemented)

## 🎯 Why Neon is Perfect for Research:

1. **No Auto-Pause** - Unlike Supabase, Neon doesn't pause after inactivity
2. **Instant Cold Starts** - ~100-200ms vs 2-3 seconds
3. **Cost-Effective** - Pay only for what you use
4. **GDPR Ready** - ISO 27701 certified
5. **Reliable** - Point-in-time recovery, automatic backups
6. **Privacy-First** - EU data residency options

## 📊 Cost Estimation

For a research experiment:
- **Free tier**: 3GB storage, 10GB transfer/month
- **Typical session**: ~50KB per session
- **Free tier capacity**: ~60,000 sessions
- **Cost**: $0 for most research projects

## 🔧 Advanced Features

### Automatic Data Cleanup
The schema includes automatic cleanup of expired sessions:

```sql
-- Run this periodically to clean up expired data
SELECT delete_expired_sessions();
```

### Analytics (Anonymized)
```sql
-- Get anonymized analytics
SELECT * FROM session_analytics;
```

### Data Export for GDPR
```sql
-- Export all data for a specific session
SELECT * FROM session_data_export WHERE session_id = 1234567890;
```

## 🚨 Important Notes

1. **Environment Variables**: Never commit your `.env.local` file
2. **Data Retention**: Sessions auto-expire after 2 years
3. **Backup**: Neon provides automatic backups
4. **Monitoring**: Check Neon dashboard for usage and performance
5. **Security**: Use connection pooling and SSL in production

## 🆘 Troubleshooting

### Connection Issues
- Verify your `DATABASE_URL` is correct
- Check if your IP is whitelisted (if using IP restrictions)
- Ensure SSL is enabled (`sslmode=require`)

### Performance Issues
- Monitor connection pool usage
- Check for long-running queries
- Consider read replicas for analytics

### GDPR Compliance
- Review data retention policies
- Test data export functionality
- Verify deletion procedures work
- Document consent collection process
