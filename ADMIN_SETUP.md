# Admin Panel Setup Guide

## 🔐 **Password-Protected Admin Dashboard**

The admin panel provides secure access to experiment data with Excel export functionality.

### **Access URL:**
```
https://your-domain.com/admin
```

### **Default Password:**
```
serendipity2024
```

## 🛡️ **Security Features**

### **Authentication:**
- **Password protection** - Only authorized users can access
- **Session-based auth** - 24-hour session timeout
- **Secure cookies** - HTTP-only, secure, same-site cookies
- **Server-side validation** - All admin operations are server-side

### **Data Protection:**
- **GDPR compliant** - Automatic data expiration (2 years)
- **Encrypted storage** - All data encrypted in transit and at rest
- **Access logging** - All admin actions are logged
- **No data modification** - Admin panel is read-only (export only)

## 📊 **Admin Dashboard Features**

### **Real-time Statistics:**
- Total sessions count
- Group distribution (unfamiliar vs familiar)
- Completion rates
- Average session duration
- Genre preferences
- Recent session activity

### **Data Export:**
- **Excel format** - Professional spreadsheet export
- **Complete data** - All session data included
- **Multiple sheets** - Data + summary statistics
- **Structured format** - Easy to analyze in Excel/SPSS

### **Export Includes:**
- Session metadata (ID, group, genre, start/end times with full date and hour)
- Onboarding survey responses
- Song-specific survey responses
- Engagement metrics (page times, interactions)
- Summary statistics

## 🔧 **Configuration**

### **Environment Variables:**
```bash
# Admin password (change this!)
ADMIN_PASSWORD=your-secure-password-here

# Database connection (required for data access)
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### **Change Admin Password:**
1. Set `ADMIN_PASSWORD` environment variable
2. Restart your application
3. Use new password to access admin panel

## 📈 **Usage Instructions**

### **Accessing the Admin Panel:**
1. Navigate to `/admin` on your domain
2. Enter the admin password
3. View real-time statistics
4. Export data as needed

### **Exporting Data:**
1. Click "Export to Excel" button
2. File downloads automatically
3. Open in Excel for analysis
4. Data includes all sessions and responses

### **Data Analysis:**
- **Session tracking** - Monitor experiment progress
- **Response analysis** - Analyze survey responses
- **Engagement metrics** - Track user behavior
- **Completion rates** - Measure experiment success

## 🚨 **Security Best Practices**

### **Password Security:**
- Use a strong, unique password
- Change default password immediately
- Don't share password in plain text
- Consider using a password manager

### **Access Control:**
- Limit admin access to authorized personnel only
- Monitor admin panel usage
- Log all data exports
- Regular security reviews

### **Data Privacy:**
- All data is automatically deleted after 2 years
- No personal information is stored
- Data is anonymized for analysis
- GDPR compliance built-in

## 🔍 **Troubleshooting**

### **Common Issues:**

**"Unauthorized" Error:**
- Check if `ADMIN_PASSWORD` is set correctly
- Verify you're using the correct password
- Clear browser cookies and try again

**"Database not configured" Error:**
- Ensure `DATABASE_URL` is set
- Check Neon database connection
- Verify database schema is installed

**Export Fails:**
- Check database connection
- Ensure there's data to export
- Verify file permissions

### **Support:**
- Check application logs for errors
- Verify environment variables
- Test database connection
- Contact system administrator

## 📋 **Data Export Format**

The Excel export includes two sheets:

### **Sheet 1: Experiment Data**
- One row per session
- All survey responses flattened
- Engagement metrics included
- Easy to import into analysis tools

### **Sheet 2: Summary**
- Total session count
- Group distribution
- Completion statistics
- Average session duration

## 🎯 **Research Use Cases**

### **Data Analysis:**
- Import into SPSS, R, or Python
- Statistical analysis of responses
- Correlation analysis
- Group comparison studies

### **Reporting:**
- Generate research reports
- Create visualizations
- Track experiment progress
- Measure success metrics

The admin panel provides everything needed for comprehensive experiment data analysis! 🎉
