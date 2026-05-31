# SkillSaathi — Campus Peer Learning Platform

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

## Problem Statement

Students often struggle to find peer help, form consistent study groups, connect with seniors, find project teammates, manage project work, and prove real contribution history during reviews. SkillSaathi solves these problems by combining peer learning, senior guidance, team formation, and verified project collaboration in one platform.

## Key Features

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

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Backend/Auth:** Supabase Auth, Supabase PostgreSQL, Supabase Storage
- **Security:** PostgreSQL Row Level Security, private buckets, signed URLs
- **Deployment:** Vercel for the live app, GitHub Pages for the showcase documentation

## Folder Structure

```text
src/pages        Main app pages and feature screens
src/components   Reusable feature components
src/lib          Supabase API helpers and app service logic
src/types        Shared TypeScript types
supabase         SQL patches, setup guide, RLS/storage documentation
docs             Testing checklist, project overview, and GitHub Pages showcase
public           Static app assets
```

## Environment Variables

Create `.env.local` from `.env.example`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Never commit real secrets. Never use the Supabase service role key in frontend code.

## Local Setup

```bash
git clone https://github.com/maheshofficial0011/skillsaathi-campus-peer-learning.git
cd skillsaathi-campus-peer-learning
npm install
cp .env.example .env.local
npm run dev
```

Verification:

```bash
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

## Supabase Setup

Read the full setup guide in [`supabase/README.md`](supabase/README.md). The final MVP uses SQL patches, RLS policies, helper functions, and storage buckets including:

- `project-resources`
- `project-task-files`

The `project-resources` bucket supports video uploads with:

- `video/mp4`
- `video/webm`
- `video/quicktime`
- 20MB file-size support

Do not disable RLS and do not expose service role keys.

## Deployment

The production app is deployed on Vercel:

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Supabase Auth should include the Vercel live URL in Site URL and Redirect URLs.

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

## GitHub Pages Showcase

This repository includes a static showcase page in [`docs/index.html`](docs/index.html). To publish it:

1. Open repository **Settings**.
2. Go to **Pages**.
3. Select **Deploy from a branch**.
4. Choose branch **main** and folder **/docs**.
5. Save.

Expected URL:

```text
https://maheshofficial0011.github.io/skillsaathi-campus-peer-learning/
```

## Security Notes

- RLS is enabled for protected data.
- Private workspace data is only visible to active project members and owners.
- Past members and non-members are blocked from private project files.
- Raw storage paths are not shown in the UI.
- Signed URLs are used for private previews/downloads.
- Contact information is public-safe and visibility-gated.

## Screenshots

Screenshots are available in the GitHub Pages showcase at [`docs/index.html`](docs/index.html) and in [`docs/assets/`](docs/assets/).

## Future Improvements

- Realtime notifications
- AI teammate/resource recommendations
- Calendar integration
- Analytics dashboard
- Mobile app
- Advanced public contribution portfolio

## Credits

Built as a campus peer-learning and project collaboration MVP for review, demo, and further extension.
