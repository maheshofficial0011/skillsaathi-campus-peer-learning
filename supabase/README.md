# Supabase Setup Guide for SkillSaathi

Follow these steps to set up your Supabase database and authentication backend.

---

## 🚀 Step 1: Database Setup
1. Open the [Supabase Dashboard](https://supabase.com/dashboard).
2. Create a new project or open your existing project.
3. In the sidebar, navigate to the **SQL Editor** tab.
4. Click **New Query** to create a fresh workspace.
5. Open the `supabase/schema.sql` file in this repository, copy all of its contents, and paste it into the editor.
6. Click **Run** in the top right corner.
7. Confirm that the command finishes with `Success` or `Query returned no rows`.

---

## 🛠️ Step 2: Verification
1. Navigate to the **Table Editor** tab.
2. Verify that the `profiles` table exists in the `public` schema.
3. Click the table and confirm all columns (e.g. `full_name`, `department`, `year_of_study`, `section`, etc.) are created correctly.
4. Go to **Authentication** -> **Policies** to confirm that the three RLS policies are enabled on `public.profiles`.

---

## 📧 Step 3: Configure Email Provider
1. Go to **Authentication** in the sidebar, then navigate to **Providers** under the settings section.
2. Select **Email** and ensure it is toggled **ON**.
3. *Optional*: If you want to test signups immediately without waiting for verification emails, you can temporarily disable **Confirm email** in this provider settings window. (In a production environment, this should always be enabled.)

---

## 🔑 Step 4: Environment Variables Setup
Ensure your local project directory contains a `.env.local` file with the connection keys from the **Project Settings** -> **API** tab:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
