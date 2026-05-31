# SkillSaathi — Campus Peer Learning Platform

<<<<<<< HEAD
[![MVP Complete](https://img.shields.io/badge/MVP-Complete-22c55e)](#)
[![Live on Vercel](https://img.shields.io/badge/Live-Vercel-000000)](https://skillsaathi-campus-peer-learning.vercel.app/)
[![React](https://img.shields.io/badge/React-TypeScript-61dafb)](#)
[![Supabase](https://img.shields.io/badge/Supabase-Ready-3ecf8e)](#)
[![Phase](https://img.shields.io/badge/Phase-6.7%20Final%20Showcase-818cf8)](#)

SkillSaathi Campus Peer Learning is a campus peer-learning and project collaboration platform where students can ask anonymous doubts, join learning circles, connect with seniors, find project teammates, collaborate inside secure workspaces, share resources, assign tasks, submit work, and track verified project contributions.

## Project Showcase & One-Click Demo

- **Live App:** https://skillsaathi-campus-peer-learning.vercel.app/
- **GitHub Pages Showcase:** https://maheshofficial0011.github.io/skillsaathi-campus-peer-learning/
- **Project Showcase Source:** [`docs/index.html`](docs/index.html)
- **Project Overview:** [`docs/project-overview.md`](docs/project-overview.md)
- **Testing Checklist:** [`docs/testing-checklist.md`](docs/testing-checklist.md)
- **Supabase Setup Guide:** [`supabase/README.md`](supabase/README.md)

## MVP Status

- **MVP Complete**
- **Demo Ready**
- **GitHub Ready**
- **Supabase Ready**
- **Vercel Ready**
- **GitHub Pages Showcase Ready**
=======
![MVP Complete](https://img.shields.io/badge/MVP-Complete-brightgreen)
![Live on Vercel](https://img.shields.io/badge/Live-Vercel-black)
![Supabase Ready](https://img.shields.io/badge/Supabase-Ready-3ECF8E)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Vite](https://img.shields.io/badge/Vite-Build-646CFF)
![Phase 6.6 Final Polish](https://img.shields.io/badge/Phase-6.6%20Final%20Polish-indigo)
>>>>>>> backup/local-phase-6-6-before-showcase-merge

## Problem Statement

<<<<<<< HEAD
Students often struggle to find peer help, form consistent study groups, connect with seniors, find project teammates, manage project work, and prove real contribution history during reviews. SkillSaathi solves these problems by combining peer learning, senior guidance, team formation, and verified project collaboration in one platform.

## Core Modules

### Authentication & Navigation
Secure authentication using Supabase Auth, protected routing, and email/password login.

### Dashboard
A central hub for tracking peer learning activity, recommended requests, accepted help, and active work.

### Anonymous Doubts
Post doubts anonymously, accept help, answer questions, filter doubts, and view solutions.

### Learning Circles
Create or join study circles, manage join requests, hold discussions, and share verified resources.

### Senior Connect
Request guidance from verified senior mentors and view public-safe mentor profiles and reviews.

### Find Teammates / Project Mate
Create project posts, define required role slots, review applications, accept teammates, and manage secure team workspaces.

### Project Workspace
Active project teams can access coordination details, team discussion, shared resources, task boards, team roster, past members, and role slots.

### Shared Resources
Upload and verify links, PDFs, images, documents, folders, code repositories, and videos. Private files use signed URLs and do not expose raw storage paths.

### Project Tasks
Team leads assign tasks with deadlines and attachments. Members submit work, request extensions, and receive verification or revision feedback.

### My Profile and Contribution History
A public-safe profile showcasing skills, dynamic badges, mentor reviews, verified project contributions, active project teams, and pending work.
=======
## 🌐 Live Demo

**[https://skillsaathi-campus-peer-learning.vercel.app/](https://skillsaathi-campus-peer-learning.vercel.app/)**
>>>>>>> backup/local-phase-6-6-before-showcase-merge

## Key Features

<<<<<<< HEAD
- Anonymous doubt posting and peer help requests
- Learning circle creation, joining, discussion, and resources
- Senior guidance and mentor review workflows
- Project mate finder with role slots and capacity tracking
- Owner approval/rejection lifecycle for project applications
- Secure project workspace gated by active membership
- Team discussion, shared resources, and resource verification
- PDF, image, document, and video preview/download support
- Project task assignment, member submissions, deadline extensions, and lead verification
- Verified contribution history in My Profile
- Dynamic profile badges and internally scrollable long-list sections
- Supabase RLS, private storage buckets, signed URLs, and contact privacy gating
=======
## 📖 Project Overview

**SkillSaathi** is a full-stack campus peer-learning platform where students can:

- Ask **anonymous doubts** and receive peer answers
- Join and manage **learning circles** (study groups)
- Request guidance from **verified senior mentors**
- Find **project teammates** with matching role requirements
- Collaborate in **private project workspaces**
- Share **resources** (docs, images, videos) with team members
- Assign and complete **project tasks** with deadline tracking
- Submit deliverables and receive **lead verification**
- Track their **verified contribution history** on their profile

SkillSaathi is designed to be demo-ready, production-safe, and easy to extend.

---

## 🚩 Problem Statement

Students often struggle to:

- Find reliable peer help for academic doubts without fear of judgement
- Build focused study groups with like-minded peers
- Connect with seniors who have relevant project and career experience
- Form project teams with specific required skills and roles
- Manage team work, track contributions, and meet deadlines together
- Build a verifiable history of their contributions beyond grades alone

---

## ✅ Solution

SkillSaathi solves all of the above with seven integrated modules:

| Module | Description |
|---|---|
| **Anonymous Doubts** | Post doubts without revealing identity; peers answer, upvote, and pin best answers |
| **Learning Circles** | Create/join structured study groups with join-request workflow and shared resources |
| **Senior Connect** | Request 1-on-1 guidance sessions from verified senior mentors |
| **Project Mate Finder** | Post project ideas, open role slots, and recruit teammates |
| **Project Workspace** | Private team workspace with discussion board, shared resources, and file previews |
| **Project Tasks** | Lead-assigned tasks with submissions, verifications, deadline extensions |
| **Verified Contributions** | Profile shows verified tasks, badges, and contribution history |

---

## 🚀 Feature Modules

### 🔐 Authentication
- Email + password sign-up and sign-in using Supabase Auth
- Profile auto-created on first login
- Email confirmation flow supported
- Secure protected routing

### 📊 Dashboard
- Central hub showing active peer help requests
- Tabs: Recommended, My Requests, Accepted By Me, All
- Sorting: Urgency, Deadline, Status, Best Match
- Full request lifecycle: Accept → Mark Solved → Leave Feedback

### ❓ Anonymous Doubts
- Post academic doubts anonymously
- Peer answers with upvotes, ratings, and follow-up replies
- Accept best answer, pin answers, close or reopen doubts
- Answer like/unlike, reply thread system

### 🔵 Learning Circles
- Create or apply to join study circles
- Join-request workflow with admin approval/rejection
- Discussion board with post/reply/like/delete
- Shared resource file uploads (PDF, images, documents)
- Member online presence indicator
- Member exit with reason, resource verification system

### 👤 Senior Connect
- Seniors register availability, topics, and bio
- Students send guidance requests with message
- Accept/Reject/Complete lifecycle
- Rate sessions with structured feedback

### 🤝 Find Teammates / Project Mate

**Core:**
- Create project posts with required roles and team size
- Role slots with custom labels, skills, and descriptions
- Students apply to specific role slots with portfolios and cover notes
- Project owner approves or rejects each application

**Workspace (after team is formed):**
- Private workspace visible only to team members
- Discussion board for async team communication
- Shared resource library (PDF, images, datasets, videos up to 20MB)
- Video resource preview/download within workspace
- Resource verification by project lead
- Project task assignment with priority and deadlines
- Member task submissions with file attachments
- Team lead verification or rejection with feedback
- Deadline extension requests and approval
- Project lifecycle: Active → Complete / Archive

**Profile Integration:**
- Verified tasks appear in member's contribution history
- Dynamic badges update based on verified work

### 👨‍💼 My Profile
- Profile completeness tracker
- Dynamic achievement badges (Peer Helper, Doubt Solver, Project Champion, etc.)
- Verified project work history
- Senior mentor stats (if applicable)
- Peer feedback received
- Social links: GitHub, LinkedIn, Portfolio
- Contact privacy settings (share only after accept)
- Edit mode for all profile fields

### 🛡️ Security and Privacy
- Row Level Security enforced on all tables
- Signed, time-limited URLs for all file downloads
- Raw storage paths never exposed in the UI
- Contact details revealed only to accepted connections
- Non-members fully blocked from workspace data
>>>>>>> backup/local-phase-6-6-before-showcase-merge

## Tech Stack

<<<<<<< HEAD
- **Frontend:** React, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Backend/Auth:** Supabase Auth, Supabase PostgreSQL, Supabase Storage
- **Security:** PostgreSQL Row Level Security, private buckets, signed URLs
- **Deployment:** Vercel for the live app, GitHub Pages for the showcase documentation
=======
## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v3 |
| Auth | Supabase Auth (email/password) |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage Buckets |
| Security | PostgreSQL Row Level Security (RLS) |
| Deployment | Vercel (Vite preset) |

---

## 🏗️ Architecture Overview

```
Frontend (React + TypeScript)
│
├── src/pages/          ← Full-page route components
│   ├── LandingPage.tsx
│   ├── AuthPage.tsx
│   ├── DashboardPage.tsx
│   ├── DoubtsPage.tsx
│   ├── LearningCirclesPage.tsx
│   ├── SeniorConnectPage.tsx
│   ├── ProjectMatePage.tsx
│   └── ProfilePage.tsx
│
├── src/components/     ← Feature-scoped reusable UI
│   ├── help/
│   ├── profile/
│   ├── project-tasks/
│   └── ui/
│
├── src/lib/            ← Supabase client + API functions
│   ├── supabase.ts
│   ├── profiles.ts
│   ├── doubts.ts
│   ├── learningCircles.ts
│   ├── seniorConnect.ts
│   ├── projectMates.ts
│   └── ...
│
├── src/types/          ← TypeScript interfaces and enums
│
└── src/layouts/        ← App shell: header, nav sidebar, footer

Backend (Supabase)
│
├── supabase/schema.sql            ← Base schema
├── supabase/phase*.sql            ← Incremental SQL patches
├── Storage Buckets:
│   ├── project-resources          ← Team shared files (PDF, images, video)
│   └── project-task-files         ← Task submission attachments
└── RLS Policies on all tables
```
>>>>>>> backup/local-phase-6-6-before-showcase-merge

## Folder Structure

<<<<<<< HEAD
```text
src/pages        Main app pages and feature screens
src/components   Reusable feature components
src/lib          Supabase API helpers and app service logic
src/types        Shared TypeScript types
supabase         SQL patches, setup guide, RLS/storage documentation
docs             Testing checklist and GitHub Pages showcase
public           Static app assets
=======
## 📂 Folder Structure

```
skillsaathi-campus-peer-learning/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── help/
│   │   ├── profile/
│   │   ├── project-tasks/
│   │   └── ui/
│   ├── hooks/
│   ├── layouts/
│   │   └── MainLayout.tsx
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── profiles.ts
│   │   ├── doubts.ts
│   │   ├── helpRequests.ts
│   │   ├── learningCircles.ts
│   │   ├── seniorConnect.ts
│   │   ├── projectMates.ts
│   │   └── ...
│   ├── pages/
│   │   ├── AuthPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── DoubtsPage.tsx
│   │   ├── LandingPage.tsx
│   │   ├── LearningCirclesPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── ProjectMatePage.tsx
│   │   └── SeniorConnectPage.tsx
│   ├── styles.css
│   └── types/
│       └── index.ts
├── supabase/
│   ├── README.md
│   ├── schema.sql
│   └── phase*.sql      ← All incremental SQL patches
├── docs/
│   └── testing-checklist.md
├── .env.example
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.app.json
├── vercel.json
└── vite.config.ts
>>>>>>> backup/local-phase-6-6-before-showcase-merge
```

## Environment Variables

<<<<<<< HEAD
Create `.env.local` from `.env.example`:
=======
## 🔐 Environment Variables

Create a `.env.local` file in the project root for local development:
>>>>>>> backup/local-phase-6-6-before-showcase-merge

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

<<<<<<< HEAD
Never commit real secrets. Never use the Supabase service role key in frontend code.
=======
> ⚠️ **Security Warning:**
> - Never commit `.env.local` or any real keys to version control.
> - **Never** expose the Supabase `service_role` key in the frontend — it must remain server-only.
> - Use `.env.example` to document required variable names without values.
>>>>>>> backup/local-phase-6-6-before-showcase-merge

## Local Setup

```bash
git clone https://github.com/maheshofficial0011/skillsaathi-campus-peer-learning.git
cd skillsaathi-campus-peer-learning
npm install
cp .env.example .env.local
npm run dev
```

<<<<<<< HEAD
Verification:
=======
**Prerequisites:** Node.js 18+, npm

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local with your Supabase credentials (see above)

# 3. Run development server
npm run dev

# 4. TypeScript type check (optional but recommended)
npx tsc -p tsconfig.app.json --noEmit

# 5. Production build (for deployment validation)
npm run build
```
>>>>>>> backup/local-phase-6-6-before-showcase-merge

```bash
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

## Supabase Setup

<<<<<<< HEAD
Read the full setup guide in [`supabase/README.md`](supabase/README.md). The final MVP uses SQL patches, RLS policies, helper functions, and storage buckets including:

- `project-resources`
- `project-task-files`

The `project-resources` bucket supports video uploads with:

- `video/mp4`
- `video/webm`
- `video/quicktime`
- 20MB file-size support

Do not disable RLS and do not expose service role keys.
=======
Full Supabase setup instructions are in [`supabase/README.md`](./supabase/README.md).

**Summary:**

1. Create a new Supabase project
2. Apply SQL patches in the exact order listed in `supabase/README.md`
3. Create the following storage buckets:
   - `project-resources` — for shared project resource files
   - `project-task-files` — for task submission attachments
4. Configure storage MIME types for video support:
   - `video/mp4`, `video/webm`, `video/quicktime` on the `project-resources` bucket
   - Max file size: 20MB for video, 10MB for other files
5. Set Auth redirect URLs (local and Vercel)

See [`supabase/README.md`](./supabase/README.md) for full SQL patch order, bucket policies, and RLS troubleshooting.
>>>>>>> backup/local-phase-6-6-before-showcase-merge

## Deployment

The production app is deployed on Vercel:

<<<<<<< HEAD
- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
=======
1. Connect your GitHub repository to [Vercel](https://vercel.com)
2. Select **Vite** as the Framework preset
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add environment variables in the Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Deploy**
7. After deploy, add your Vercel URL to Supabase Auth settings:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: `https://your-app.vercel.app/**`

**Live deployment:**
[https://skillsaathi-campus-peer-learning.vercel.app/](https://skillsaathi-campus-peer-learning.vercel.app/)

---

## 🧪 Testing

Full testing guide: [`docs/testing-checklist.md`](./docs/testing-checklist.md)

### Final MVP Acceptance Summary

| Test ID | Area | Status |
|---|---|---|
| 10A | Git / Build verification | ✅ |
| 10B | Auth and navigation | ✅ |
| 10C | Anonymous Doubts lifecycle | ✅ |
| 10D | Learning Circles lifecycle | ✅ |
| 10E | Senior Connect lifecycle | ✅ |
| 10F | Project Mate lifecycle (create → recruit → approve) | ✅ |
| 10G | Project Workspace (discussion, resources, video) | ✅ |
| 10H | Shared Resources (upload, preview, download, delete) | ✅ |
| 10I | Project Tasks (assign, submit, verify, deadline extension) | ✅ |
| 10J | My Profile (edit, badges, contribution history) | ✅ |
| 10K | UI / UX Polish (spacing, contrast, dark mode, mobile) | ✅ |

---

## 📸 Screenshots

> _Screenshots captured from live demo._

| Page | Description |
|---|---|
| **Home** | Feature overview and CTA buttons |
| **Dashboard** | Active help requests, sorting, and tabs |
| **Anonymous Doubts** | Post, answer, upvote, and accept doubts |
| **Learning Circles** | Join/create circles, discussion board, resources |
| **Senior Connect** | Request guidance, manage sessions |
| **Project Mate Workspace** | Team workspace, resources, discussion |
| **Project Tasks** | Task list, submissions, verification |
| **My Profile** | Badges, contribution history, social links |
>>>>>>> backup/local-phase-6-6-before-showcase-merge

Supabase Auth should include the Vercel live URL in Site URL and Redirect URLs.

<<<<<<< HEAD
## GitHub Pages Showcase
=======
## 🛡️ Security Notes

- **RLS Enabled:** All database tables are protected with PostgreSQL Row Level Security policies. Users can only access data they are permitted to view or modify.
- **Signed URLs:** All storage file access uses time-limited signed URLs. Raw storage paths are never exposed in the frontend.
- **Private Contact Gating:** Contact details (phone, WhatsApp, email) are only revealed to the other party after a help request or guidance session is explicitly accepted.
- **Workspace Isolation:** Non-members are completely blocked from accessing private project workspace data — discussion, resources, tasks, and members.
- **No Service Role Exposure:** The Supabase `service_role` key is never used or exposed in the frontend.
>>>>>>> backup/local-phase-6-6-before-showcase-merge

This repository includes a static showcase page in [`docs/index.html`](docs/index.html). To publish it:

<<<<<<< HEAD
1. Open repository **Settings**.
2. Go to **Pages**.
3. Select **Deploy from a branch**.
4. Choose branch **main** and folder **/docs**.
5. Save.
=======
## 🔭 Future Improvements

- **Realtime Notifications:** Supabase Realtime subscriptions for task updates and new messages
- **AI Recommendations:** Suggest relevant circles, projects, and mentors using profile data
- **Calendar Integration:** Schedule and track senior connect sessions and task deadlines
- **Analytics Dashboard:** Engagement metrics, contribution trends, top helpers
- **Mobile App:** React Native / Expo companion app
- **Public Contribution Portfolio:** Shareable public link for verified project work history
>>>>>>> backup/local-phase-6-6-before-showcase-merge

Expected URL:

<<<<<<< HEAD
```text
https://maheshofficial0011.github.io/skillsaathi-campus-peer-learning/
```

## Testing

The complete manual testing guide is available at [`docs/testing-checklist.md`](docs/testing-checklist.md). Final MVP coverage includes:

- Git/build health
- Auth and navigation
- Anonymous Doubts
- Learning Circles
- Senior Connect
- Project Mate lifecycle
- Project Workspace
- Resources and video preview
- Project Tasks
- My Profile
- UI, mobile, dark mode, and privacy checks

## Security Notes

- RLS is enabled for protected data.
- Private workspace data is only visible to active project members and owners.
- Past members and non-members are blocked from private project files.
- Raw storage paths are not shown in the UI.
- Signed URLs are used for private previews/downloads.
- Contact information is public-safe and visibility-gated.

## Screenshots

A screenshot gallery placeholder is included in the GitHub Pages showcase. Add final images to `docs/assets` when preparing the presentation.

## Future Improvements

- Realtime notifications
- AI teammate/resource recommendations
- Calendar integration
- Analytics dashboard
- Mobile app
- Advanced public contribution portfolio

## Credits

Built as a campus peer-learning and project collaboration MVP for review, demo, and further extension.
=======
## 👥 Credits

**Project:** SkillSaathi Campus Peer Learning  
**Developer:** Mahesh  
**Phase:** 6.6 — Final Polish & Demo-Ready  
**Status:** MVP Complete ✅

---

*Built with React, TypeScript, Vite, Supabase, and Tailwind CSS. Deployed on Vercel.*
>>>>>>> backup/local-phase-6-6-before-showcase-merge
