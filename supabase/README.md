# Supabase Setup Guide — SkillSaathi

> **MVP Status:** Phase 6.6 — Final Polish & Demo-Ready  
> Apply all SQL patches in the exact order listed below. Skipping any patch will break dependent features.

---

## ⚡ Quick Start Summary

| Step | File / Action | Purpose |
|---|---|---|
| 1 | `schema.sql` | Base tables: profiles, help_requests, feedback |
| 2 | `phase3-doubts-patch.sql` | Doubts module |
| 3 | `phase3-*.sql` (4 patches) | Doubt upgrades: ratings, replies, likes/pins, accept-fix |
| 4 | `phase4-senior-connect-patch.sql` | Senior Connect module |
| 5 | `phase4-*.sql` (3 patches) | Senior Connect upgrades: reviews, privacy, contact |
| 6 | `phase5-learning-circles-patch.sql` | Learning Circles module |
| 7 | `phase5-*.sql` (5 patches) | Circle upgrades: join-requests, discussions, resources, exit/verify, workflow |
| 8 | `phase5.6a-discussion-board-polish-patch.sql` | Discussion board polish |
| 9 | `phase6-project-mate-finder-core-patch.sql` | Project Mate core module |
| 10 | `phase6-project-mate-resource-files-patch.sql` | Shared resource files |
| 11 | `phase6-project-mate-workspace-polish-patch.sql` | Workspace polish |
| 12 | `phase6-project-resource-reactions-patch.sql` | Resource reactions |
| 13 | `phase6-project-tasks-patch.sql` | Project Tasks module |
| 14 | `phase6-project-team-members-rls-fix.sql` | Team members RLS fix |
| 15 | `phase6-project-lifecycle-polish-patch.sql` | Project lifecycle polish |
| — | Storage Buckets | See Step 15 below for bucket setup |

> ⚠️ **Never skip patches.** Each patch may depend on tables or columns from a previous patch.  
> All patches are safe to re-run — they use `IF NOT EXISTS` / `DROP … IF EXISTS` guards.

---

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
20. `supabase/phase5-learning-circle-discussion-board-patch.sql` (Phase 5.6 Professional Discussion Board & Presence Tracking patch: extends `learning_circle_posts` with title, body, tags, pinning, resolution, soft-delete and edited_at; creates `learning_circle_post_replies` threaded comments table, `learning_circle_post_reactions` helpful reactions table, and `learning_circle_presence` real-time activity tracking table; full RLS policies and performance indexes for all new tables)
21. `supabase/phase5.6a-discussion-board-polish-patch.sql` (Phase 5.6a Discussion board UI & pagination polish patch)
22. `supabase/phase6-project-mate-finder-core-patch.sql` (Phase 6.1 Teammate finder core tables, check constraints, RLS policies, and unique constraints)
23. `supabase/phase6-project-team-members-rls-fix.sql` (Phase 6.1 Team member RLS policy non-recursive repair patch)
24. `supabase/phase6-project-mate-workspace-polish-patch.sql` (Phase 6.2 Workspace discussion boards, shared resource libraries, secure helper triggers, and RLS DEFINER helpers)
25. `supabase/phase6-project-mate-resource-files-patch.sql` (Phase 6.3 Secure project resource files uploads, private storage bucket setup, path extract helpers, and storage RLS)
26. `supabase/phase6-project-tasks-patch.sql` (Phase 6.4 Project task assignments, work submission, deadline extensions, verification, task-attachments private storage bucket, and RLS)
27. `supabase/phase6-project-resource-reactions-patch.sql` (Phase 6.4 Project resource helpful reactions core table, triggers, and RLS)
28. `supabase/phase6-project-lifecycle-polish-patch.sql` (Phase 6.4 Project lifecycle transitions, owner close/archive/complete workspace gates, and member leave controls)

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
| **`learning_circle_post_replies`** | Circle members/owners (non-deleted) | Circle members/owners (active circle only) | Author (`auth.uid() = created_by` non-deleted) OR Circle owner | Author (`auth.uid() = created_by`) OR Circle owner |
| **`learning_circle_post_reactions`** | Via post's circle access | Circle members/owners | None | Self (`auth.uid() = user_id`) |
| **`learning_circle_presence`** | Circle members/owners | Self (`auth.uid() = user_id`) with circle access | Self (`auth.uid() = user_id`) with circle access | None |

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

---

### 🗑️ Phase 5.6B: Discussion Soft-Delete & 4-Hour Retention Policy

**Core Principle**: Discussion posts and replies are **never hard-deleted** from the database. Soft deletion is implemented via `deleted_at` and `deleted_by` timestamp columns on `learning_circle_posts` and `learning_circle_post_replies`.

#### Database Behaviour
- When a post/reply is "deleted", the row is updated with `deleted_at = now()` and `deleted_by = auth.uid()`.
- The row remains permanently in the database for moderation and audit.
- RLS policies are **not changed** by Phase 5.6B. The server returns all rows; filtering is done client-side.

#### UI Filtering Rule (Client-Side)
The helper `isDeletedRecently(deletedAt)` in `src/lib/learningCircles.ts` determines visibility:
```ts
// Returns true if deleted within the last 4 hours
export const isDeletedRecently = (deletedAt?: string | null): boolean => {
  if (!deletedAt) return false;
  return Date.now() - new Date(deletedAt).getTime() <= 4 * 60 * 60 * 1000;
};
```

| Condition | UI Behaviour |
|---|---|
| `deleted_at IS NULL` | Post/reply renders normally |
| `deleted_at` within 4 hours | Placeholder card shown (no content, no actions) |
| `deleted_at` older than 4 hours | Completely hidden from UI — filtered out |

#### Deleted Placeholder Rendering
- Deleted post: shows `🚫 This post was deleted by the author.` or `removed by the owner.`
- Deleted reply: shows `🚫 This comment was deleted by the author.` or `removed by the owner.`
- Neither renders: title, body, tags, helpful buttons, reply buttons, edit/delete, pin, resolve controls.
- Both show a context timestamp: `Visible for a few hours for context · <relative time>`.

#### Stats and Count Accuracy
- `getDiscussionStats()`: counts visible posts (not deleted, or recently deleted within 4h). Type-specific stats (openQuestions, announcements) only count non-deleted posts.
- `getCirclePosts()`: filters out expired deleted posts after fetching; `replies_count` only includes visible replies.
- `getPostReplies()`: returns only visible replies (not deleted, or recently deleted within 4h).

#### Moderation Audit Queries
To view all soft-deleted posts across all circles:
```sql
SELECT id, circle_id, created_by, deleted_at, deleted_by, title
FROM public.learning_circle_posts
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;
```

To view soft-deleted replies:
```sql
SELECT id, post_id, created_by, deleted_at, deleted_by, body
FROM public.learning_circle_post_replies
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;
```

> [!NOTE]
> The 4-hour window is defined solely in `isDeletedRecently` in `src/lib/learningCircles.ts`. To adjust the retention window, change the `4 * 60 * 60 * 1000` constant and rebuild.

---

## 🤝 Step 16: Phase 6.1 — Project Mate Finder SQL Patch

To enable the Project Mate Finder (Find Teammates) module database core structures:

1. Open the [Supabase Dashboard](https://supabase.com/dashboard) SQL Editor.
2. Create a new query.
3. Paste the entire contents of `supabase/phase6-project-mate-finder-core-patch.sql` and click **Run**.
4. Confirm that the query finishes with `Success` or `Query returned no rows`.

### ✅ Verify Phase 6.1 Tables

Navigate to the **Table Editor** tab and verify the existence of the following 4 new tables:
- `project_posts`: Stores project team listings, preferences, difficulty, capacity, and coordinates.
- `project_roles`: Stores role profiles, priority level, slots needed, and filled slots.
- `project_applications`: Stores student teammate applications, snapshots, availability, status, and owner replies.
- `project_team_members`: Stores active roster of teammates with role titles.

### ✅ Verify Phase 6.1 Security Policies (RLS)

Check **Authentication -> Policies** in the sidebar. The following RLS rules should be successfully created:

**`project_posts`** — 3 policies:
- `Allow authenticated read project posts`: Select allowed for all logged-in students.
- `Allow authenticated insert own project posts`: Creators can insert where `created_by = auth.uid()`.
- `Allow owner to update own project posts`: Updates allowed where `created_by = auth.uid()`.

**`project_roles`** — 2 policies:
- `Allow authenticated read project roles`: R/O access for all authenticated students.
- `Allow owner to manage project roles`: Insert, update, and delete only if creator of project.

**`project_applications`** — 3 policies:
- `Allow applicant or project owner to view applications`: Only applicant or project owner can read.
- `Allow authenticated user to insert applications`: Only applicant can insert. Owner cannot self-apply.
- `Allow applicant or owner to update applications`: Applicant can withdraw (status to withdrawn); owner can approve/reject.

**`project_team_members`** — 3 policies:
- `Allow members or owners to see roster`: Select is gated to team members or project owner only.
- `Allow owner to insert team members`: Inserts allowed only by project owner.
- `Allow owner or member to update membership`: Member can mark own `left_at`; owner can kick member.

### ✅ DB Index Safeguards
Partial indexes are configured to enforce business logic:
- `unique_pending_project_applicant`: Enforces a maximum of one **pending** application per project and applicant, while allowing re-applications if previously rejected/withdrawn or left.
- `unique_active_project_member`: Enforces that a user can have at most one **active** membership role in a specific project team (i.e. `left_at` is null).

---

## 🛠️ Step 17: Phase 6.1 — Project Mate Finder Workspace Entry RLS Fix

If you experience an `"Error entering project workspace"` toast when trying to enter a newly created project's workspace, this is caused by a recursive infinite loop within the default PostgreSQL `SELECT` policy of `public.project_team_members` checking itself.

To resolve this and restore clean workspace loading instantly:
1. Open the [Supabase Dashboard](https://supabase.com/dashboard) SQL Editor.
2. Create a new query.
3. Paste the contents of `supabase/phase6-project-team-members-rls-fix.sql` and click **Run**.
4. This drops the recursive SELECT policy and replaces it with a clean, high-performance, non-recursive policy checking direct owner status via `project_posts` and active team status via `project_applications` table.

---

## 🔒 Step 18: Phase 6.2 — Project Mate Finder Lifecycle Polish & Workspace patch

To implement Phase 6.2 secure workspace boards (Discussion Board & Shared Resource Library) and resolve infinite loops securely:

1. Open the [Supabase Dashboard](https://supabase.com/dashboard) SQL Editor.
2. Create a new query.
3. Paste the entire contents of `supabase/phase6-project-mate-workspace-polish-patch.sql` and click **Run**.
4. This adds high-performance `SECURITY DEFINER` non-recursive postgres helper functions, maps them to `project_team_members` SELECT RLS policies, and bootstraps 4 new tables:
   - `project_discussion_posts`: Stores team board messages, categories, tags, pins, and soft-deletes.
   - `project_discussion_replies`: Stores threaded posts replies.
   - `project_discussion_reactions`: Stores upvote reaction rows (supports exactly `helpful` reactions).
   - `project_resources`: Stores verified HTTPS resources coordinates, verify queue metrics, pinned badges, and moderation logs.

### ✅ RLS Security Definer Gating

Security policies are protected by non-recursive helper functions executing under standard superuser context to skip PostgreSQL policy evaluation:
- `is_project_member(project_id, user_id)`: Checks if user has an active membership row where `left_at` is null.
- `is_project_owner(project_id, user_id)`: Checks if user created the project post.
- `can_access_project_workspace(project_id, user_id)`: Checks if user is owner OR an active member. Excludes left members and accepted applicants before roster entries.

---

## 🛠️ Step 19: Phase 6.3A — Live Capacity Sync & Self-Healing Database Metrics

In Phase 6.3A, the active team members roster (`project_team_members` where `left_at IS NULL`) serves as the single source of truth for all teammate counts and capacity metrics. Cached database columns (`project_posts.current_team_size` and `project_roles.slots_filled`) may occasionally become stale due to historical application actions or manual updates.

### 🔄 DB Self-Healing Synchronization
An automated helper `syncProjectTeamMetrics(projectId)` is called dynamically inside `respondToProjectApplication` (accept), `leaveProject` (voluntarily depart), `removeProjectMember` (kick), and `loadWorkspace` (viewing project settings). 

This helper executes the following steps:
1. Counts active members where `left_at IS NULL` for the project.
2. Updates `project_posts.current_team_size` with this active count (minimum of 1).
3. If active count >= `max_team_size`, automatically updates status to `'team_full'`.
4. If active count < `max_team_size` and status was `'team_full'`, automatically reverts status to `'recruiting'`.
5. Iterates through each role defined for the project, counts active members assigned to that specific `role_id` (`left_at IS NULL`), and updates `project_roles.slots_filled` with the live count.

### 🔍 Manual SQL Database Repair Query
If you notice any stale counts across your project tables in Supabase, you can run this safe idempotent SQL script in the **SQL Editor** to manually repair and synchronize all project posts and role slots filled:

```sql
-- 1. Sync project posts current_team_size with active roster count
UPDATE public.project_posts p
SET current_team_size = COALESCE(
  (
    SELECT COUNT(*)::int
    FROM public.project_team_members m
    WHERE m.project_id = p.id
      AND m.left_at IS NULL
  ),
  1
);

-- 2. Automatically heal status tags based on max team sizes
UPDATE public.project_posts
SET status = 'team_full'
WHERE current_team_size >= max_team_size;

UPDATE public.project_posts
SET status = 'recruiting'
WHERE current_team_size < max_team_size
  AND status = 'team_full';

-- 3. Sync project roles slots_filled with active roster role assignments
UPDATE public.project_roles r
SET slots_filled = COALESCE(
  (
    SELECT COUNT(*)::int
    FROM public.project_team_members m
    WHERE m.project_id = r.project_id
      AND m.role_id = r.id
      AND m.left_at IS NULL
  ),
  0
);
```

> [!TIP]
> This query is completely safe to run and does not delete history, applications, or depart active members. It simply aligns cache metrics with the active roster realities.

---

## 🎥 Step 20: Phase 6.4F — Supabase Storage Video MIME Support Patch

If video resources upload fails in the project mate workspace due to MIME policy rejection (e.g., `mime type video/mp4 is not supported`), you must run the updated storage resource patch `supabase/phase6-project-mate-resource-files-patch.sql` or run this standalone idempotent SQL update statement in your **SQL Editor**:

```sql
-- Safe bucket update statement to support video MIME types up to 20MB
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
      'application/pdf',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'text/csv',
      'application/json',
      'text/markdown',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'video/mp4',
      'video/webm',
      'video/quicktime'
    ]::text[],
    file_size_limit = greatest(coalesce(file_size_limit, 0), 20971520)
WHERE id = 'project-resources';
```

**Verification:**
Verify that the `project-resources` private storage bucket now accepts `.mp4`, `.webm`, and `.mov` up to 20MB cleanly, and successfully gates and plays video resource attachments within the workspace.




---

## ?? Step 21: Final MVP Deployment Checklist & Reminders

### 1. Apply SQL Patches in Order
Ensure all 28 SQL patches listed in the "Complete Supabase Table Registry" section above have been executed in exact order. All 28 patches are required for the final MVP to function fully.

### 2. Storage Buckets Configuration
Ensure the following storage buckets exist and are private:
* learning-circle-resources
* project-resources
* project-task-files

**For `project-resources` and `project-task-files`**, ensure they support up to 20MB file sizes and the following MIME types:
* PDFs (pplication/pdf)
* Images (image/png, image/jpeg, image/webp)
* Docs (pplication/msword, pplication/vnd.openxmlformats-officedocument.*)
* Video (ideo/mp4, ideo/webm, ideo/quicktime)

### 3. RLS Security Warning
* **Do NOT disable RLS (Row Level Security)** on any table. The application relies entirely on RLS for tenant isolation and data privacy.
* **Do NOT use the service role key** in the frontend or commit it anywhere. Use only the non key in VITE_SUPABASE_ANON_KEY.

### 4. Auth Redirect URL Configuration
Before taking the app live, go to **Authentication -> URL Configuration** in your Supabase dashboard and add:
* **Site URL**: https://your-deployed-vercel-url.vercel.app (your production URL)
* **Redirect URLs**:
  * https://your-deployed-vercel-url.vercel.app
  * https://your-deployed-vercel-url.vercel.app/*
  * http://localhost:5173
  * http://localhost:5173/*
Do NOT remove the localhost URLs to ensure local development continues working.

