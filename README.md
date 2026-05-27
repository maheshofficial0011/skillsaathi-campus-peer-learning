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
