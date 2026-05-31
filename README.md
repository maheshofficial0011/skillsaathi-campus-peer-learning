# SkillSaathi Campus Peer Learning

A campus peer learning platform where students can ask anonymous doubts, join learning circles, connect with seniors, find project teammates, collaborate in workspaces, share resources, assign tasks, submit work, and track verified project contributions.

## 🚀 MVP Status
- **MVP Complete**
- **Phase 6.5 Documentation & Deployment**
- **Demo Ready**
- **GitHub Ready**
- **Supabase Ready**
- **Vercel Ready**

---

## 📚 Core Modules

### Authentication & Navigation
Secure authentication using Supabase Auth, protected routing, and email/password login.

### Dashboard
A central hub for tracking your peer learning journey, displaying active doubts, pending tasks, and recent peer activity.

### Anonymous Doubts
Post questions anonymously and receive answers from peers. Support for accepting the best answer, upvoting, and follow-up threads.

### Learning Circles
Join or create study groups based on interests or subjects. Includes discussion boards, secure resource sharing, and member management.

### Senior Connect
Request 1-on-1 guidance from verified senior mentors. Mentors can manage their availability and review requests.

### Find Teammates / Project Mate
Post project ideas, specify required roles, and recruit teammates. Students can apply for specific roles and track application status.

### Project Workspace & Discussion
A dedicated workspace for active project teams. Includes a discussion board for team communication and coordination.

### Shared Resources
A secure library for team members to upload, share, and preview project-related files, documents, and videos.

### Project Tasks
Lead-assigned tasks with deadlines. Members can submit deliverables, request deadline extensions, and have their work verified.

### My Profile and Contribution History
A public-safe profile showcasing a student's skills, verified project contributions, received mentor feedback, and dynamic badges.

---

## ✨ Main Features
- Anonymous doubt posting
- Peer help requests
- Learning circles
- Join request lifecycle
- Senior guidance
- Public-safe profiles
- Project mate finder
- Team role slots
- Secure workspace
- Team discussion
- Resource upload and verification
- PDF/image/video preview
- Project task assignment
- Member submissions
- Deadline extensions
- Lead verification
- Verified contribution history
- Dynamic profile badges
- Internal scrolling for long lists

---

## 🛠️ Tech Stack
- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend & Auth**: Supabase Auth, Supabase Database, Supabase Storage
- **Security**: PostgreSQL Row Level Security (RLS)
- **Deployment**: Vercel

---

## 📂 Folder Structure
- `src/pages`: Top-level route components for the application.
- `src/components`: Reusable UI components organized by feature module.
- `src/lib`: Utility functions and Supabase client configuration.
- `src/types`: TypeScript interfaces and type definitions.
- `supabase`: Contains all SQL migration patches and the `schema.sql` for setting up the backend.
- `docs`: Documentation files, including the manual testing checklist.

---

## 🔐 Environment Variables

Create a `.env.local` file in the root directory for local development:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> **Important**:
> - Never commit real `.env` or `.env.local` files to version control.
> - **Never** expose the Supabase `service_role` key in the frontend.

---

## 💻 Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Type-check the project:
   ```bash
   npx tsc -p tsconfig.app.json --noEmit
   ```
4. Build for production:
   ```bash
   npm run build
   ```

---

## 🐘 Supabase Setup

Detailed setup instructions are in `supabase/README.md`. 
- **SQL Patches**: Must be applied in the exact order listed in the Supabase README to ensure all tables, RLS policies, and triggers are configured correctly.
- **Storage Buckets**: 
  - `project-resources`
  - `project-task-files`
- **Video Support**: The `project-resources` bucket must be configured to support up to **20MB** file sizes and the following MIME types: `video/mp4`, `video/webm`, `video/quicktime`.

---

## 🧪 Testing

The comprehensive testing checklist is available in `docs/testing-checklist.md`.

### Final MVP Test Summary:
- [ ] Test 10A Git/Build
- [ ] Test 10B Auth/Nav
- [ ] Test 10C Anonymous Doubts
- [ ] Test 10D Learning Circles
- [ ] Test 10E Senior Connect
- [ ] Test 10F Project Mate Lifecycle
- [ ] Test 10G Workspace
- [ ] Test 10H Resources/Video
- [ ] Test 10I Project Tasks
- [ ] Test 10J My Profile
- [ ] Test 10K UI Polish

---

## ☁️ Deployment (Vercel)

1. Connect your GitHub repository to Vercel.
2. Select the **Vite** Framework preset.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add the following Environment Variables in the Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Deploy**.
7. **Important**: Add your new deployed Vercel URL to the Supabase Auth Redirect and Site URL settings.

---

## 🛡️ Security Notes
- **RLS Enabled**: All database access is strictly gated by Row Level Security policies.
- **Private Data Protected**: User emails, phone numbers, and exact UUIDs are never exposed publicly unless explicitly shared in an accepted request.
- **Raw Storage Paths Hidden**: Storage objects use secure, time-limited signed URLs for access.
- **Private Contacts Gated**: Contact details are only revealed after a session/connection is accepted.
- **Workspace Isolation**: Non-members are completely blocked from viewing private project workspace data.

---

## 🚧 Known Limitations & Future Improvements
- Realtime notifications (Supabase Realtime subscriptions)
- Advanced search and filtering
- Mobile app (React Native/Expo)
- AI recommendations for learning circles and projects
- Analytics dashboard for engagement metrics
- Calendar integration for senior connect sessions
- Advanced public contribution portfolio export

---

## 📄 License & Authors
Created by Mahesh.
