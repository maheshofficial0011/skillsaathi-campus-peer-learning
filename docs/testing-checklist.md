# SkillSaathi — Final MVP Manual Testing Checklist

**Live App:** https://skillsaathi-campus-peer-learning.vercel.app/

**Status:** MVP Complete

**Purpose:** Use this checklist before every production release, demo, or final review.

---

## 1. Quick Smoke Test

Run these quick checks immediately after any deployment to verify core app health:

- [ ] Load the Live App URL and confirm the landing page renders cleanly.
- [ ] Click the main "Get Started" CTA and verify the auth portal loads.
- [ ] Register a new account or log in with an existing user.
- [ ] Navigate to the main application dashboard and verify layout loads.
- [ ] Click between sections: Doubts, Learning Circles, Find Teammates, and Profile.
- [ ] Log out and verify redirection back to the login portal.
- [ ] Attempt to access a protected page (e.g., `/dashboard`) while logged out and verify redirect to auth portal.

---

## 2. Supabase Verification Checklist

Verify database schema, Row Level Security (RLS), and bucket storage policies:

- [ ] Apply all SQL migration patches in sequence (see the Supabase setup guide).
- [ ] Confirm RLS is enabled on all tables in the Supabase Dashboard.
- [ ] Verify that public anon key is used for the frontend and service role key is NEVER exposed.
- [ ] Verify the following three private storage buckets exist and are active:
  - `project-resources` (MIME bucket for projects)
  - `project-task-files` (MIME bucket for task submissions)
  - `learning-circle-resources` (MIME bucket for circle uploads)
- [ ] Verify MIME policies for `project-resources` accept: PDFs, images, text, csv, excel, and videos (`video/mp4`, `video/webm`, `video/quicktime`).
- [ ] Verify file size limits are set to 20MB for project resources and 10MB for learning circles.

---

## 3. Authentication & Route Protection

Verify college account registration, secure login sessions, and route guards:

- [ ] Register with valid credentials and confirm automatic redirect to dashboard.
- [ ] Attempt registration with an existing email and verify the error toast.
- [ ] Login with correct credentials and check that local session persistence works.
- [ ] Try logging in with incorrect password and verify that the inline error reads clearly.
- [ ] Toggle password visibility in login and signup panels and verify characters reveal correctly.
- [ ] Attempt to navigate directly to `/profile` or `/dashboard` inside an incognito window and verify the request is blocked and redirected.

---

## 4. Dashboard

Verify central learning feed, stats overview, and matching request boards:

- [ ] Confirm that active stats cards (solved doubts, active peer requests) display correct totals.
- [ ] Verify that the central matching panel filters requests by your student skills.
- [ ] Click on dashboard quick links and check that they redirect to the respective modules correctly.
- [ ] Verify that if student profile is incomplete (<100%), a noticeable alert reminder card appears below the welcome header.
- [ ] Click "Complete Now" in the reminder card and check that it routes cleanly to the edit profile section.

---

## 5. Profile

Verify profile completeness calculations, social links, and public-safe reputation history:

- [ ] Verify that the Profile Completeness bar starts at 0% and each filled parameter adds exactly 14.3% up to 100%.
- [ ] Ensure missing parameters show clear edit recommendations in an amber warning list.
- [ ] Edit headline, skills, goals, availability, and meeting modes; click Save and verify the success toast.
- [ ] Enter a relative link or insecure protocol for GitHub/LinkedIn URLs (e.g. `http://` or `javascript:`) and verify strict HTTPS block.
- [ ] Verify the separate display panels for "Peer Help Reputation" and "Doubt Solver Badge" behave independently.
- [ ] Confirm no private contact details (phone, email) or raw database UUIDs are leaked on public-facing profiles.

---

## 6. Anonymous Doubts

Verify peer questions, anonymous answers, rating scales, and comment thread drawers:

- [ ] Post a question and toggle "Post anonymously" on/off. Verify the avatar renders a masked peer mask or actual name.
- [ ] Verify that the doubts feed filters questions by "Open", "Solved", "Newest", or "My Doubts".
- [ ] Answer another student's doubt and verify that status changes from open to answered in real-time.
- [ ] Try answering your own doubt. Verify that the answer badge correctly marks it as "[Owner] Answered by Asker".
- [ ] Attempt to rate your own answer and verify that rating triggers are blocked.
- [ ] Rate a peer's answer out of 10 stars and confirm that average answer rating updates immediately.
- [ ] Click comment replies to slide open the threaded replies drawer inline.
- [ ] Submit a threaded reply anonymously or publicly and verify success.
- [ ] Mark a peer's answer as accepted. Verify that doubt status turns green to "Solved" and the solver's score updates.

---

## 7. Learning Circles

Verify study group cohorts, join request flows, secure file sharing, and lightweight presence heartbeats:

- [ ] Create a circle study group. Set max members cap, category, meeting modes, and member-only online links.
- [ ] Search circles by title, category, or department on the Discover Circles board.
- [ ] Request to join an active circle. Fill in role interest and standard application message (min 10 characters).
- [ ] As circle owner, review the incoming application. Confirm that full student profiles can be previewed without leaking private contact fields.
- [ ] Accept a join request. Check that the student is added as a member and is granted workspace access.
- [ ] Set circle status to Paused or Archived. Verify that accept controls are disabled and the banner alerts members.
- [ ] Open the workspace Overview. Click to copy member-only meeting coordinates and check success toasts.
- [ ] Alphabetically sort circle members in the Roster, keeping the Owner pinned at the top.
- [ ] Upload a study resource (link or file). Members see it in their queue as Pending.
- [ ] Approve the resource as Owner. Teammates should see the verified card in the library.
- [ ] Check resource ranking: Pinned first, Recommended second, likes count third, newest first.
- [ ] Click "Like" on a resource. Confirm that it toggles cleanly and restricts members to a single like.
- [ ] Remove a member from the roster. Verify that they lose workspace access immediately.
- [ ] Toggle Paused/Archived state. Confirm that resource submission forms are hidden in read-only states.
- [ ] Active heartbeat: verify that active members show a green online status dot in the roster.

---

## 8. Senior Connect

Verify senior mentor registrations, guidance request coordination, and anonymous mentor reviews:

- [ ] Filter available mentors by department and topics of expertise.
- [ ] Select a senior mentor and send a guidance request with topic and description details.
- [ ] Verify that sending a duplicate active request to the same senior is blocked.
- [ ] Log in as the senior mentor. Open the Mentor Dashboard and click Accept.
- [ ] Fill in meeting mode, Scheduled Time, and coordinate details in the acceptance form.
- [ ] Log back in as the student. Check My Requests and copy details from the Coordination Card.
- [ ] Mark the session Completed. Submit a 1-5 star review with feedback notes.
- [ ] Check the mentor's public profile and confirm that reviews are displayed strictly anonymously.
- [ ] Verify that Senior Guidance stats and ratings are isolated from Peer Help trust scores.

---

## 9. Find Teammates / Project Mate

Verify project recruitment posts, custom category allocations, and application rules:

- [ ] Create a project card. Define category, difficulty, max team size, and required open role slots.
- [ ] Under Category/Project Type, choose "Other" and enter custom values (e.g. "Bio-Informatics").
- [ ] Open Discover Projects. Verify the custom fields are loaded in filter selections.
- [ ] Check the dynamic Compatibility Match Score percentage calculation based on department, year, and skills overlap.
- [ ] As project owner, verify that you cannot apply to your own project card.
- [ ] Log in with a different account. Select an open position slot and apply.
- [ ] Withdraw a pending application and verify that you can apply again safely.

---

## 10. Project Workspace

Verify private teammate coordination portals, discussion accordions, and access controls:

- [ ] Open an active team workspace. Verify that only owners and active team members have access.
- [ ] Roster-Gated Privacy check: Kick a member. Check that they lose workspace tab access immediately.
- [ ] In the workspace, confirm that secure credentials (coordination link, documents, notes) are displayed.
- [ ] Create a thread in the Project Discussion board. Tag or filter by categories.
- [ ] Click Comments inline to expand the replies accordion directly inside the card boundaries.
- [ ] Expand Past Members in the Team Roster (Owner only). Verify that kicked members show exit dates and reasons.

---

## 11. Project Resources & Video Upload

Verify links, documents, video previews, and signed storage URL retrievals:

- [ ] Add a verified link. Verify that only `https://` URLs are accepted.
- [ ] Upload a PDF document. Verify size limits (20MB) are enforced and title fills automatically.
- [ ] Open PDF/Image in the Preview Lightbox and verify native browser rendering.
- [ ] Upload a video deliverable (`.mp4`, `.webm`, or `.mov`).
- [ ] Attempt uploading an executable script or unsupported file format and verify block.
- [ ] Click "Play Video" on the video card. Confirm that the secure HTML5 video player displays and streams securely via private signed URL without exposing the storage path.
- [ ] Click "Download File" and check that the signed URL download triggers correctly.

---

## 12. Project Tasks

Verify task assignments, deadline extensions, deliverable submissions, and lead verifications:

- [ ] Create a task assignment. Use quick preset templates (e.g., Frontend UI, Backend API).
- [ ] Assign the task to an active member with objectives, attachments, priorities, and role tags.
- [ ] Log in as the assignee. Access the "My Work" Dashboard.
- [ ] Verify that tasks are grouped correctly by status (Assigned, In Progress, Pending Review, Verified).
- [ ] Confirm that a task past its due date displays in a noticeable "Overdue Tasks" banner.
- [ ] Open the task drawer. Click "Mark In Progress" and confirm state transition.
- [ ] Submit finished work. Add link or notes (min 10 characters) and select deliverable files.
- [ ] Try submitting an empty form or files > 20MB and verify validation blocks.
- [ ] Request a deadline extension. Add justification notes.
- [ ] Log in as owner. Approve the extension request. Verify that the task due date is adjusted.
- [ ] Open the submission review drawer. Click Verify & Approve.
- [ ] Check that a green "Task Verified & Completed" lock banner is rendered.
- [ ] Verify that the completed task is updated in the assignee's profile contribution history and active badges progress.

---

## 13. Public Trust Pages

Verify navigation layout, footer coordinates, and static information portals:

- [ ] Confirm that the public landing page navigation sidebar and footer links load cleanly.
- [ ] Click About, FAQ, Contact, Privacy, and Terms links in the footer.
- [ ] Verify that all trust information cards and campus guideline directories render nicely.

---

## 14. GitHub Pages Showcase

Verify static presentation page alignments and screenshot gallery cards:

- [ ] Load the showcase index URL and confirm dark theme background renders.
- [ ] Click main header buttons: Modules, Project Mate, Screenshots, and Run Locally. Verify smooth scroll.
- [ ] Inspect the Screenshots gallery. Verify that images use `object-fit: contain` inside a dark `#09111e` padding frame.
- [ ] Confirm that screenshots do not crop important UI text and scale correctly.
- [ ] Check that core links (Open Live App, README, Testing Checklist, Supabase Guide) are clickable.

---

## 15. Vercel Deployment

Verify production builds, TypeScript environments, and URL redirects:

- [ ] Run `npx tsc -p tsconfig.app.json --noEmit` and check that it exits with zero compilation errors.
- [ ] Run `npm run build` and verify that the `dist/` production assets bundle builds cleanly.
- [ ] Confirm Vercel env variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are securely loaded.
- [ ] Verify that redirect parameters in Supabase Auth match the production domain.

---

## 16. Mobile & Responsive Testing

Verify screen widths, filter stacking, and fluid touch interactions:

- [ ] Open Developer Tools and select a mobile viewport size (e.g. 375px wide).
- [ ] Verify that the Main Layout sidebar changes to a clean horizontal scrolling list at the top or bottom.
- [ ] Verify that filter columns stack vertically with touch-friendly paddings.
- [ ] Open details modals and verify that margins fit completely within screen bounds with no horizontal page overflow.

---

## 17. Final MVP Acceptance Checklist

Verify overall release readiness and platform compliance before final review:

- [ ] [Passed] Local repository is clean and all commits are consolidated.
- [ ] [Passed] TypeScript compiles and Vite production build passes.
- [ ] [Passed] Supabase database migrations, schemas, RLS, and storage rules are synced.
- [ ] [Passed] Auth portal gateways and protected routing shields behave securely.
- [ ] [Passed] Anonymous doubts feeds, reply pins, and self-answers function cleanly.
- [ ] [Passed] Learning circle study cohorts, join controls, and resource verification queues work.
- [ ] [Passed] Senior Connect mentors list, guidance bookings, and anonymous reviews operate securely.
- [ ] [Passed] Find teammates project slots, compatibility matches, and workspaces function.
- [ ] [Passed] Workspace teammate discussion threads and resource document libraries behave cleanly.
- [ ] [Passed] Video resource uploads and HTML5 signed URL previews execute successfully.
- [ ] [Passed] Project task assignments, extension protocols, and deliverable reviews behave safely.
- [ ] [Passed] Student profile badges and contribution histories reflect real progress.
- [ ] [Passed] Responsive viewports exhibit zero horizontal layouts break.

---

## 18. Known Limitations

Documented gaps and future enhancements for post-MVP release:

- [ ] Real-Time Alerts: Heartbeats check database presence every 60s; direct instant notifications are scheduled for post-MVP.
- [ ] Multi-File Uploads: Shared resources are limited to single-file submissions; zip folders can be utilized as a manual workaround.
- [ ] Video Formats: Interactive video previews are constrained to `.mp4`, `.webm`, and `.mov` under 20MB. Other formats download as raw documents.
- [ ] Calendar Scheduling: Mentor bookings and task timelines utilize manual text inputs; direct Google Calendar integration is planned for future phases.

---

## 19. Reviewer Acceptance Checklist

Verify these core presentation parameters prior to final evaluation:

- [ ] Live app loads successfully
- [ ] README is clear and readable
- [ ] GitHub Pages showcase loads cleanly
- [ ] Screenshot gallery displays correctly
- [ ] Authentication works as expected
- [ ] Core modules open without errors
- [ ] Learning Circle discussion sorting works (announcements pinned to top)
- [ ] Long lists use internal scroll where needed
- [ ] Supabase guide is readable and correct
- [ ] No obvious horizontal layout overflow
