# HURE Core - Complete Admin User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Users & Authentication](#managing-users--authentication)
4. [Website Content Management](#website-content-management)
5. [Organization Management](#organization-management)
6. [Clinic Management](#clinic-management)
7. [Staff Management](#staff-management)
8. [Billing & Subscriptions](#billing--subscriptions)
9. [Settings & Configuration](#settings--configuration)
10. [Reports & Analytics](#reports--analytics)
11. [Audit Logs](#audit-logs)
12. [Troubleshooting](#troubleshooting)

---

## 1. Getting Started

### Logging In as Super Admin
1. Navigate to your website URL + `/super-admin-login`
2. Enter your super admin email and password
3. Click "Sign In"

### Logging In as Regular Admin
1. Navigate to your website URL + `/login`
2. Enter your email and password
3. Click "Sign In"

### First Time Setup
After logging in for the first time:
1. Complete your profile information
2. Set up your organization details
3. Configure your clinics/locations
4. Invite staff members
5. Configure billing settings

---

## 2. Dashboard Overview

### Super Admin Dashboard
The Super Admin dashboard provides oversight of the entire platform:

**Key Sections:**
- **Analytics**: View platform-wide statistics
- **Organizations**: Manage all organizations on the platform
- **Clinics**: Oversee all clinic locations
- **Subscriptions**: Monitor billing and subscription status
- **Audit Logs**: Review system-wide activity
- **Site Content**: Edit website content and images

**Quick Actions:**
- Create new organizations
- Approve pending verifications
- View and resolve support requests
- Monitor system health

### Organization Admin Dashboard
Organization administrators see:
- Organization overview and statistics
- Staff management
- Clinic locations
- Billing information
- Settings and configurations

### Manager Dashboard
Clinic managers have access to:
- Staff schedules
- Attendance tracking
- Leave requests
- Payroll data
- Staff documents

---

## 3. Managing Users & Authentication

### Creating a New Super Admin
1. Open the file `create-super-admin.html` in a web browser
2. Enter the new admin's email address
3. Enter a secure password (minimum 8 characters)
4. Click "Create Super Admin"
5. The new admin can now log in at `/super-admin-login`

### Changing User Passwords

#### For Your Own Password:
1. Go to your profile settings
2. Click "Change Password"
3. Enter your current password
4. Enter your new password
5. Confirm the new password
6. Click "Update Password"

#### For Other Users (Super Admin Only):
1. Go to Admin Dashboard → Organizations Manager
2. Find the user's organization
3. Click on the organization
4. Locate the user
5. Click the three-dot menu next to their name
6. Select "Reset Password"
7. Enter a new temporary password
8. Notify the user to change their password on next login

### Changing Usernames/Email Addresses
1. Go to Admin Dashboard → Organizations Manager
2. Find the user's organization
3. Click on the user's profile
4. Click "Edit Profile"
5. Update the email address
6. Click "Save Changes"
7. User will receive a verification email at the new address

### Deleting User Accounts
⚠️ **Warning**: This action cannot be undone.

1. Open `delete-user-account.html` in a web browser
2. Enter the user's email address
3. Confirm the deletion
4. Click "Delete Account"

Alternatively, from the dashboard:
1. Navigate to Organizations Manager
2. Find the user
3. Click the three-dot menu
4. Select "Delete Account"
5. Confirm the deletion

### Inviting New Users
1. Go to Organizations Manager
2. Select the organization
3. Click "Invite Staff Member"
4. Enter their email address
5. Select their role (Admin, Manager, Staff)
6. Choose their clinic/location
7. Click "Send Invitation"
8. They'll receive an email with signup instructions

---

## 4. Website Content Management

### Accessing Site Content Editor
1. Log in as Super Admin
2. Go to Admin Dashboard
3. Click "Site Content" in the sidebar
4. You'll see tabs: General Text, Images & Logo, Features Grid, Pricing Plans, FAQs

### Editing General Text

#### Hero Section:
1. Click the "General Text" tab
2. Find the "Hero Section" area
3. Edit the following fields:
   - **Headline Prefix**: The first part of the main headline
   - **Headline Highlight**: The highlighted/colored part
   - **Hero Body Text**: The descriptive paragraph
   - **Hero Note**: Small text under the buttons

#### Pricing Section:
1. Scroll to "Pricing Header"
2. Edit:
   - **Eyebrow**: Small label above title
   - **Title**: Main pricing section title
   - **CTA Line 1**: First call-to-action line
   - **CTA Line 2**: Second call-to-action line
   - **Pricing Note**: Additional information text

#### Other Sections:
- **Contact Title**: Contact section heading
- **Contact Body**: Contact section description
- **Footer Blurb**: Text in the website footer

**Don't forget to click "Save Changes" after editing!**

### Uploading and Changing Images

#### Hero Image (Main Website Image):
1. Click the "Images & Logo" tab
2. Find the "Hero Image" section
3. Click "Upload Hero Image" button
4. Select your image file (recommended size: 1200x600px)
5. Wait for upload to complete
6. Preview the image
7. Click "Save Changes" at the top

**Supported formats**: JPG, PNG, WebP

#### Site Logo:
1. Click the "Images & Logo" tab
2. Find the "Site Logo" section
3. Click "Upload Logo" button
4. Select your logo file (recommended size: 300x100px)
5. Wait for upload to complete
6. Preview the logo
7. Click "Save Changes" at the top

#### Removing Images:
1. Find the image in the "Images & Logo" tab
2. Click "Remove Image" or "Remove Logo" button
3. Click "Save Changes"

**Best Practices for Images:**
- Use high-quality images (at least 1200px wide for hero)
- Compress images before uploading to improve loading speed
- Use PNG format for logos with transparency
- Keep file sizes under 2MB for best performance

### Editing Features Grid
1. Click the "Features Grid" tab
2. You'll see 6 feature cards
3. For each feature, edit:
   - **Title**: Feature name
   - **Icon Name**: Lucide icon name (e.g., 'users', 'calendar', 'clock')
   - **Description**: Feature description

**Available Icons**: users, calendar, clock, file, layers, shield, and more from [Lucide Icons](https://lucide.dev)

4. Click "Save Changes"

### Managing Pricing Plans
1. Click the "Pricing Plans" tab
2. You'll see all pricing tiers (Essential, Professional, Enterprise)
3. For each plan, edit:
   - **Name**: Plan name
   - **Price**: Monthly price in KES
   - **Tagline**: Short description
   - **Features**: One feature per line

4. Click "Save Changes"

### Managing FAQs
1. Click the "FAQs" tab
2. To edit existing FAQ:
   - Click in the Question or Answer field
   - Type your changes
3. To add new FAQ:
   - Click "Add New FAQ" button
   - Enter question and answer
4. To delete FAQ:
   - Click the trash icon next to the FAQ
   - Confirm deletion
5. Click "Save Changes"

### Resetting to Default Content
⚠️ **Warning**: This resets ALL content to defaults and cannot be undone.

1. In Site Content Manager
2. Click "Reset Defaults" button
3. Confirm the action
4. All content returns to original settings

---

## 5. Organization Management

### Viewing All Organizations
1. Go to Admin Dashboard
2. Click "Organizations Manager"
3. See list of all organizations with:
   - Organization name
   - Number of staff
   - Number of locations
   - Subscription status
   - Registration date

### Creating a New Organization
1. Click "Create Organization" button
2. Fill in:
   - **Organization Name**: Company/clinic name
   - **Admin Email**: Primary administrator's email
   - **Phone Number**: Contact number
   - **Address**: Physical location
3. Select subscription plan
4. Click "Create"
5. Admin receives welcome email

### Editing Organization Details
1. Find the organization in the list
2. Click on the organization name
3. Click "Edit Details"
4. Update information:
   - Organization name
   - Contact information
   - Address
   - Business registration details
5. Click "Save Changes"

### Managing Organization Settings
1. Select organization
2. Click "Settings" tab
3. Configure:
   - **Work Week**: Days of operation
   - **Business Hours**: Operating hours
   - **Leave Policies**: Annual leave, sick leave rules
   - **Payroll Settings**: Payment cycles, allowances
   - **Compliance Settings**: Statutory requirements

4. Click "Save Settings"

### Deactivating an Organization
1. Find organization in list
2. Click three-dot menu
3. Select "Deactivate"
4. Confirm action
5. Organization users can no longer log in
6. Data is retained but access is blocked

### Reactivating an Organization
1. Filter to show "Inactive" organizations
2. Find the organization
3. Click "Reactivate"
4. Users can log in again

---

## 6. Clinic Management

### Adding a New Clinic/Location
1. Go to Organizations Manager
2. Select the organization
3. Click "Clinics" tab
4. Click "Add Clinic"
5. Enter details:
   - **Clinic Name**: Location name
   - **Address**: Physical address
   - **Phone**: Contact number
   - **Manager**: Assign a clinic manager
   - **Operating Hours**: Business hours
6. Click "Save"

### Editing Clinic Information
1. Navigate to Clinics Manager
2. Select the clinic
3. Click "Edit"
4. Update information
5. Click "Save Changes"

### Managing Clinic Departments
1. Select clinic
2. Click "Departments" tab
3. Click "Add Department"
4. Enter:
   - Department name
   - Department head
   - Description
5. Click "Save"

### Assigning Staff to Clinics
1. Go to Staff Manager
2. Select a staff member
3. Click "Edit"
4. Under "Clinic Assignment", select clinic(s)
5. Click "Save"

### Viewing Clinic Statistics
1. Select clinic from Clinics Manager
2. View dashboard showing:
   - Total staff
   - Today's attendance
   - Pending leave requests
   - Upcoming shifts
   - Payroll summary

---

## 7. Staff Management

### Adding New Staff Members
1. Go to Staff Manager
2. Click "Add Staff Member"
3. Fill in personal details:
   - Full name
   - Email address
   - Phone number
   - ID/Passport number
   - Date of birth
4. Add employment details:
   - Position/Role
   - Department
   - Clinic/Location
   - Start date
   - Employment type (Full-time, Part-time, Contract)
   - Salary/Wage
5. Upload documents:
   - ID copy
   - Certificates
   - Contracts
6. Click "Create Staff Profile"

### Editing Staff Profiles
1. Find staff member in Staff Manager
2. Click on their name
3. Click "Edit Profile"
4. Update any information
5. Click "Save Changes"

### Managing Staff Roles & Permissions
1. Select staff member
2. Click "Roles & Permissions" tab
3. Choose role:
   - **Admin**: Full system access
   - **Manager**: Clinic management access
   - **Staff**: Basic employee access
4. Set specific permissions:
   - View schedules
   - Approve leave
   - Process payroll
   - Manage attendance
5. Click "Save Permissions"

### Uploading Staff Documents
1. Select staff member
2. Click "Documents" tab
3. Click "Upload Document"
4. Select document type:
   - ID Copy
   - Certificate
   - Contract
   - License
   - Other
5. Choose file
6. Add description
7. Click "Upload"

### Viewing Staff Documents
1. Select staff member
2. Click "Documents" tab
3. See all uploaded documents
4. Click document to view/download
5. Click "Delete" to remove document

### Deactivating Staff
1. Find staff member
2. Click three-dot menu
3. Select "Deactivate"
4. Specify reason:
   - Resigned
   - Terminated
   - On extended leave
5. Set effective date
6. Click "Deactivate"

---

## 8. Billing & Subscriptions

### Viewing Subscription Status
1. Go to Billing Manager
2. See current plan details:
   - Plan name
   - Monthly cost
   - Features included
   - Staff limit
   - Location limit
   - Next billing date

### Changing Subscription Plans
1. In Billing Manager
2. Click "Change Plan"
3. Select new plan:
   - Essential
   - Professional
   - Enterprise
4. Review changes
5. Click "Upgrade" or "Downgrade"
6. Confirm billing changes

### Managing Payment Methods
1. Go to Billing Manager
2. Click "Payment Methods"
3. To add new method:
   - Click "Add Payment Method"
   - Enter payment details
   - Click "Save"
4. To remove method:
   - Click trash icon
   - Confirm removal

### Viewing Billing History
1. In Billing Manager
2. Click "Billing History" tab
3. See all invoices:
   - Date
   - Amount
   - Status (Paid, Pending, Failed)
4. Click invoice to view details
5. Click "Download PDF" to save invoice

### Handling Failed Payments
1. Check email for payment failure notification
2. Log in to dashboard
3. Go to Billing Manager
4. Click "Update Payment Method"
5. Enter new payment details
6. Click "Retry Payment"

### Setting Up Billing Alerts
1. Go to Settings
2. Click "Billing Notifications"
3. Enable alerts for:
   - Upcoming payments
   - Payment failures
   - Invoice generation
   - Plan limit warnings
4. Enter notification email addresses
5. Click "Save Settings"

---

## 9. Settings & Configuration

### Organization Settings

#### General Settings:
1. Go to Settings → General
2. Configure:
   - Organization name
   - Business registration number
   - Tax identification number
   - Contact email
   - Contact phone
   - Website URL
3. Click "Save"

#### Work Week Settings:
1. Go to Settings → Work Week
2. Select operational days:
   - Monday to Sunday checkboxes
3. Set default hours for each day
4. Click "Save"

#### Leave Policies:
1. Go to Settings → Leave Policies
2. Configure:
   - **Annual Leave**: Days per year
   - **Sick Leave**: Days per year
   - **Maternity Leave**: Days allowed
   - **Paternity Leave**: Days allowed
   - **Comp Off**: Enable/disable
3. Set accrual rules:
   - Immediate
   - Pro-rata
   - After probation
4. Click "Save Policies"

#### Payroll Settings:
1. Go to Settings → Payroll
2. Configure:
   - **Pay Period**: Weekly, Bi-weekly, Monthly
   - **Pay Day**: Day of month
   - **Currency**: KES, USD, etc.
3. Add allowances:
   - House allowance
   - Transport allowance
   - Medical allowance
4. Configure deductions:
   - NSSF
   - NHIF
   - PAYE
   - Loans
5. Click "Save Settings"

#### Statutory Rules:
1. Go to Settings → Statutory Rules
2. Configure compliance settings:
   - NSSF rates
   - NHIF rates
   - PAYE brackets
   - Overtime rules
3. Upload compliance templates
4. Click "Save Rules"

### Notification Settings
1. Go to Settings → Notifications
2. Configure email notifications for:
   - Leave requests
   - Attendance alerts
   - Payroll completion
   - Document uploads
   - Schedule changes
3. Set SMS notifications
4. Choose notification recipients
5. Click "Save"

### Security Settings
1. Go to Settings → Security
2. Configure:
   - **Password Policy**: Complexity requirements
   - **Session Timeout**: Auto-logout time
   - **Two-Factor Authentication**: Enable/disable
   - **IP Whitelist**: Restrict access by IP
3. Click "Save Security Settings"

---

## 10. Reports & Analytics

### Attendance Reports
1. Go to Reports → Attendance
2. Select date range
3. Choose filters:
   - Clinic
   - Department
   - Staff member
4. View report showing:
   - Present days
   - Absent days
   - Late arrivals
   - Early departures
5. Click "Export CSV" or "Export PDF"

### Leave Reports
1. Go to Reports → Leave
2. Select period
3. View:
   - Leave taken
   - Leave balance
   - Pending requests
   - Leave trends
4. Export report

### Payroll Reports
1. Go to Reports → Payroll
2. Select pay period
3. View:
   - Gross salaries
   - Deductions
   - Net pay
   - Statutory contributions
4. Download payroll file for bank processing

### Staff Performance Reports
1. Go to Reports → Performance
2. Select staff and period
3. View metrics:
   - Attendance rate
   - Punctuality
   - Leave usage
   - Overtime hours
4. Generate performance review report

### Financial Reports
1. Go to Reports → Financial
2. Choose report type:
   - Payroll summary
   - Department costs
   - Clinic expenses
3. Select date range
4. View and export

### Custom Reports
1. Go to Reports → Custom
2. Click "Create Custom Report"
3. Select data sources:
   - Attendance
   - Leave
   - Payroll
   - Staff
4. Choose fields to include
5. Set filters
6. Save report template
7. Generate report

---

## 11. Audit Logs

### Viewing Audit Logs
1. Go to Admin Dashboard
2. Click "Audit Logs"
3. See chronological list of all actions:
   - User who performed action
   - Action type
   - Timestamp
   - IP address
   - Details

### Filtering Audit Logs
1. In Audit Logs page
2. Use filters:
   - **Date Range**: Specific period
   - **User**: Actions by specific user
   - **Action Type**: Login, Edit, Delete, etc.
   - **Resource**: Organizations, Staff, Payroll, etc.
3. Click "Apply Filters"

### Searching Audit Logs
1. Use search box
2. Enter keywords:
   - User email
   - Staff name
   - Action description
3. Results update in real-time

### Exporting Audit Logs
1. Apply desired filters
2. Click "Export"
3. Choose format:
   - CSV
   - PDF
   - JSON
4. Click "Download"

### Understanding Audit Log Actions

**Common Actions:**
- `USER_LOGIN`: User logged in
- `USER_LOGOUT`: User logged out
- `STAFF_CREATED`: New staff member added
- `STAFF_UPDATED`: Staff profile modified
- `STAFF_DELETED`: Staff removed
- `PAYROLL_PROCESSED`: Payroll completed
- `LEAVE_APPROVED`: Leave request approved
- `LEAVE_REJECTED`: Leave request denied
- `SETTINGS_CHANGED`: System settings modified
- `DOCUMENT_UPLOADED`: File uploaded
- `DOCUMENT_DELETED`: File removed

---

## 12. Troubleshooting

### Common Issues and Solutions

#### Cannot Log In
**Problem**: "Invalid email or password" error

**Solutions**:
1. Verify email address is correct
2. Check password (case-sensitive)
3. Use "Forgot Password" to reset
4. Clear browser cache and cookies
5. Try different browser
6. Contact admin if account is deactivated

#### Images Not Uploading
**Problem**: Image upload fails or times out

**Solutions**:
1. Check file size (max 2MB recommended)
2. Verify image format (JPG, PNG, WebP)
3. Check internet connection
4. Try compressing image first
5. Clear browser cache
6. Try different browser
7. Check Firebase Storage quota

#### Payroll Export Not Working
**Problem**: Cannot generate payroll file

**Solutions**:
1. Verify all attendance is marked
2. Check all leave is approved
3. Ensure pay period is closed
4. Verify staff have salary information
5. Check for missing deduction data
6. Try exporting smaller date range
7. Check error logs

#### Email Notifications Not Sending
**Problem**: Users not receiving emails

**Solutions**:
1. Check Brevo API key is configured
2. Verify email addresses are correct
3. Check spam/junk folders
4. Verify Brevo account is active
5. Check daily email limits
6. Run test email (use `test-brevo.ps1`)
7. Review audit logs for email errors

#### Dashboard Loading Slowly
**Problem**: Dashboard takes long to load

**Solutions**:
1. Clear browser cache
2. Check internet connection speed
3. Close unnecessary browser tabs
4. Try different browser
5. Check if issue affects all users (server problem)
6. Optimize database queries (contact developer)

#### Cannot Delete User
**Problem**: Error when trying to delete user account

**Solutions**:
1. Check if user has pending approvals
2. Reassign user's responsibilities first
3. Archive user instead of deleting
4. Use `delete-user-account.html` tool
5. Check audit logs for dependencies

#### Subscription Payment Failed
**Problem**: Payment declined or failed

**Solutions**:
1. Check payment method is valid
2. Verify sufficient funds
3. Contact bank about international transactions
4. Update payment details
5. Retry payment manually
6. Contact support if issue persists

---

## Additional Resources

### Testing Tools

#### Test Brevo Email API
File: `test-brevo.ps1`
```powershell
.\test-brevo.ps1
```
Tests if email service is configured correctly.

#### Create Super Admin
File: `create-super-admin.html`
Open in browser to create new super admin accounts.

#### Delete User Account
File: `delete-user-account.html`
Open in browser to permanently delete user accounts.

#### Test OTP System
File: `test-otp.html`
Open in browser to test one-time password functionality.

### Important Files to Know

- **firebase.json**: Firebase configuration
- **firestore.rules**: Database security rules
- **package.json**: Project dependencies
- **vite.config.ts**: Build configuration

### Getting Help

1. **Check Documentation**: Review this guide first
2. **View Audit Logs**: Check for error patterns
3. **Check Browser Console**: Look for JavaScript errors
4. **Review Error Messages**: Read full error details
5. **Contact Support**: Provide detailed information about the issue

### Best Practices

✅ **DO:**
- Regularly backup data
- Review audit logs weekly
- Test changes in development first
- Keep payment information updated
- Train staff on system usage
- Document custom workflows
- Monitor subscription usage

❌ **DON'T:**
- Share admin credentials
- Delete data without backup
- Make mass changes without testing
- Ignore security warnings
- Skip user training
- Modify code without testing

---

## Quick Reference Commands

### PowerShell Scripts

```powershell
# Test Brevo API
.\test-brevo.ps1

# Setup Supabase
.\setup-supabase.ps1

# Set Brevo API Key (Linux/Mac)
./set-brevo-key.sh
```

### Common URLs

- Super Admin Login: `/super-admin-login`
- Regular Login: `/login`
- Signup: `/signup`
- Admin Dashboard: `/admin`
- Employee Dashboard: `/employee`
- Employer Dashboard: `/employer`

---

## Version Information

**Guide Version**: 1.0  
**Last Updated**: February 1, 2026  
**Software Version**: HURE Core Web v1.0

---

## Contact & Support

For technical support or questions:
- Email: support@hurecore.com
- Documentation: Check this guide
- Emergency: Contact your system administrator

---

**End of Admin User Guide**

*This guide is maintained as software features evolve. Check for updates regularly.*
