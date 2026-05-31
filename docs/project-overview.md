# SkillSaathi Campus Peer Learning — Phase 6.8 Final MVP Showcase

**Live app:** https://skillsaathi-campus-peer-learning.vercel.app/  
**GitHub Pages showcase:** https://maheshofficial0011.github.io/skillsaathi-campus-peer-learning/

SkillSaathi Campus Peer Learning is a campus-focused peer learning and project collaboration platform. It helps students ask anonymous doubts, join learning circles, connect with seniors, find teammates, collaborate inside project workspaces, share resources, assign tasks, submit work, and build verified contribution history.

## Problem Statement

Students often struggle to:

- Find quick peer help for academic doubts.
- Organize focused study groups.
- Connect with seniors for guidance.
- Find reliable project teammates.
- Manage project roles, deadlines, and deliverables.
- Prove meaningful project contributions during review.

## Solution

SkillSaathi brings the major campus collaboration workflows into one platform:

- **Anonymous Doubts** for safe peer help.
- **Learning Circles** for study communities.
- **Senior Connect** for mentor guidance.
- **Project Mate Finder** for teammate discovery.
- **Secure Workspaces** for active teams.
- **Shared Resources** for PDFs, links, images, documents, and videos.
- **Project Tasks** for assignment, submission, review, and verification.
- **My Profile** for dynamic badges and verified contribution history.

## Core Modules

### Authentication

Supabase Auth powers secure email/password authentication and protected app access.

### Dashboard

The dashboard gives students a quick overview of peer help requests, learning activity, and navigation to major workflows.

### Anonymous Doubts

Students can ask doubts anonymously, accept help, answer requests, filter doubts, and view solutions.

### Learning Circles

Students can create or join study circles, manage members, discuss topics, and share verified learning resources.

### Senior Connect

Students can discover senior mentors, view public-safe profiles, request guidance, and see mentor reviews.

### Find Teammates / Project Mate

Project Mate helps students create project posts, define required roles, manage applications, accept teammates, and work inside secure project workspaces.

### Project Workspace

Active teams get a gated workspace with coordination details, discussions, shared resources, teammate rosters, role slots, and project tasks.

### Shared Resources

Teams can share links, PDFs, images, documents, code repositories, folders, and videos. Private files use signed URLs and storage access controls.

### Project Tasks

Team leads can assign tasks with deadlines and attachments. Members can submit work, request deadline extensions, and receive verification or revision feedback.

### My Profile

Profiles include public-safe student details, dynamic achievement badges, mentor reviews, project work history, and verified contributions.

## Project Mate Deep Dive

Project Mate is the most complete collaboration workflow in the MVP:

1. A project owner creates a project post.
2. The owner defines required role slots and capacity.
3. Students apply to open roles.
4. The owner accepts or rejects applicants.
5. Accepted members enter a secure workspace.
6. The team uses private coordination links and notes.
7. Members discuss work and share verified resources.
8. The owner assigns tasks with deadlines and attachments.
9. Members submit links, documents, PDFs, or videos.
10. The owner verifies work or requests changes.
11. Members can request deadline extensions.
12. Verified tasks appear in project work history and profile contribution sections.

## Demo Flow

Use this evaluator-friendly walkthrough for the final MVP showcase:

1. Open the live app.
2. Login or create a campus account.
3. Explore the dashboard command center.
4. Try Anonymous Doubts, Learning Circles, and Senior Connect.
5. Open a Project Mate workspace.
6. Upload or preview a shared resource/video.
7. Assign, submit, and verify a project task.
8. View profile contribution history and dynamic badges.

## Security and Privacy

- Supabase Row Level Security protects database access.
- Private workspace data is only visible to owners and active members.
- Past members and non-members lose access to private coordination and files.
- Storage paths are not displayed in the UI.
- Signed URLs are used for private file preview/download.
- Private contact fields are hidden unless explicitly allowed.
- The frontend uses only the Supabase anon key, never the service role key.

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- PostgreSQL Row Level Security
- Vercel
- GitHub Pages

## Architecture

Important folders:

```text
src/pages        Main app pages and feature screens
src/components   Reusable feature components
src/lib          Supabase API helpers and app service logic
src/types        Shared TypeScript types
supabase         SQL patches, setup guide, RLS/storage documentation
docs             Testing checklist and GitHub Pages showcase
public           Static app assets
```

## Local Setup

```bash
git clone https://github.com/maheshofficial0011/skillsaathi-campus-peer-learning.git
cd skillsaathi-campus-peer-learning
npm install
cp .env.example .env.local
npm run dev
```

Required environment variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Never place a Supabase service role key in frontend code.

## Verification

```bash
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

For full manual testing, see [`testing-checklist.md`](./testing-checklist.md).

## Deployment

The live app is deployed on Vercel:

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Supabase Auth should include the Vercel live URL in Site URL and Redirect URLs.

## GitHub Pages Showcase

This documentation/showcase site can be published from the `/docs` folder:

1. Open the GitHub repository.
2. Go to **Settings → Pages**.
3. Choose **Deploy from a branch**.
4. Select branch **main** and folder **/docs**.
5. Save.

Expected showcase URL:

```text
https://maheshofficial0011.github.io/skillsaathi-campus-peer-learning/
```

## Future Improvements

- Realtime notifications.
- AI teammate/resource recommendations.
- Calendar integration.
- Analytics dashboard.
- Mobile app.
- Advanced public contribution portfolio.

## MVP Status

SkillSaathi is now **Phase 6.8 Final MVP Showcase ready: MVP Complete, Vercel-deployed, Supabase-ready, GitHub Pages-ready, and demo-ready**.
