# SkillSaathi Campus Peer Learning

[![Phase 6.8 Final MVP Showcase](https://img.shields.io/badge/Phase-6.8%20Final%20MVP%20Showcase-4f46e5)](https://maheshofficial0011.github.io/skillsaathi-campus-peer-learning/)
[![Live on Vercel](https://img.shields.io/badge/Vercel-Live-111827)](https://skillsaathi-campus-peer-learning.vercel.app/)
[![Supabase Ready](https://img.shields.io/badge/Supabase-RLS%20Secured-059669)](./supabase/README.md)

**SkillSaathi** is a campus peer-learning and project-collaboration platform for students who want to ask for help, learn together, connect with seniors, build project teams, and prove their contributions.

- **Live app:** https://skillsaathi-campus-peer-learning.vercel.app/
- **GitHub Pages showcase:** https://maheshofficial0011.github.io/skillsaathi-campus-peer-learning/
- **Project overview:** [`docs/project-overview.md`](./docs/project-overview.md)
- **Manual testing checklist:** [`docs/testing-checklist.md`](./docs/testing-checklist.md)
- **Supabase guide:** [`supabase/README.md`](./supabase/README.md)

## Phase 6.8 Final MVP Showcase

The final MVP presentation pass keeps the existing architecture and Supabase contracts intact while making the app easier to review and demo. The landing page now communicates the full student journey, the app shell carries the Phase 6.8 showcase status, and the static GitHub Pages site provides a guided evaluator walkthrough.

## Problem

Students often struggle to:

- Find safe, timely help for academic doubts.
- Organize focused study circles around shared goals.
- Reach seniors with relevant experience.
- Form balanced project teams with clear role requirements.
- Coordinate resources, deadlines, and deliverables.
- Demonstrate credible project contributions during reviews.

## Solution

SkillSaathi brings those workflows together in one campus-ready platform:

| Module | What it enables |
|---|---|
| **Authentication** | Supabase email/password login, registration, and protected app access |
| **Dashboard** | A central command center for peer-help activity and recommended requests |
| **Anonymous Doubts** | Ask safely, answer peers, filter discussions, and view solutions |
| **Learning Circles** | Create and join study groups with members, resources, and discussion spaces |
| **Senior Connect** | Discover public-safe mentor profiles, reviews, and guidance-request workflows |
| **Project Mate** | Recruit teammates through role slots and manage applications |
| **Project Workspace** | Coordinate team settings, discussions, resources, and private collaboration data |
| **Project Tasks** | Assign work, submit deliverables, request extensions, and verify outcomes |
| **My Profile** | Present dynamic badges, reviews, active teams, and verified contribution history |

## Project Mate Deep Dive

Project Mate is the hero collaboration workflow:

1. A project owner creates a project post and defines capacity.
2. Required role slots make the team needs easy to understand.
3. Students apply to matching roles with relevant context.
4. The project owner reviews and accepts teammates.
5. Accepted members enter a private workspace.
6. The team shares coordination notes, resources, files, and videos.
7. The owner assigns tasks with priorities and deadlines.
8. Members submit deliverables or request deadline extensions.
9. The owner verifies work, requests changes, or rejects a submission with feedback.
10. Verified work appears in contribution history and profile portfolio sections.

## Demo Flow

Use this sequence for a clear MVP presentation:

1. Open the [live app](https://skillsaathi-campus-peer-learning.vercel.app/).
2. Login or create a campus account.
3. Explore the dashboard command center.
4. Try Anonymous Doubts, Learning Circles, and Senior Connect.
5. Open a Project Mate workspace.
6. Upload or preview a shared resource/video.
7. Assign, submit, and verify a project task.
8. View profile contribution history and dynamic badges.

## Security and Privacy

- Supabase Row Level Security protects data access.
- Private workspace data is limited to owners and active members.
- Signed, time-limited URLs protect private file preview and download actions.
- Raw storage paths are never intentionally displayed in the UI.
- Contact details stay private unless the student explicitly enables sharing.
- The frontend uses the Supabase anon key only. Never expose a service-role key.
- Database schema and RLS patches are versioned under [`supabase/`](./supabase/).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS |
| Authentication | Supabase Auth |
| Data | Supabase PostgreSQL |
| File storage | Supabase Storage with signed URLs |
| Security | PostgreSQL Row Level Security |
| App deployment | Vercel |
| Showcase deployment | GitHub Pages from `/docs` |

## Architecture

```text
src/pages          Feature pages and presentation screens
src/components     Reusable feature-scoped UI
src/layouts        Shared application shell
src/lib            Supabase API helpers and domain services
src/types          Shared TypeScript contracts
supabase           Schema, RLS, storage, and phased SQL patches
docs               Showcase, overview, and testing checklist
public             Static app assets
```

## Local Setup

```bash
git clone https://github.com/maheshofficial0011/skillsaathi-campus-peer-learning.git
cd skillsaathi-campus-peer-learning
npm install
cp .env.example .env.local
npm run dev
```

Populate `.env.local` with frontend-safe Supabase values:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Never commit real `.env` values and never place a Supabase service-role key in frontend code.

## Verification

```bash
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

For full manual verification, use [`docs/testing-checklist.md`](./docs/testing-checklist.md).

## Deployment

### Vercel

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### GitHub Pages showcase

Publish from branch `main` and folder `/docs` to serve:

```text
https://maheshofficial0011.github.io/skillsaathi-campus-peer-learning/
```

## Final MVP Status

SkillSaathi is **MVP complete**, **Vercel live**, **Supabase ready**, **GitHub Pages showcase ready**, and prepared for a final-year or hackathon product demo.
