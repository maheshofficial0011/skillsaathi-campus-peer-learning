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

