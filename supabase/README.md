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

---

## 🎨 Step 9: Phase 3.5 — Global UX Polish & Readiness Check

Phase 3.5 introduces zero backend schema changes, meaning it operates completely using the existing Phase 1–3 tables and RLS configurations.

---

## 🎓 Step 10: Phase 4 — Senior Connect Module SQL Patch

To enable the Senior Connect module:
1. Open the [Supabase Dashboard](https://supabase.com/dashboard) SQL Editor.
2. Create a new query.
3. Paste the contents of `supabase/phase4-senior-connect-patch.sql` and click **Run**.
4. Confirm that the query finishes with `Success` or `Query returned no rows`.

### ✅ Verify Phase 4 Tables & Columns

Navigate to the **Table Editor** tab and confirm:
1. Table `profiles` has columns `is_senior_mentor` (boolean), `mentor_topics` (text[]), `mentor_bio` (text), `availability` (text), and `help_mode` (text).
2. Table `senior_guidance_requests` is created with columns `id`, `requester_id`, `senior_id`, `topic`, `message`, `preferred_mode`, `preferred_time`, `status`, `response_message`, `completed_at`, timestamps.

---

## 📅 Step 11: Phase 4 — Session Coordination & Contact Patch

To enable session coordination and secure meeting contact sharing for accept actions:
1. Open the [Supabase Dashboard](https://supabase.com/dashboard) SQL Editor.
2. Create a new query.
3. Paste the contents of `supabase/phase4-senior-connect-contact-patch.sql` and click **Run**.
4. Verify success.

### ✅ Verify Coordination Columns
Table `senior_guidance_requests` should contain three additional columns:
* `meeting_mode` (`text`, check constraint: Online, In-Person, Hybrid)
* `meeting_details` (`text`)
* `scheduled_time` (`text`)

---

## 🔄 Complete Supabase Table Registry

A fresh database setup requires executing the SQL files in the following order:
1. `supabase/schema.sql` (Initial tables: `profiles`, `help_requests`, `feedback`)
2. `supabase/phase2-feedback-edit-patch.sql` (RLS edit update support for reviews)
3. `supabase/phase2-delete-request-patch.sql` (DELETE RLS policy for `help_requests`)
4. `supabase/phase3-doubts-patch.sql` (Core Doubts tables: `doubt_posts`, `doubt_answers`)
5. `supabase/phase3-doubt-answer-ratings-patch.sql` (Ratings and replies tables + first answer auto-trigger)
6. `supabase/phase3-doubt-likes-pins-patch.sql` (Doubt answers/replies like and pin columns + policies + functions)
7. `supabase/phase3-doubt-reopen-delete-patch.sql` (DELETE RLS policy for `doubt_posts` + reopen status reset)
8. `supabase/phase3-answer-reply-edit-delete-patch.sql` (Edit/delete answers and replies + pin replies)
9. `supabase/phase3-accept-answer-fix.sql` (Multiple accepted answers RLS fix)
10. `supabase/phase4-senior-connect-patch.sql` (Senior Connect columns and requests table + trigger + RLS)
11. `supabase/phase4-senior-connect-contact-patch.sql` (Session coordination contact fields and mode validation constraint)
12. `supabase/phase4-contact-privacy-patch.sql` (Secure contact privacy fields and get_shared_contact / get_shared_help_contact DEFINER RPC functions)
13. `supabase/phase4-senior-reviews-safety-patch.sql` (Senior connect reviews rating and helpfulness table `senior_guidance_feedback` + RLS policies + trigger + partial request indexing)
14. `supabase/phase5-learning-circles-patch.sql` (Phase 5 Core Learning Circles tables: `learning_circles`, `learning_circle_members`, `learning_circle_resources`, `learning_circle_posts` + RLS helpers + triggers)
15. `supabase/phase5-learning-circle-resource-files-patch.sql` (Phase 5.1 Secure Resource Files upload patch: extends resources metadata columns + private storage bucket `learning-circle-resources` + storage SELECT/INSERT/DELETE RLS policies)
16. `supabase/phase5-learning-circle-join-requests-patch.sql` (Phase 5.2 Learning Circle Join Requests + Profile Extensions patch: adds join requests table, constraints, partial unique index, and RLS policies, plus extends `public.profiles` with optional academic/learning/work verification columns)
17. `supabase/phase5-learning-circle-join-requests-rls-fix.sql` (Phase 5.2 RLS INSERT fix patch: drops and recreates `lcm_insert` policy to allow circle owners to insert accepted applicants into memberships)
18. `supabase/phase5-learning-circle-workflow-polish-patch.sql` (Phase 5.3 Learning Circle Workflow Rules, Owner Settings, and Resource Pinned & Likes patch: adds meeting credentials, resource pinning fields, membership logs on requests, creates `learning_circle_resource_likes` table, and sets up RLS policies)
19. `supabase/phase5-learning-circle-exit-resource-verification-patch.sql` (Phase 5.4 Learning Circle Exit Workflow & Resource Verification System patch: adds leave log tracking columns to join requests and verification & recommendation columns to study resources, establishes verification status check constraints, and backfills metadata)

---

## 🔒 Complete RLS Policy Summary

| Table Name | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy |
| :--- | :--- | :--- | :--- | :--- |
| **`profiles`** | Authenticated users | Authenticated users | Owner (`auth.uid() = id`) | None |
| **`help_requests`** | Authenticated users | Authenticated users | Creator (`auth.uid() = created_by`) OR Helper (`auth.uid() = accepted_by` on accept) | Creator (`auth.uid() = created_by` AND status in `'open'`, `'closed'`) |
| **`feedback`** | Authenticated users | Creator (`auth.uid() = created_by` AND verified solver) | Creator (`auth.uid() = created_by`) | None |
| **`doubt_posts`** | Authenticated users | Authenticated users | Creator (`auth.uid() = created_by`) | Creator (`auth.uid() = created_by` AND status in `'open'`, `'closed'`) |
| **`doubt_answers`** | Authenticated users | Authenticated users (on open/answered doubts) | Creator (`auth.uid() = created_by`) | None |
| **`doubt_answer_ratings`** | Authenticated users | Creator (`auth.uid() = created_by` and receiver != creator) | Creator (`auth.uid() = created_by`) | None |
| **`doubt_answer_replies`** | Authenticated users | Authenticated users | Creator (`auth.uid() = created_by`) | None |
| **`senior_guidance_requests`** | Participants (`auth.uid() = requester_id` OR `auth.uid() = senior_id`) | Requester (`auth.uid() = requester_id` and not self-request) | Requester (`auth.uid() = requester_id` to cancel) OR Senior (`auth.uid() = senior_id` to respond) | None |
| **`learning_circles`** | Authenticated users | Authenticated users | Owner (`auth.uid() = created_by`) | None |
| **`learning_circle_members`** | Authenticated users | Self-join OR Circle Owner (requires accepted join request) | None | Member (`auth.uid() = user_id` and not owner) |
| **`learning_circle_resources`** | Circle members/owners | Circle members/owners | Creator (`auth.uid() = shared_by`) | Creator (`auth.uid() = shared_by`) OR Circle owner |
| **`learning_circle_posts`** | Circle members/owners | Circle members/owners | Creator (`auth.uid() = created_by`) | Creator (`auth.uid() = created_by`) OR Circle owner |
| **`learning_circle_join_requests`** | Requester OR Circle Owner | Requester (`auth.uid() = requester_id`, circle is active, and not member) | Requester (`status` to `'cancelled'`) OR Owner (`status` to `'accepted'` or `'rejected'`) | None |
| **`learning_circle_resource_likes`** | Circle members/owners | Circle members/owners | None | Owner (`auth.uid() = user_id`) |

### 🔒 Storage RLS Policies (Private Bucket: `learning-circle-resources`)
* **SELECT**: Authorized only for circle members and owners (checked securely via `public.can_access_learning_circle(extract_circle_id_from_path(name), auth.uid())`).
* **INSERT**: Allowed only for circle members and owners (checked securely via `public.can_access_learning_circle(extract_circle_id_from_path(name), auth.uid())`).
* **DELETE**: Restrained to the uploader of the storage object OR the circle owner.

> [!TIP]
> **Setup Reminder**: Always run these SQL patches in the exact order specified above to prevent relation or index errors. Verify that all RLS policies are enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) and that no root tables are exposed without filters.

---

### 🔍 Phase 5.4A: Old Accepted Requests Diagnostic & Remediation
For older accepted join requests that were created before Phase 5.4 lifecycle tracking was introduced (meaning `membership_created_at` or lifecycle fields are null), a user who left might trigger a false "Repair Needed (Membership Missing)" alert for the owner. 

To clean up those records, run the following diagnostic query first:
```sql
select r.*
from public.learning_circle_join_requests r
where r.status = 'accepted'
  and r.member_left_at is null
  and not exists (
    select 1
    from public.learning_circle_members m
    where m.circle_id = r.circle_id
      and m.user_id = r.requester_id
  );
```

After confirming the user intentionally left (e.g., they are no longer in the members list), perform the manual cleanup by updating that specific request ID:
```sql
update public.learning_circle_join_requests
set member_left_at = now(),
    leave_reason = 'Leaving by choice',
    leave_message = 'Marked as intentionally left after lifecycle tracking was added.',
    left_by = requester_id,
    removed_by = null,
    updated_at = now()
where id = '<confirmed_request_id>';
```

> [!WARNING]
> Do NOT execute automated, broad destructive queries on production data. Always target verified request IDs.
