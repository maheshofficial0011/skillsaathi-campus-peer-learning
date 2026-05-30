# SkillSaathi - Campus Peer Learning & Collaboration Platform

SkillSaathi is a campus peer-learning and student collaboration platform designed to connect students, share academic resources, find project teammates, ask anonymous doubts, and facilitate mentor connections with campus seniors.

---

## 🛠️ Tech Stack & Dependencies
- **Core Framework**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vite.dev/)
- **Styling**: [Tailwind CSS v3](https://v3.tailwindcss.com/)
- **Backend Integrations**: [Supabase](https://supabase.com/) (`@supabase/supabase-js` SDK client)

---

## 📂 Project Structure

```text
src/
  ├── components/          # UI components
  │    └── help/           # Peer help widgets
  │         ├── HelpRequestCard.tsx # Renders cards with urgency/status and actions
  │         ├── HelpRequestForm.tsx # Modal form to post a help request
  │         └── FeedbackModal.tsx   # Review modal to submit feedback ratings
  ├── hooks/               # Custom React hooks
  │    └── useAuth.ts      # Listens to Supabase session state changes
  ├── layouts/             # Page structural layout templates
  │    └── MainLayout.tsx  # Dynamic layout containing the topbar and responsive navigation sidebar
  ├── lib/                 # Core SDK client wrappers & database APIs
  │    ├── supabase.ts     # Supabase client instantiation
  │    ├── profiles.ts     # DB Queries for public student profiles
  │    ├── helpRequests.ts # DB Queries to create, accept, solve, and close help requests
  │    └── feedback.ts     # DB Queries to insert classmate reviews & calculate scores
  ├── pages/               # Feature page views
  │    ├── LandingPage.tsx
  │    ├── AuthPage.tsx    # Real email/password sign-in and signup gateway
  │    ├── DashboardPage.tsx # Dynamic stats, filter board, and help requests explorer
  │    ├── ProfilePage.tsx # Dynamic stats displaying trust rating, badge, and solver count
  │    ├── DoubtsPage.tsx
  │    ├── LearningCirclesPage.tsx
  │    ├── ProjectMatePage.tsx
  │    └── SeniorConnectPage.tsx
  ├── types/               # TypeScript type declaration files
  │    └── index.ts        # Houses YearOfStudy, HelpMode, Profile, HelpRequest, and Feedback types
  ├── styles.css           # Global Tailwind CSS entry styles
  ├── App.tsx              # Dynamic router with route protection and session listening
  └── main.tsx             # Application entrypoint script
supabase/
  ├── schema.sql           # Database schema containing profiles, help_requests, feedback, RLS, and triggers
  └── README.md            # Onboarding guides to deploy backend tables and test triggers
```

---

## 🔑 Environment Variables Setup
Create a file named `.env.local` in the project root (ensure it is ignored by Git in `.gitignore`) and insert your credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

For team references, check out `.env.example`.

---

## 🚀 Step-by-Step Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Database Backend
1. Open the **SQL Editor** tab in your [Supabase Dashboard](https://supabase.com/dashboard).
2. Copy the statements inside `supabase/schema.sql` and run them.
3. Verify that three public tables are created successfully: `profiles`, `help_requests`, and `feedback`.
4. Verify that Row Level Security (RLS) is enabled on all tables, and policies are mapped.
5. Enable the **Email Provider** in **Authentication -> Providers** settings.

### 3. Run Dev Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) to verify and test locally.

### 4. Build Verification
Before commits, run the compiler bundle build:
```bash
npm run build
```

---

## 👥 Multi-User Testing Checklist (Phase 2 Peer Help Flow)
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

## 🤔 Phase 3: Doubts Module

> **Supabase patch required** before Phase 3 features are active. See [supabase/README.md](./supabase/README.md) Step 8.

Phase 3 adds a full **Anonymous Doubts Board** where students can post questions, answer each other, and mark doubts as solved.

### Features

| Feature | Description |
|---|---|
| **Post Doubts** | Any authenticated student can post a doubt with title, description, category, and tags |
| **Anonymous Option** | Poster can toggle anonymous mode — name is hidden from all other students in cards and modals |
| **Answer Doubts** | Authenticated students can answer open or answered doubts |
| **Mark Solved** | Doubt creator can mark one answer as the accepted answer, which marks the doubt as `solved` |
| **Close Doubts** | Doubt creator can close their doubt to prevent new answers |
| **Search & Filter** | Filter doubts by keyword, category, and status |
| **Long Answer Support** | Long answers truncate with a Show more / Show less toggle |

### Database Changes (Phase 3)

Run `supabase/phase3-doubts-patch.sql` in your Supabase SQL Editor to apply:

- `public.doubt_posts` — Doubt posts with anonymous flag, category, tags, and solved state
- `public.doubt_answers` — Answers linked to doubt posts with accepted flag
- Full RLS policies on both tables
- `updated_at` triggers on both tables

### Files Added / Modified (Phase 3)

```text
supabase/
  └── phase3-doubts-patch.sql   [NEW] Safe SQL patch for Phase 3 tables
src/
  ├── types/index.ts            [MOD] Added DoubtStatus, DoubtPost, DoubtPostWithProfile, DoubtAnswer, DoubtAnswerWithProfile
  ├── lib/doubts.ts             [NEW] Full API layer: getDoubts, createDoubt, closeDoubt, markDoubtSolved, getAnswersForDoubt, createAnswer, updateAnswer
  └── pages/DoubtsPage.tsx      [MOD] Replaced stub with full Supabase-connected module
```

### Phase 3 Manual Testing Checklist

1. Apply `supabase/phase3-doubts-patch.sql` in Supabase SQL Editor.
2. Navigate to the **Doubts** tab.
3. Click **Ask a Doubt** and post a named doubt — verify it appears on the board.
4. Post another doubt with anonymous toggled ON — verify `Anonymous Student` is shown.
5. As a second user, open a doubt and write an answer.
6. As the creator, open the answered doubt and click **✅ Mark as Accepted** on the answer.
7. Verify the doubt status changes to `solved` and the answer shows the **Accepted Answer** badge.
8. Verify the answer form is hidden on solved/closed doubts.
9. Test search and category/status filters — verify they work correctly.
10. Click **🔒 Close Doubt** on an open doubt and verify it closes.

---

## 🎨 Phase 3.5: Global UX Polish & Readiness Check

Phase 3.5 brings the application to full production-grade readiness, focusing on cohesive user experience, mobile-friendly layouts, reusable state widgets, and custom notifications.

### Key Enhancements

- **Global Toast Notification System**:
  - Pure-Tailwind custom notifications (Success, Error, Warning, Info) that auto-dismiss and stack elegantly.
  - Zero external package dependencies, ensuring excellent performance and clean bundle size.
  - Fully integrated into all primary user journeys (Auth logins, Profile saves, Peer Help actions, Feedback submissions, Doubt posts/replies/ratings/closes).
- **Reusable UX State Widgets**:
  - `LoadingState`: animated loader with optional text.
  - `ErrorState`: premium failure indicator card with an optional Retry handler.
  - `EmptyState`: illustration emoji and message card with custom call-to-actions.
- **Profile Completeness Indicator**:
  - Computation algorithm that scores user profile progress across 7 primary fields.
  - Informative progress card on the **My Profile** page detailing remaining edits to improve peer recommendations.
  - Dynamic **Dashboard Reminder Banner** that prompts the user to complete missing profile details (completely hidden when 100% complete).
- **Mobile Responsiveness Polish**:
  - Layout sidebar navigation is scroll-optimized and centered on mobile ports.
  - Responsive single-column grid layouts for all board filters, cards, and modal components.
  - Sizing guards (`max-w-2xl w-full max-h-[92vh]`) to fit details modals beautifully on mobile screens.
- **Unified Board Filters**:
- **Unified Board Filters**:
  - Perfectly synchronized spacing, search input height, borders, and reset/refresh layouts between Peer Help and Doubts boards.

---

## 🎓 Completed Phase 4: Senior Connect Module

Phase 4 bridges junior students seeking academic and career guidance with experienced senior student mentors:

1. **Find Seniors Directory**:
   - Advanced discovery tab allowing juniors to search seniors by name, filter by shared departments, or filter by specific expertise topics (Resume Review, Interview Guidance, Placement Prep, Higher Studies, etc.).
   - Displays detailed cards with Trust Scores, peer badges, skills known, bio, availability hours, and preferred guidance modes.

2. **Session Coordination & Trusted Meeting Links**:
   - Upgraded requests with coordination details: `meeting_mode` (Online, In-Person, Hybrid), `scheduled_time`, and `meeting_details` (links, location instructions, or contact handles).
   - Enforces link validation: only trusted platforms (Google Meet, Zoom, MS Teams, Cisco Webex) starting with `https://` are allowed.
   - Dynamic platform detection displays dedicated platform badges in the UI.

3. **Secure Contact Privacy (Per-Field Gating)**:
   - Extends student profiles with explicit private contact fields (`contact_phone`, `contact_whatsapp`, `contact_email`, `contact_other`).
   - Introduces independent granular sharing controls for each field (e.g. `share_whatsapp_after_accept`).
   - Highly secure definer RPC functions (`get_shared_contact` and `get_shared_help_contact`) ensure contact details are only returned for accepted/completed sessions to authorized participants, completely hiding them from public pages and profiles.

4. **Shared Consistent Departments & Custom "Other" Input**:
   - Integrated a single central department dictionary `src/lib/departments.ts` across the entire application (registration, profiles, filters).
   - Supports selecting/typing "Other" in registration and profiles. Selecting "Other" dynamically renders an **Enter your department** text field, preventing raw placeholder saves.

5. **Help Request Coordination Note**:
   - Lightweight UI coordination guidance card rendered in the help request details modal once a peer request is accepted, helping students coordinate meeting locations or links.

---

## 🎓 Completed Phase 4.5: Senior Connect Reputation & Safety Polish

Phase 4.5 refines the Senior Connect quality assurance, request safety, and availability management:

1. **Senior Guidance Feedback (Reviews & Ratings)**:
   - Juniors submit anonymous reviews for completed guidance sessions (1-5 star rating, helpfulness toggle, and comment), which are saved in the `senior_guidance_feedback` table.
   - Built an interactive feedback star modal in the requests tab allowing easy rating entry or edits.
   - Displays dynamic cumulative rating averages, total reviews, and Completed stats on the user dashboard.
   - Seniors are strictly blocked from reviewing their own sessions.

2. **Public Profile Ratings & Private Reviews Feed**:
   - Displays mentor cumulative rating averages, total reviews count, and up to the 3 most recent feedback reviews in the public profile card.
   - Keeps reviewer identity strictly private: reviews are displayed anonymously as `"Anonymous Junior"`, with no email or UUID exposure in the UI.
   - Separation of stats: Mentor guidance ratings remain completely separate from Peer Help trust scores and Doubt ratings.

3. **Mentor Availability Status Settings**:
   - Mentors can specify their current status (`Accepting Requests`, `Busy`, or `Unavailable`) inside the profile editor.
   - **Unavailable** mentors display an unavailable badge, an inline warning, and have their **Request Guidance** button completely disabled.
   - **Busy** mentors display a busy status badge and a warning banner in the UI but allow requests (warning juniors of potential delays).

4. **Duplicate Active Request Prevention**:
   - Implements both API-level duplicate validation and database-level partial unique index constraints (`pending`/`accepted` status only).
   - Disables request triggers and informs juniors if they already have a pending or accepted request with the selected senior.

*Note: Fully featured real-time in-app chat and push notifications are planned as part of the future learning circles module.*

---

## ⭐ Phase 4.6: Review Display & Mentor Review Management Polish

Phase 4.6 enhances platform credibility and profile layout quality by upgrading review visibility, sorting, and privacy settings before launching Learning Circles:

1. **Mentor Dashboard Reviews Section ("⭐ Reviews Received")**:
   - Added a new, dedicated feedback dashboard panel for senior mentors to view all reviews and ratings given by juniors after completed guidance sessions.
   - For connected users (requester and mentor in a completed session), mentors can view the reviewer's real public name, department, year of study, and topic of request.
   - Clicking **View Reviewer Profile** safely opens the junior's public profile modal.
   - Securely isolates contact details: reviewer email, UUID, or private contact fields are never exposed inside dashboard review cards.

2. **Refactored Public Profiles ("PublicProfileModal")**:
   - Refactored reviews into two separate, compact sections: **Senior Guidance Reviews** and **Peer Help Reviews**.
   - Displays reviews sorted by quality (best-first):
     1. Star rating descending
     2. Helpful true first
     3. Date created descending (newest first)
   - Capped initial reviews display count to a maximum of `3` per section, ensuring public profiles remain visually clean and do not grow excessively long.
   - Built smooth, separate expand/collapse controls (**Show more reviews** / **Show fewer reviews**) for each review section.
   - Strict public anonymity: displays all senior guidance reviews publicly under `"Anonymous Junior"`, with absolutely no reviewer email/UUID leaks.

3. **User's Own Profile Summaries (ProfilePage)**:
   - Added a **⭐ Top Received Mentor Reviews** section inside the Senior Mentor Impact card.
   - Automatically displays up to the top 3 best mentor reviews (sorted quality-first) on the user's own profile page.
   - Adds a redirection footnote if more than 3 reviews exist: `"View all received mentor reviews in Senior Connect dashboard."`

4. **Strict Reputation Separation**:
   - Ratings and impact scores are strictly segregated: Peer Help trust score/ratings, Senior Mentor average rating, and Doubt answer scores (1-10) remain independent.

### Verification Checklist & Docs

All verification procedures and manual testing checklists are detailed in [docs/testing-checklist.md](./docs/testing-checklist.md).
Detailed database tables and policies are summarized in [supabase/README.md](./supabase/README.md).

---

## 🎓 Completed Phase 5, 5.1, 5.2, 5.3 & 5.4: Learning Circles, Secure Private Resource Uploads, Join Requests & Resource Verification Systems

Learning Circles connect peer study groups, allowing collaborative resource sharing, status locking, coordinate boards, secure request-based join workflows, exit/remove logs, and owner resource verification systems:

1. **Learning Circles Workspace**:
   - Students can create cohort-based study groups, specify department/category/difficulty, limit member counts, and toggle public discoverability.
   - Dedicated Workspace Tabs: **Overview** (info row grids, uploader, guidelines), **Members** (joined roster list), **Resources** (dual-mode external link sharing and secure file sharing), and **Discussion** (Updates, Questions, Plans, and Announcements).

2. **Secure File Uploads (Supabase Storage)**:
   - High-fidelity segment control switches between external HTTPS links and native file uploads.
   - Supports dragging and dropping PDFs, images (PNG, JPG), plain text, and Office docs (Word, Excel, PowerPoint) up to **10MB**.
   - Enforces automatic title parsing and type suggestions upon choosing files.
   - Fully protected under a **private** Supabase Storage bucket `learning-circle-resources`. Access is completely blocked from standard public URLs.

3. **Short-Lived Signed Previews & Downloads**:
   - Files are fetched securely on-demand using short-lived (5-minute expiry) signed URL tokens.
   - In-app **Media Preview Lightbox Modal**: Native `iframe` PDF reader, image viewer, and highly stylized metadata fallbacks for Word/Excel/PowerPoint documents to preserve platform security.
   - Non-members are strictly prohibited from previewing, uploading, or downloading resources.

4. **Owner Management Console & Status Locks**:
   - Circle Owners can manage status locks in a unified interface:
     * **Active**: All uploads and discussion posts are open.
     * **Paused**: Resource uploads are locked/disabled. Existing discussions remain open.
     * **Archived**: Read-only lock state. Restricts new joins, uploads, and discussions.

5. **Split Permission Guidelines & RLS Safety**:
   - Displays clear Role Guidelines split cards indicating Owner vs Member capabilities.
   - Enforces cascading deletions: deleting a file resource from the UI safely removes it from the Supabase Storage bucket first before deleting the row from PostgreSQL.

6. **Secure Join Requests & Member Profile Verification (Phase 5.2)**:
   - **Direct instant joins are completely disabled** for normal users in the UI. Joining a circle requires a student to submit a formal join application.
   - **Join Request Modal**: Prompting the applicant to select a role interest (Learner, Contributor, Peer Mentor) and write an application message explaining their goals (minimum 10 characters required).
   - **My Circles Dashboard Panel**: A dedicated section displays a student's pending requests with direct cancellation actions.
   - **Owner Review Portal**: A dedicated **Join Requests** workspace dashboard tab lists all pending requests. Owners can view candidate credentials, enter an optional response message, and accept or reject applications.
   - **Paused/Archived State Protection**: New join requests are blocked on paused/archived circles, and owners cannot accept pending applications unless they return the circle to **Active** first.
   - **Student Academic Profiles**: Students can enrich their accounts with optional headline, academic interests, learning goals, current focus, and achievements.
   - **Strict URL & Privacy Controls**: External profile links (GitHub, LinkedIn, Portfolio) strictly require secure `https://` protocol and reject relative or dangerous inputs. Requester reviews hide all private contact info (email, phone, WhatsApp) and database UUIDs to prevent off-platform spamming or privacy leaks.

7. **Phase 5.3: Workflow Rules, Owner Settings, and Resource Ranking**:
   - **Confidential Meeting Coordinates**: Shielded display of `meeting_link` and `meeting_password` strictly to accepted members and owners. Completely hidden from public discover views and cards. Enforces `https://` protocol constraint.
   - **Cohort Capacity Bounds**: Enforces limits between 2 and 100, blocking owners from setting capacity below their active member count. Displays a prominent warning banner and disables accept triggers when full.
   - **Roster Alphabetical Sorting & kick controls**: Sorts circle members roster to pin the Owner at the very top, followed by standard members sorted alphabetically by full name. Empowers owners to remove standard members instantly, which cleanly terminates access and allows re-applying.
   - **Resource Pinning & Likes Interaction**: Regular members/owners can like/unlike resources (limit 1 like per student). Owners can pin important materials to the top of the shared directory. Resources are ordered dynamically using `pinned first -> likes count -> newest`.
   - **Pagination**: Supports clean visual pagination of uploaded resources, rendering only the top 3 items initially with smooth "Show more" / "Show fewer" toggles.

8. **Phase 5.4: Learning Circle Exit Workflow & Resource Verification System**:
   - **Leave Circle Exit Form**: Prompts departing members to choose a reason ("Leaving by choice", "Completed learning goal", etc.) and optional leave message. Correctly records `leave_reason`, `leave_message`, and `left_by` logs, resetting states to avoid false `"Repair Needed"` warnings.
   - **Owner Remove Member form**: Prompts owners removing a member to choose a reason ("Inactive member", "Resource misuse", etc.) and optional message. Correctly logs removal details.
   - **Member Submitted Resources Queue**: Regular members' shared resources are placed in `pending_verification` first, and are displayed strictly inside their own tracking dashboard until approved.
   - **Owner Resource Verification Queue Console**: Circle Owners can review, preview, safely analyze formats, and decline/approve materials with custom feedback logs.
   - **Link Safety Format Reviews**: Dynamic safety analysis checks protocols and flags potentially executable extensions (`.exe`, `.bat`, `.js`, etc.) dynamically inside forms and queues.
   - **Roster Resource Statistics**: Displays inline metrics for each roster member representing their contribution counts (`Shared | Verified | Pending | Rejected`).
   - **Star Recommendation Rank**: Empowers owners to mark exceptional resources as recommended, pinning them above general shared library resources. Sorting resolves to `pinned -> recommended -> likes -> newest`.

9. **Phase 5.5: Learning Circles Final Polish, UX Details, Documentation & Stability Pass**:
   - **Active Queue Isolation**: Confirmed Owner Verification Queue only displays resources with `verification_status = 'pending_verification'`.
   - **Rejected Resource History Collapsible**: Added a collapsible log section in the Resources tab for owners to review historically rejected files with rejection dates and reasons.
   - **Uploader Status Panel**: Retains rejected files in "My Submitted Resources" with clear explanation badges, while completely isolating them from general main library resources.
   - **Discover Cards Polish**: Added premium indicators for member counts (`👥 Members: C/M`), joined status (`✓ Joined`), owner role (`👑 Owner`), paused status (`Paused`), archived status (`Archived`), and full status (`⚠️ Full`). Enabled requesting full circles with warning microcopy.
   - **Join Requests Tab Empty State**: Shows clean, standardized fallback texts (`"No pending join requests."`) and custom badges (`🎓 Learner`, `✍️ Contributor`, `🤝 Peer Mentor`).
   - **Members Roster Spacing**: Made joined dates visible on tablets and small screens and cleaned statistics counters.
   - **Meeting Info Privacy & Credentials Copy Controls**: Confidential coordinates are visible strictly to verified members. Standardized copy-to-clipboard actions and added copy toast triggers.
   - **Main Verified Resources Empty States**: Displays `"No verified resources yet."` when the library is empty, and `"You have not submitted resources yet."` when member submitted resources are blank.
   - **TypeScript & Build Stability**: Verified comprehensive project compilation with zero TypeScript errors or warnings.
   - **Current Status**: Completed through Phase 5.5 Learning Circles polish.

10. **Phase 5.6: Professional Discussion Board, Moderation, Presence System & UX Polish**:
   - **Threaded Discussion Board**: Upgraded the discussion tab into a high-fidelity professional board supporting four post types: `discussion`, `question`, `announcement`, and `study_plan` with threaded comment replies.
   - **Interactive Stats Dashboard**: Added summary stat cards at the top of the Discussion tab — Total Posts, Open Questions, Announcements, and Active Replies — updated in real-time on every reply add or delete.
   - **Post Composer & Edit Modal**: New post modal with character-counted title and body fields, post type selector, and tag input. Edit modal allows authors to update their own posts inline.
   - **"Edited" Markers**: Modified posts and replies display a subtle `(edited)` timestamp label next to their timestamps.
   - **Soft-Delete Placeholders**: Deleted posts render a clear dashed placeholder card: `"🚫 This post was removed by the owner."` rather than disappearing abruptly.
   - **Question Resolution System**: Questions can be marked `✅ Resolved` by owners or authors. Resolved state is visible on the post card with a color-coded resolution badge. Filter controls allow browsing only open or resolved questions.
   - **Post Pinning & Helpful Reactions**: Owners can pin posts to the top. All members can react to posts with a 👍 Helpful upvote.
   - **Announcement Glow Line**: Pinned announcements display a prominent red glow bar at the top of their card for maximum visibility.
   - **Author Online Dot**: An animated green dot 🟢 overlaid on the author avatar indicates that the post author is currently active in the workspace.
   - **Search & Filter Memory**: Persistent search input, post type dropdown, question resolution filter, and "My Posts" toggle with instant feedback and memory across tab changes.
   - **Paused/Archived Read-Only Banner**: A clear amber banner appears in the Discussion tab when the circle is paused or archived, preventing new post creation.
   - **Collapsible Replies Drawer**: Clicking on a post expands a threaded reply drawer inline. Reply counts update instantly on the post list upon submission or deletion without a full reload.
   - **Lightweight Presence Bar**: A compact presence summary bar is shown between the workspace tabs and content area. Displays 🟢 online, 🟡 recently active, and ⚫ offline member counts using a simple database-timestamp heartbeat (no WebSockets required).
   - **Member Presence Indicators**: The Members tab now shows color-coded presence dots and a relative "Last seen" timestamp for each roster member.
   - **Presence Heartbeat**: Automatically upserts the current user's `last_seen_at` in the `learning_circle_presence` table every 60 seconds and on every tab change.
   - **New SQL Patch** (`supabase/phase5-learning-circle-discussion-board-patch.sql`): Extends `learning_circle_posts` with title, body, tags, pinning, resolution, soft-delete and edited_at fields; creates `learning_circle_post_replies`, `learning_circle_post_reactions`, and `learning_circle_presence` tables with full RLS policies and performance indexes.
   - **TypeScript & Build Stability**: Zero TypeScript errors. Clean `npm run build` compilation. All new types (`LearningCirclePostReply`, `LearningCirclePostReaction`, `LearningCirclePresence`) added to `src/types/index.ts`.
   - **Current Status**: Phase 5.6 fully implemented and verified.

11. **Phase 5.6B: Discussion Auto-Cleanup, Deletion Lifecycle & Production Polish**:
   - **4-Hour Placeholder Expiry**: Soft-deleted posts and replies show a context placeholder for up to 4 hours after deletion, then are **automatically hidden** from all UI views. No hard deletes — rows remain permanently for moderation.
   - **`isDeletedRecently` Helper**: Centralized utility in `src/lib/learningCircles.ts` enforces the 4-hour window across `getCirclePosts`, `getPostReplies`, and `getDiscussionStats`. Adjustable by changing a single constant.
   - **Strict Content Safety**: Deleted post/reply placeholders never render title, body, tags, helpful buttons, reply buttons, edit/delete actions, pin controls, or resolve controls. Content is hidden the instant the soft-delete is confirmed.
   - **Self-Delete vs. Owner-Remove Copy**: Placeholders distinguish between `"deleted by the author"` and `"removed by the owner"` for precise moderation context.
   - **Accurate Stats Counts**: `getDiscussionStats` now counts visible posts (non-deleted + recently-deleted-within-4h). Type-specific stats (open questions, announcements) only count non-deleted posts.
   - **Show More/Fewer Fix**: The `"➕ Show more discussions (N more)"` button counts only visible (non-expired) posts, preventing ghost count inflation from expired placeholders.
   - **Confirmation Modal Copy Updated**: Delete modal now informs the user that content is hidden immediately, a placeholder appears for up to 4 hours, and the record is retained for moderation.
   - **Success Toast Messaging**: Post and comment removal toasts now explicitly communicate the temporary placeholder behavior and auto-cleanup timeline.
   - **Documentation Hardened**: `supabase/README.md` now documents the soft-delete data model, the `isDeletedRecently` rule table, moderation audit SQL queries, and the 4-hour window constant location. `docs/testing-checklist.md` includes a full Phase 5.6B test suite covering deletion lifecycle, content safety, stats accuracy, and regression tests.
   - **Current Status**: Phase 5.6B fully implemented, build verified (zero TypeScript errors, clean `npm run build`).

12. **Phase 6.1: Find Teammates / Project Mate Finder Core System**:
   - **Teammate Finder System**: Developed a high-fidelity team formation system for student group work, hackathons, and research projects.
   - **Discover Board with Advanced Search**: Added a discover tab with instant filtering by category, project type, difficulty, work mode, open slots, beginner-friendly status, and hackathon tags.
   - **Compatibility Match Scoring**: Implemented a deterministic compatibility scoring algorithm (0-100%) that matches project prerequisites against the current user's profile skills, department, and academic year.
   - **Role Builder**: Built a custom role constructor allowing project creators to define title, description, skills, slot counts, and priority requirements for multiple team roles.
   - **Private Coordination Gating**: Team credentials (`coordination_link`, `github_repo_url`, `shared_doc_url`, `private_notes`) are strictly gated at both the API query level and the JSX presentation level. Only the owner and accepted active members can access them.
   - **Public-Safe Applicant Profiles**: Profile summaries shared with project owners strictly block private emails, phone numbers, WhatsApp links, and raw UUIDs, displaying academic qualifications and public GitHub/LinkedIn links safely.
   - **Idempotent SQL Patch** (`supabase/phase6-project-mate-finder-core-patch.sql`): Created database models for `project_posts`, `project_roles`, `project_applications`, and `project_team_members` tables, complete with RLS security policies, updated_at triggers, and partial unique indices to prevent duplicate pending applications or duplicate active memberships.
   - **Current Status**: Phase 6.1 core system fully implemented, build verified with zero TypeScript errors.

---

## 🚀 Completed Phase 6.3A: Project Formation Count Sync, Self-Healing DB Updates, and Custom Category/Type Support

Phase 6.3A fixes all teammate/role slot count inconsistencies by declaring active roster members (`project_team_members` where `left_at IS NULL`) as the single live source of truth. It implements a self-healing database sync engine and launches a custom other category/type taxonomy.

### Key Enhancements
- **Live Active Roster Counts**: All capacity displays (Workspace header, My Projects cards, Discover cards, Team Roster headers) now dynamically compute member counts using active roster members (`left_at IS NULL`), completely bypassing any stale cached metrics in the database.
- **Self-Healing Sync Engine (`syncProjectTeamMetrics`)**:
  - Automatically computes active roster counts and active assignments per role.
  - Heals `project_posts.current_team_size` and `project_roles.slots_filled` dynamically in the database.
  - Adjusts project status from `'team_full'` back to `'recruiting'` if a slot opens up, and vice versa.
  - Triggered automatically after a member leaves, is kicked, an application is accepted, and whenever a workspace is opened in the frontend.
- **Reopening Roles & Capacity**: Voluntarily leaving or being removed from a project team instantly decrements active counts, reopening team capacity and freeing role slots. The Apply modal instantly enables previously filled roles once they reopen.
- **Duplicate Membership Guard**: Check if applicant is already an active member before accepting, preventing duplicate active roster rows.
- **Custom "Other" Taxonomy input**: Category and Project Type select dropdowns now support a custom `"Other"` option. Selecting `"Other"` dynamically displays a text input with min 2 characters validation, storing the custom trimmed string directly in the database.
- **Backward Compatibility mapping (`formatProjectDisplayType`)**: Translates old database snake_case IDs (`portfolio_project`, `academic_term_project`) into user-friendly labels beautifully, ensuring old data matches new custom entries.
- **Dynamic Discover Filters**: Discover page filters dynamically extract and list unique custom category and project type strings from existing projects list, sorted alphabetically and appended after the default choices.

---

## 🚀 Completed Phase 6.3B: Project Mate Workspace Repairs & UX Polish

Phase 6.3B delivers critical repairs and rich UX details to the Project Mate Finder cohort cohort space, establishing secure single-user upvotes, lead role reservations, an extensiveSettings Console, secure sandboxed directories, and strict privacy scopes:

### Key Enhancements
- **One-User-One-Helpful-Reaction Table**:
  - Implemented `public.project_resource_reactions` table with unique constraints to guarantee strict single-user upvote behavior.
  - Linked database trigger `sync_project_resource_helpful_count()` to dynamically sync upvotes count from active reactions, resolving metric bloat.
  - Formatted upvote action with persistent styles tied directly to user reaction states mapping.
- **Lead Role Selection & Slot Reservation**:
  - Upgraded project creation modal (Section 4.5) to allow creators to choose their role: Project Lead Only (does not consume required role slots), dynamic open slot reservation, or a custom role title.
  - Reserving a dynamic slot immediately consumes that slot, displaying it as `1/1 filled` inline with active roster members.
- **Broader Settings Console Sidebar**:
  - Consolidated and exposed 12 editable project metadata fields pre-filling input values dynamically.
  - Restricted external coordination links, repository URLs, and shared documents strictly to secure HTTPS protocols.
  - Enforced capacity validations: maximum team size cannot be edited lower than the active roster count.
- **Premium Roster & Profile Cards**:
  - Sorted roster list to place Owner/Lead first, followed by active members alphabetically.
  - Restructured member cards to display initials avatars, departments/years, joined dates, dynamic role badges, and an integrated Public Profile preview button safely gating contact fields.
  - Restricted "Kick" controls strictly to project owners when rendering other active members.
  - Separated Past Members logs (owner-only) detailing exit dates and reasons with matching profile preview buttons.
- **Sandboxed Link-Based Sharing**:
  - Renamed misleading directory uploads to "Add Folder Link" and "Add Code Repo" link references, with explicit sandboxing warning microcopy.
  - Restricted verified resource deletions strictly to project owners.
  - Empowered uploaders to delete their own unverified (pending/rejected) submissions directly from "My Submitted Materials" view to cancel submissions.
- **Threaded Discussion UX Polish**:
  - Cleared nested inner scrollbars, allowing post panels and comments to flow naturally within the primary page canvas.
  - Stylized badges (`👑 Lead`, `👤 You`, `Announcement`), author avatars, composition alerts, and pinned states.
- **TypeScript & Build Stability**:
  - Verified comprehensive compilation with zero TypeScript errors or warnings.
  - Successfully verified production bundle using `npm run build`.

