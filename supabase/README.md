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

---

## 🔄 Step 6: Feedback Editing & View Support Patch
If you have already loaded `schema.sql` and want to enable viewing and editing feedback, you must run the safe SQL patch:
1. Open the [Supabase Dashboard](https://supabase.com/dashboard) SQL Editor.
2. Create a new query.
3. Paste the contents of `supabase/phase2-feedback-edit-patch.sql` and click **Run**.
4. This adds RLS Update policy support and changes the trust score trigger to execute on both insertion and modifications automatically.

---

## 🗑️ Step 7: Safe Delete Request Policy Patch

> **Important**: The Delete Request button in the UI will fail until this patch is applied.

To allow users to permanently delete their own **open** or **closed** requests:
1. Open the [Supabase Dashboard](https://supabase.com/dashboard) SQL Editor.
2. Create a new query.
3. Paste the contents of `supabase/phase2-delete-request-patch.sql` and click **Run**.
4. Verify success — navigate to **Authentication → Policies → help_requests** and confirm the new DELETE policy is listed.

**What the patch does:**
- Adds a `DELETE` RLS policy on `public.help_requests`.
- Only the request creator (`auth.uid() = created_by`) can delete.
- Deletion is only allowed when `status IN ('open', 'closed')`.
- `accepted` and `solved` requests **cannot** be deleted from the UI.
- Requests with existing feedback reviews are blocked from deletion in the UI (client-side guard on `existingFeedback`).
- The patch is safe to re-run (`DROP POLICY IF EXISTS` before `CREATE POLICY`).
- Does **not** drop tables, delete data, or remove any other policies.

---

## 🤔 Step 8: Phase 3 — Doubts Module SQL Patch

> **Important**: The Doubts page will show a loading error until this patch is applied in Supabase.

To enable the Doubts Module (anonymous doubt posts and peer answers):

1. Open the [Supabase Dashboard](https://supabase.com/dashboard) SQL Editor.
2. Create a new query.
3. Paste the contents of `supabase/phase3-doubts-patch.sql` and click **Run**.
4. Confirm that the query finishes with `Success` or `Query returned no rows`.

### ✅ Verify Phase 3 Tables

Navigate to the **Table Editor** tab and confirm:

| Table | Expected |
|---|---|
| `doubt_posts` | Created with `id`, `title`, `description`, `category`, `tags`, `is_anonymous`, `status`, `created_by`, `solved_answer_id`, timestamps |
| `doubt_answers` | Created with `id`, `doubt_id`, `answer_text`, `created_by`, `is_accepted`, timestamps |

### ✅ Verify Phase 3 RLS Policies

Navigate to **Authentication → Policies** and confirm:

**`doubt_posts`** — 3 policies:
- `Authenticated users can read doubt posts`
- `Authenticated users can create doubt posts`
- `Doubt creator can update their own doubt`

**`doubt_answers`** — 4 policies:
- `Authenticated users can read doubt answers`
- `Authenticated users can answer open doubts`
- `Users can update their own answers`
- `Doubt creator can accept an answer`

### 📋 Phase 3 Manual Testing Checklist

1. **Post a Doubt (named)**:
   - Go to the **Doubts** tab.
   - Click **Ask a Doubt**.
   - Fill in title, description, category, tags. Toggle anonymous OFF.
   - Submit and verify the card appears in the list with your name.

2. **Post a Doubt (anonymous)**:
   - Create another doubt, but toggle **Post Anonymously** ON.
   - Verify the card shows `Anonymous Student` instead of your name.

3. **Search & Filter**:
   - Use the search bar to find doubts by keyword.
   - Use Category / Status dropdowns to filter.
   - Click Reset to clear filters.

4. **Answer a Doubt** (with a different user):
   - Log in as a second account.
   - Open a doubt by clicking **Answer / View**.
   - Write an answer and click **Post Answer**.
   - Verify the answer appears in the modal.

5. **Mark as Solved** (as doubt creator):
   - Log back in as the creator.
   - Open the doubt.
   - Click **✅ Mark as Accepted** on an answer.
   - Verify doubt status changes to `solved`, accepted answer shows the badge.
   - Verify the answer form is hidden after solving.

6. **Close a Doubt**:
   - As creator, open an open doubt.
   - Click **🔒 Close Doubt**.
   - Verify status changes to `closed` and answer form disappears.

7. **Long Answer Formatting**:
   - Post an answer longer than 400 characters.
   - Verify it truncates with `Show more ▼` button.
   - Click to expand and verify full text appears.

---

## 🔧 Phase 3 Polish: SQL Patches

### Required Patches (in order)

Run these in the Supabase SQL Editor one at a time:

| File | What it does |
|---|---|
| `supabase/phase3-doubt-answer-ratings-patch.sql` | Creates `doubt_answer_ratings` table (1–10 ratings) and `doubt_answer_replies` table (cross-questions/replies). Also installs `handle_doubt_first_answer()` DB trigger to auto-update doubt status to `answered` on first answer insert. |
| `supabase/phase3-doubt-reopen-delete-patch.sql` | Adds DELETE policy for `doubt_posts` (creator can delete own doubt only when status is `open` or `closed`). Refreshes UPDATE policy to allow reopening closed doubts. |

### Reopen Closed Doubts
- Creators can reopen their own closed doubts.
- Status reverts to `answered` if answer_count > 0, otherwise back to `open`.
- Answer form and reply forms become available again after reopen.
- Reopen button visible on card and in modal.
- **Requires**: `phase3-doubt-reopen-delete-patch.sql`

### Safe Delete Rules
- Creators can permanently delete their own doubts.
- Delete is blocked if:
  - `status = answered` or `status = solved`
  - `answer_count > 0`
- Only allowed when `status = open` or `status = closed` AND no answers.
- DB-level RLS also enforces `status IN ('open','closed')` for DELETE.
- **Requires**: `phase3-doubt-reopen-delete-patch.sql`

### Multiple Accepted Answers
- Doubt creators can accept multiple helpful answers per doubt.
- Each accepted answer shows `✅ Accepted Answer` badge.
- Doubt status changes to `solved` when first answer is accepted.
- `solved_answer_id` is set to the first accepted answer and preserved.
- Accepting additional answers after solved is allowed.
- Ratings and replies still work independently of accepted status.

### Separate Help vs Doubt Stats
- **Peer Help Reputation** (ProfilePage and PublicProfileModal):
  - Trust score, solved requests, avg help rating (1–5 stars), help reviews received
- **Doubt Contribution** (ProfilePage and PublicProfileModal):
  - Doubts asked, doubts answered, accepted answers, avg doubt rating (1–10), ratings received
- These two systems use different rating scales (1–5 vs 1–10) and are never combined.

### Asker Profile Links
- Non-anonymous doubt askers' names are clickable links in DoubtCard and DoubtDetailsModal.
- Clicking opens PublicProfileModal for the asker.
- Anonymous doubts show "Anonymous Student" (non-clickable).
- PublicProfileModal opens with `layer="top"` when opened from inside DoubtDetailsModal.
