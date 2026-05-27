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
  ├── components/          # Reusable UI component folders
  ├── hooks/               # Custom React hooks
  │    └── useAuth.ts      # Listens to Supabase session state changes & manages signouts
  ├── layouts/             # Structural layout wrappers
  │    └── MainLayout.tsx  # Dynamic layout containing the topbar and responsive navigation sidebar
  ├── lib/                 # Core SDK client wrappers & database API
  │    ├── supabase.ts     # Supabase client instantiation
  │    └── profiles.ts     # DB Queries to select/upsert public student profiles
  ├── pages/               # Feature page views
  │    ├── LandingPage.tsx
  │    ├── AuthPage.tsx    # Real login & signup forms with metadata fields connected to Supabase
  │    ├── DashboardPage.tsx
  │    ├── ProfilePage.tsx # Dynamic loader that fetches the profile, with manual creator fallbacks
  │    ├── DoubtsPage.tsx
  │    ├── LearningCirclesPage.tsx
  │    ├── ProjectMatePage.tsx
  │    └── SeniorConnectPage.tsx
  ├── types/               # TypeScript type declaration files
  │    └── index.ts        # Houses YearOfStudy, HelpMode, Profile, and AuthUser type interfaces
  ├── styles.css           # Global Tailwind CSS entry styles
  ├── App.tsx              # Dynamic router with route protection and active session listening
  └── main.tsx             # Application entrypoint script
supabase/
  ├── schema.sql           # Database schema containing profiles table, updated_at triggers, and automatic signup triggers
  └── README.md            # Simple database configuration and setup guide
```

---

## 🔑 Environment Variables Setup
Create a file named `.env.local` in the project root (ensure it is ignored by Git in `.gitignore`) and insert your credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

For team onboarding references, check out `.env.example`.

---

## 🚀 Step-by-Step Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Database Backend
1. Open the **SQL Editor** tab in your [Supabase Dashboard](https://supabase.com/dashboard).
2. Copy the statements inside `supabase/schema.sql` and run them.
3. Verify that the `profiles` table is created in your public schema.
4. Enable the **Email Provider** in **Authentication -> Providers** settings.

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
