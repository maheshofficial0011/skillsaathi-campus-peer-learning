# Supabase Setup Guide for SkillSaathi

Follow these steps to set up your Supabase database and authentication backend.

---

## 🚀 Step 1: Database Setup
1. Open the [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to your project.
3. In the sidebar, navigate to the **SQL Editor** tab.
4. Click **New Query** to create a fresh workspace.
5. Open the `supabase/schema.sql` file in this repository, copy all of its contents, and paste it into the editor.
6. Click **Run** in the top right corner.
7. Confirm that the query finishes with `Success` or `Query returned no rows`.

---

## 🛠️ Step 2: Verification (Phase 1 & Phase 2 Tables)
1. Navigate to the **Table Editor** tab.
2. Verify that three public tables are available:
   - `profiles`: Holds student learning settings.
   - `help_requests`: Stores student peer tutoring requests.
   - `feedback`: Stores ratings and reviews for solved requests.
3. Navigate to **Authentication** -> **Policies** in the sidebar.
4. Verify that Row Level Security (RLS) policies are active:
   - `profiles`: 3 active policies.
   - `help_requests`: 5 active policies (including custom rules for accepted helper updates and accepting open requests).
   - `feedback`: 2 active policies (including subquery validation checks to prevent invalid feedback).

---

## 📧 Step 3: Configure Authentication
1. Go to **Authentication** in the sidebar, then navigate to **Providers** under settings.
2. Select **Email** and ensure it is toggled **ON**.
3. *Recommendation for testing*: If you want to bypass waiting for emails, you can temporarily toggle **Confirm email** to **OFF** in these provider settings (remember to restore it in production!).

---

## 🔑 Step 4: Environment Variables Setup
Create a file named `.env.local` in the project root containing your API credentials from **Project Settings** -> **API**:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 👥 Step 5: Multi-User Testing Checklist (Phase 2 Flow)
To verify the peer help request workflow, register two distinct mock accounts (e.g. `studentA@college.edu` and `studentB@college.edu`):

1. **User A (Requester)**:
   - Sign in and navigate to the **Dashboard**.
   - Click **+ Create Help Request** and fill out the details (e.g. "Calculus II Integration by Parts").
2. **User B (Helper)**:
   - Sign in as the second student.
   - Browse open requests on the **Dashboard**, locate User A's request, and click **Accept Request**.
   - Once accepted, click **Mark Solved** once the session is simulated/finished.
3. **User A (Feedback & Trust Score Update)**:
   - Sign back in as User A.
   - You will see the request status is now `'solved'`. Click **Give Feedback**.
   - Submit a rating of `5` stars with positive comments.
4. **Validation**:
   - Go to User B's profile. Verify that User B's **Trust Score** has updated automatically to `100%`!
