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

### Verification Checklist & Docs

All verification procedures and manual testing checklists are detailed in [docs/testing-checklist.md](./docs/testing-checklist.md).
Detailed database tables and policies are summarized in [supabase/README.md](./supabase/README.md).

---

## 🚀 Future Roadmap: Phase 5 & Beyond
- **Phase 5: Learning Circles & Group Tutoring**: Study group circles, shared files, group doubts, live session booking, and notification boards.
