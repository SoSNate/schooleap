# Deployment Guide - Unified Teacher Dashboard with Dual Modes

## 📋 Overview

The new unified teacher dashboard supports two teaching modes:
- **מצב פרטי (Private Mode)**: Individual student tutoring with personal tracking
- **מצב מוסדי (Institutional Mode)**: Classroom management with school/institution support

Teachers can operate in BOTH modes simultaneously and switch between them freely.

## 🚀 Deployment Steps

### Step 1: Deploy SQL Migration to Supabase

The SQL migration `supabase/migrations/20260427_teacher_modes.sql` contains:
- New columns in `profiles` table for mode management
- `teacher_mode_requests` table for admin approval workflow
- `teacher_institutional_enrollment` table for enrollment tracking
- 4 RPC functions for mode management

**Option A: Using Supabase CLI** (Recommended)
```bash
cd "C:\Users\12nat\Desktop\חשבונאוטיקה\כיתת חרום"
supabase db push
```

**Option B: Manual deployment via Supabase Dashboard**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to your project → SQL Editor
3. Open `supabase/migrations/20260427_teacher_modes.sql`
4. Copy the entire contents
5. Paste into a new SQL query in Supabase
6. Click "Run"

### Step 2: Verify Migration Success

Check that the following exist in your database:
- `profiles.teacher_modes` (array column)
- `profiles.primary_teacher_mode` (text column)
- `teacher_mode_requests` table
- `teacher_institutional_enrollment` table
- RPC functions: `get_teacher_mode_status`, `request_teacher_mode_change`, etc.

### Step 3: Deploy to Vercel

The code has been committed and pushed to GitHub.

```bash
# Vercel auto-deploys on push, or manually trigger:
vercel deploy --prod
```

## 🧪 Testing the Feature

### Local Testing (http://localhost:5173)

1. **Login as a teacher**
   - Click "כניסה עם Google"
   - Use a test teacher account

2. **View Mode Switcher**
   - Below the header, you should see the TeacherModeSwitcher component
   - Currently shows "מצב פרטי 👤" (Private Mode)

3. **Private Mode Features**
   - Shows individual student tracking
   - No classroom selector visible
   - Can see student telemetry and skills

4. **Request Institutional Mode**
   - Click "בקש גישה למצב מוסדי 🏫"
   - Fill in institutional enrollment form:
     - שם המוסד (Organization Name) - **required**
     - מספר תיקיה (Organization ID) - optional
     - דוא"ל איש קשר (Contact Email) - **required**
     - טלפון (Phone) - optional
   - Click "שלח בקשה"
   - Should see success toast: "✅ בקשה נשלחה"

5. **Verify in Supabase**
   - Go to Supabase → SQL Editor
   - Run:
     ```sql
     SELECT * FROM teacher_mode_requests 
     WHERE status = 'pending';
     
     SELECT * FROM teacher_institutional_enrollment;
     ```

### Mobile Testing (on Vercel HTTPS)

1. Visit your Vercel deployment URL
2. Login as teacher
3. See mode switcher on top
4. Test enrollment form submission
5. Check response in Supabase

## 👨‍💼 Admin Approval Workflow

### For Admin Panel (To Build Next)

Admins need to see and approve pending mode change requests:

```sql
-- Get all pending requests
SELECT 
  tmr.id,
  tmr.teacher_id,
  p.email as teacher_email,
  tmr.requested_mode,
  tmr.from_mode,
  tmr.reason,
  tmr.created_at,
  tie.organization_name,
  tie.contact_email
FROM teacher_mode_requests tmr
JOIN profiles p ON p.id = tmr.teacher_id
LEFT JOIN teacher_institutional_enrollment tie 
  ON tie.teacher_id = tmr.teacher_id
WHERE tmr.status = 'pending'
ORDER BY tmr.created_at;
```

To approve a request (as admin):
```sql
SELECT approve_teacher_institutional_mode(
  p_teacher_id => 'teacher-uuid-here',
  p_admin_id => 'admin-uuid-here'
);
```

## 📊 Database Schema Overview

### New Columns in `profiles`
```sql
teacher_modes          TEXT[]  -- Array of enabled modes: ['private', 'institutional']
primary_teacher_mode   TEXT    -- Current active mode: 'private' or 'institutional'
teacher_mode_status    JSONB   -- Mode metadata and approval dates
```

### New Tables

**teacher_mode_requests**
- Tracks requests for mode changes
- Requires admin approval
- Stores reason and admin notes
- Status: pending, approved, rejected

**teacher_institutional_enrollment**
- Stores institutional details
- Payment status tracking
- Contact information
- One enrollment per teacher (UNIQUE constraint)

## 🔄 Mode Switching Behavior

### Private Mode Teachers
- Can request access to Institutional Mode
- Shows enrollment form with organization details
- Request goes to admin for approval
- Once approved, can switch between modes instantly

### Institutional Mode Teachers
- Can request access to Private Mode
- Similar approval workflow
- Once approved, can manage both types of students

### Multi-Mode Teachers
- See mode switcher with both options
- Can switch instantly (no approval needed for switching, only for first access)
- Different UI presented based on active mode

## ⚠️ Important Notes

1. **Payment Integration Point**: In `teacher_institutional_enrollment`, the `payment_status` field is ready for payment integration (currently accepts: pending, completed, cancelled)

2. **Real-Time Sync**: Mode changes sync across devices via Supabase real-time subscriptions

3. **Default Mode**: Teachers default to 'private' mode on first login

4. **Data Visibility**: Each mode sees different students:
   - Private: All students linked via `teacher_id`
   - Institutional: Students in teacher's classrooms

## 🐛 Troubleshooting

### "שגיאה בטעינת מצב המורה"
- Check if migration deployed successfully
- Verify Supabase connection
- Check browser console for detailed error

### Mode Switcher Not Showing
- Teacher must be properly authenticated
- Check if `useTeacherModes` hook is loading
- Verify no errors in browser DevTools Console

### Enrollment Form Not Submitting
- Check required fields are filled
- Verify email format
- Check Supabase table `teacher_institutional_enrollment` for insert errors

## 📈 Next Steps

1. **Build Admin Panel** for approving mode change requests
2. **Implement Payment Integration** for institutional mode
3. **Add Telemetry Dashboard** with per-mode analytics
4. **Extend Assignment System** to support both modes properly
5. **Add Notification Settings** per mode
6. **Build Mode-Specific Reports** and exports

## 📞 Support

If issues occur during deployment:
1. Check Supabase migration logs
2. Review Vercel build logs
3. Check browser console for client-side errors
4. Verify all environment variables are set
