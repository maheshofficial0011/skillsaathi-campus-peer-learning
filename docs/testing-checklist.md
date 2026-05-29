# SkillSaathi Phase 3.5 - Manual Testing Checklist

Use this checklist to perform regression testing and ensure full readiness of all SkillSaathi modules before proceeding to Phase 4 (Senior Connect).

---

## 🔐 1. Authentication & Route Protection
- [ ] **Registration Flow**:
  - Visit the auth portal, toggle to "Create Campus Account".
  - Fill in all fields (Full Name, Email, Password, Department, Year, Section).
  - Submit. Verify that a success toast is fired.
  - Verify that if email confirmation is enabled, a notice tells the user to verify, otherwise they are automatically logged in.
- [ ] **Sign In Flow**:
  - Visit the portal, enter college email and password.
  - Submit. Verify a success toast is fired, and you are redirected to the Dashboard.
  - Try logging in with wrong credentials. Verify that an inline error message and error toast are shown.
- [ ] **Route Guards**:
  - Copy the URL of a protected page (e.g., `/dashboard` or `/profile`).
  - Log out, then try to visit that URL. Verify that you are redirected to the Auth Gateway.

---

## 👤 2. Profile Page & Completeness Card
- [ ] **Profile Completeness Calculations**:
  - Go to **My Profile**.
  - Count missing fields in the view panel.
  - Verify that each filled parameter adds exactly `14.3%` to the completeness progress bar.
  - If any of the 7 parameters (Full Name, Department, Year, Skills Known, Skills Wanted, Availability, Meeting Mode) is missing, verify that an amber warning card list shows it with edit recommendations.
- [ ] **Compact Dashboard Reminder**:
  - Go to the **Dashboard** page.
  - If your profile is `<100%` complete, verify that an amber alert box is shown below the welcome header.
  - Click **Complete Now**. Verify that it redirects you back to the profile page.
  - Now, edit your profile and fill in ALL 7 fields.
  - Save changes. Verify a success toast pops up.
  - Check the Dashboard again. Verify that the completeness reminder card is now hidden.
- [ ] **Reputation Sections**:
  - Verify that the profile page is split into two clear sections: **Peer Help Reputation** and **Doubt Contribution**.
  - Check that badge level, solved requests count, and feedback averages load correctly.

---

## 🤝 3. Peer Help Requests Board
- [ ] **Creation Modal**:
  - Click **+ Create Help Request** on the Dashboard.
  - Fill in Title, Description, Category, Urgency, Skills, and optional Deadline.
  - Submit. Verify that a success toast fires and the request appears on the board.
- [ ] **Acceptance Workflow**:
  - Log in with a different test account.
  - Go to the **All Requests** or **Recommended** tab and click **Accept Help** on a peer's request.
  - Verify that a success toast fires and the request status changes to "accepted".
- [ ] **Solve/Close Workflow**:
  - The asker should see the request in **My Requests**.
  - Mark the request as **Solved**. Verify that the Feedback Modal pops up.
  - Rate the helper and write a comment. Save. Verify that a success toast fires and peer trust score updates.
  - Delete a request. Verify it prompts with a confirmation, and then deletes safely with a success toast.

---

## 💬 4. Anonymous Doubts Module
- [ ] **Doubt Creation**:
  - Open **Anonymous Doubts** board.
  - Click **+ Ask a Doubt**.
  - Enter Title, Description, Category, Tags. Select/deselect "Post anonymously".
  - Submit. Verify a success toast fires.
- [ ] **Answering & Rating**:
  - View a doubt. Enter an answer in the input box.
  - Submit. Verify that a success toast fires, and status changes from "open" to "answered" instantly.
  - Rate a peer's answer out of 10. Verify a success toast fires and stats update.
  - Try rating your own answer. Verify it blocks safely and shows a "cannot rate own answer" error toast.
- [ ] **Replies & Cross-Questions**:
  - Expand replies on an answer.
  - Type a cross-question/follow-up, select "Reply anonymously" if desired, and submit.
  - Verify that a success toast fires.
- [ ] **Reopening & Safety Deletes**:
  - The doubt creator marks an answer as accepted. Verify status changes to "solved".
  - Mark a second accepted answer. Verify that solves are not blocked from adding more accepted answers.
  - Reopen the doubt. Verify that if answers exist, it sets status to `answered`, otherwise `open`. Success toast should fire.
  - Try deleting a doubt. Verify that it blocks if answers count > 0. Verify that it deletes successfully only if answer count is 0, firing a success toast.

---

## 📱 5. Mobile Responsiveness Polish
- [ ] **Main Layout Sidebar**:
  - Open Developer Tools in your browser, switch to a mobile device view (e.g. iPhone SE / 375px width).
  - Verify that navigation sidebar items form a horizontal scrolling list at the top or bottom of the screen.
  - Check that button text does not wrap awkwardly, buttons center perfectly, and touch-dragging is smooth.
- [ ] **Responsive Filters**:
  - Verify that filter cards stack in a single column on mobile, rather than squeezing horizontally.
  - Check that the search bar and category dropdown inputs are full-width and touch-friendly.
- [ ] **Modals**:
  - Open the **Doubt Details Modal** or **Public Profile Modal** on mobile.
  - Verify that the card fits cleanly within the screen boundaries with a 16px border padding (`p-4`), and that you can scroll within the modal if the text is long.

---

## ✍️ 6. Doubt Answer & Reply Edit / Delete

> **Requires Supabase patch**: Run `supabase/phase3-answer-reply-edit-delete-patch.sql` in the SQL Editor before testing.

- [ ] **Edit own answer**: Post an answer. Click **Edit** → modify text → **Save Answer**. Verify success toast and `(edited)` label appears.
- [ ] **Cancel edit**: Click **Cancel**. Verify original text restored with no API call.
- [ ] **Delete own unaccepted answer**: Delete an unaccepted/unpinned answer. Confirm dialog. Verify it disappears, counters update, toast fires.
- [ ] **Delete blocked for accepted answer**: Verify no **Delete** button; hint `"Accepted — cannot delete"` shown.
- [ ] **Delete blocked for pinned answer**: Verify no **Delete** button; hint `"Pinned — cannot delete"` shown.
- [ ] **Edit own reply**: Click **Edit** on own reply → modify → **Save**. Verify toast and `(edited)` label.
- [ ] **Delete own reply (not pinned)**: Confirm dialog. Verify reply removed, count decremented, toast fires.
- [ ] **Delete blocked for pinned reply**: Reply author sees `"Pinned — cannot delete"` instead of Delete button.
- [ ] **Other users cannot edit/delete**: Log in as a different user — no Edit/Delete buttons on others' answers or replies.

---

## 📌 7. Reply Pinning

> **Requires Supabase patch**: Run `supabase/phase3-answer-reply-edit-delete-patch.sql`.

- [ ] **Doubt creator can pin a reply**: Click **📌 Pin** on a reply → success toast → `📌 Pinned` amber badge appears.
- [ ] **Pinned reply floats to top**: Pinned reply appears before all un-pinned replies in the thread.
- [ ] **Multiple pinned replies allowed**: Pin two replies. Both appear at the top with amber badges.
- [ ] **Doubt creator can unpin**: Click **📌 Unpin** → badge disappears, reply sorts normally.
- [ ] **Non-creator cannot pin**: Log in as non-creator — no Pin button in reply action rows.
- [ ] **Closed doubt — no pinning**: Close the doubt. Pin button disappears even for creator.
- [ ] **Sort respects pinned first**: Toggle 🔥 Top / 🕒 Newest. Pinned replies always stay at the top.
- [ ] **Reply author can edit pinned reply**: **Edit** button still visible; text saves; `(edited)` label appears.

---

## 🛡️ 8. Self-Answer Safety

> **Product rule**: Self-answering is allowed. Students can share their own solutions. But it is labelled and does not inflate stats.

- [ ] **Doubt creator can post own answer**: While status is `open` or `answered`, creator submits an answer. Success toast fires.
- [ ] **Own answer shows badge**: Creator's answer shows grey `🙋 Answered by asker` badge. Other users' answers do NOT show this badge.
- [ ] **Doubt creator cannot rate own answer**: No **⭐ Rate** button on the creator's own answer. Rating form is inaccessible.
- [ ] **Doubt creator CAN rate other users' answers**: ⭐ Rate button appears on others' answers when status is `answered`/`solved`.
- [ ] **Doubt creator can accept own answer**: ✅ Accept visible on own answer. After accepting: `✅ Accepted Answer` badge appears, status → `solved`.
- [ ] **Own accepted answer does NOT inflate stat**: Go to **My Profile → Doubt Contribution**. Accepting own answer should NOT increment `Accepted Answers` count.
- [ ] **External accepted answer DOES increment stat**: The answerer's profile `Accepted Answers` count increases after creator accepts their answer.
- [ ] **Like button hidden for own content**: 👍 Like button not shown on own answers or replies. Count is still displayed as read-only text if others liked it.

---

## 🎓 9. Phase 4 - Senior Connect Module & Polishes

> **Requires Supabase patches**: Run `supabase/phase4-senior-connect-patch.sql` and `supabase/phase4-senior-connect-contact-patch.sql` in the SQL Editor.

- [ ] **Custom Manual "Other" Department selection**:
  - Visit the auth portal, toggle to "Create Campus Account".
  - Type exactly `Other` in the **Department** input box.
  - Verify that a secondary input **Enter your department** pops up.
  - Fill it with a custom department, e.g. `Mechatronics`. Submit. Verify the profile is saved with `Mechatronics` as the department.
  - Go to **My Profile**, click **Edit Profile**. Type exactly `Other` in the department list. Verify the secondary field appears. Leave it empty and click Save. Verify that a validation error/toast appears.
  - Fill it with `Cyber Security` and save. Verify success toast and view profile department reflects `Cyber Security`.

- [ ] **Find Seniors Dynamic Filters**:
  - Open the **Senior Connect** tab.
  - Select the **Find Seniors** tab.
  - Verify that the **Select Department** filter dropdown lists `All`, all active mentor departments present in the fetched list (including any custom-typed ones like `Cyber Security`), and all standard departments alphabetically.
  - Filter by department or topic. Verify cards filter instantly.

- [ ] **Guidance Request Coordination Workflow**:
  - Log in with Student Account A. Go to **Senior Connect** → **Find Seniors**.
  - Locate Senior Mentor B. Click **Request Guidance**. Prevents requesting self (Senior Mentor B sees request modal blocked for their own profile).
  - Submit request with topic, message, preferred mode, and time. Outgoing request appears in **My Requests** as `⏳ pending`.
  - Log in as Senior Mentor B. Go to **Senior Connect** → **Mentor Dashboard**.
  - In **Incoming Guidance Requests**, locate Student A's request. Click **Accept**.
  - Verify the accept modal prompts for:
    * Message (optional)
    * Meeting Mode (Online / In-Person / Hybrid)
    * Scheduled Time (required text)
    * Meeting/Contact Details (required text)
  - Fill these details and submit. Request moves to accepted.
  - Log back in as Student A. Check **My Requests**.
  - Verify the request shows `✅ accepted` status and a dedicated **Session Coordination Details** panel appears:
    * Displays selected Mode, Scheduled Time, and a clean copy-paste contact details card showing the Meet link or campus location shared by the senior.
  - Senior marks the session as `completed`. Verify status changes to `🎓 completed` and statistics update.

- [ ] **Senior Mentor Impact stats**:
  - Log in as Senior Mentor B. View the **Mentor Dashboard**.
  - Verify that the stats grid lists 6 distinct counters: **Received, Pending, Accepted, Completed, Declined, Completion Rate (%)**.
  - Open the **My Profile** page. Verify a dedicated **🎓 Senior Mentor Impact** section is rendered with Completed, Accepted, Pending, Declined, and Completion Rate counters, bio, topics of expertise, availability hours, and preference mode.
  - Click on Senior Mentor B's name from a Doubt post to open their `PublicProfileModal`.
  - Verify a premium **Senior Mentor** card is rendered containing their bio, expertise badges, availability details, and the 3-column stats panel (**Completed, Accepted, Completion Rate %**).
  - Double check that this section does NOT mix with Peer Help trust scores or Doubt rating stats.

- [ ] **Help Request coordination note**:
  - Open the **Peer Help Request** details modal for an accepted help request.
  - If you are either the request creator or the helper, verify that a clean **Next Step: Coordinate Session** guidance tip box is shown right below the people details block, instructing you on how to share links or locations based on the chosen mode.

---

## 🎓 10. Phase 4.5 - Senior Connect Reputation & Safety Polish

> **Requires Supabase patches**: Run `supabase/phase4-contact-privacy-patch.sql` and `supabase/phase4-senior-reviews-safety-patch.sql` in the SQL Editor.

- [ ] **Mentor Status Availability Settings**:
  - Log in as a Senior Mentor. Go to the **Mentor Dashboard**, click **Edit**.
  - Locate the **Mentor Status** select dropdown (Accepting / Busy / Unavailable).
  - Select `Unavailable` and click **Save**.
  - Log in as a different student. Browse the mentor in **Find Seniors**.
  - Verify that the card displays a clear `Unavailable` badge, a warning message `"⚠️ This mentor is not accepting requests right now"`, and the **Request Guidance** button is completely disabled.
  - Log back in as the mentor, change status to `Busy`, and save.
  - Log in as the student, verify the card displays a `Busy` badge, shows a warning `"⚠️ Mentor is busy; response may be delayed"`, but the **Request Guidance** button is ENABLED and allows requests.
  - Set status to `Accepting`. Verify normal behavior.

- [ ] **Guidance Feedback (Ratings & Reviews)**:
  - Log in as Student A. Once a guidance session with Senior B is marked as `completed`, locate the request in **My Requests**.
  - Verify a **⭐ Give Mentor Feedback** button is visible.
  - Click it. The **Rate Guidance Session** modal should open, showing:
    * 1–5 star selectors (rating > 0 validation constraint).
    * Helpfulness Yes / No toggle buttons.
    * Comments textbox.
  - Select 5 stars, click "Yes, helpful", write a comment, and submit. Verify success toast.
  - The button should now change to **✏️ Edit Review** and show a `✓ Reviewed` badge.
  - Click **✏️ Edit Review**, change rating or comment, and save. Verify success toast.
  - Try logging in as the senior (Senior B). Try to review your own session. Verify RLS and UI prevent seniors from reviewing their own sessions.

- [ ] **Public Profile Reviews Grid**:
  - Open Senior B's **Public Profile Modal** from a post or card.
  - Verify that the profile displays the cumulative **Average Mentor Rating** (e.g. `⭐ 5.0`) and the **Guidance Reviews** count.
  - Verify that a list of **Recent Guidance Reviews** is rendered.
  - Verify that each review item is strictly anonymous, showing `"Anonymous Junior"` instead of student name/email/UUID.
  - Verify that the recent reviews list is capped at a maximum of the 3 most recent records.
  - Verify that these mentor guidance stats remain completely segregated from Peer Help trust scores and Doubt ratings.

- [ ] **Duplicate Active Request Prevention**:
  - Log in as Student A. Send a guidance request to Senior B.
  - While that request is still `pending` or `accepted`, try to send another guidance request to Senior B.
  - Verify that both the API check and the database index constraint block the duplicate request, showing a clear warning toast `"You already have an active guidance request with this senior"`.

---

## ⭐ 11. Phase 4.6 - Review Display & Mentor Review Management Polish

- [ ] **Mentor Dashboard Received Reviews**:
  - Log in as a Senior Mentor who has received reviews from juniors.
  - Navigate to **Senior Connect** -> **Mentor Dashboard** (Tab 3).
  - Verify that a dedicated **⭐ Reviews Received** section is visible.
  - Check that if there are no reviews, a clean empty state card is displayed: `"No mentor reviews yet. Complete guidance sessions to receive reviews."`
  - If reviews exist, verify that each review card contains:
    * Reviewer's real public name (e.g. `Jane Doe`), department, and year of study (due to the completed guidance session connection).
    * Rating stars (1–5).
    * Helpfulness badge (`👍 Helpful`).
    * Guidance request topic (e.g. `Resume Review`).
    * Date and comment content.
  - Verify that reviewer email and reviewer UUID are strictly HIDDEN and not leaked.
  - Click **View Profile** on a review card. Verify that the `PublicProfileModal` for the junior opens correctly.

- [ ] **Public Profile Modal Refactored Reviews**:
  - Open any user's public profile modal (who is a senior mentor with > 3 reviews).
  - Verify that reviews are organized into two separate compact sections: **Senior Guidance Reviews** and **Peer Help Reviews**.
  - Verify that **Senior Guidance Reviews** are strictly anonymous, showing `"Anonymous Junior"` as the reviewer, and never leak email, UUID, phone, or WhatsApp details.
  - Verify that reviews in both sections are sorted by quality (best-first):
    1. Rating (1–5) descending.
    2. Helpful (`true`) first.
    3. Created_at date descending.
  - Verify that both sections initially display a maximum of `3` reviews.
  - If a section has more than 3 reviews, verify that a **Show more peer reviews** / **Show more mentor reviews** button is visible.
  - Click the show more button. Verify the list expands to show all reviews in that section, and the button text changes to **Show fewer reviews**.
  - Click **Show fewer reviews**. Verify the list collapses back to 3 reviews.

- [ ] **User's Own Profile Page (ProfilePage) Review Summaries**:
  - Log in and navigate to **My Profile**.
  - Locate the **Senior Mentor Impact** card.
  - Verify that a **⭐ Top Received Mentor Reviews** section is rendered.
  - Check that it lists up to the top 3 best mentor reviews (sorted quality-first) anonymously.
  - Verify that if you have more than 3 reviews, a footnote is displayed: `"💡 View all received mentor reviews in Senior Connect dashboard."`

- [ ] **Reputation Systems Separation**:
  - Verify that there is no combined global score or mixed ratings:
    * **Peer Help Reviews** use a 1-5 star scale (Trust Score %).
    * **Senior Guidance Reviews** use a separate 1-5 star scale (Average Mentor Rating).
    * **Doubt Contribution Ratings** use a 1-10 scale (Average Doubt Answer Rating).
  - Double check that doubt scores or peer help ratings never leak into the senior mentor rating averages, keeping the three modules strictly independent.

---

## 📈 12. Phase 4.7 - Final Pre-Phase-5 Stability & Review UX Polish

- [ ] **My Profile Toggles & Counters**:
  - Go to **My Profile** tab.
  - Verify **Peer Help Reviews (N)** header displays the compact count of reviews.
  - Verify reviews sort quality-first (`rating desc → helpful true first → created_at desc`).
  - Verify Peer Help reviews cap at `3` initially with an independent **Show more reviews** / **Show fewer reviews** button.
  - Verify **⭐ Top Received Mentor Reviews (N)** header displays the compact count of reviews.
  - Verify Mentor reviews cap at `3` initially with an independent **Show more reviews** / **Show fewer reviews** button and the redirection footnote.
  - Verify empty states `"No peer help reviews yet"` and `"No senior guidance reviews yet"` render nicely when there are no reviews.

- [ ] **Mentor Dashboard Reviews Capping & Counters**:
  - Open **Senior Connect** → **Mentor Dashboard** (Tab 3).
  - Verify header displays **⭐ Reviews Received (N)** with total received reviews count.
  - Verify the list of reviews is sorted best-first.
  - Verify the list caps at `5` initially with a local **Show more reviews** / **Show fewer reviews** button.
  - Verify that clicking the button expands the list locally to show all received reviews.

- [ ] **In-Page Review Refresh**:
  - As a student, navigate to **Senior Connect** → **My Requests**.
  - Rate a completed session (submit or edit feedback).
  - Submit the form. Verify that the request status, review badges, and any active dashboard reviews lists are immediately updated in-place without requiring a browser reload.

- [ ] **Contact Privacy & Warning Copy**:
  - Edit your profile and go to the **Private Contact Sharing Settings** section.
  - Verify the explicit gating warnings are displayed:
    * `"🔒 Only visible after an accepted/completed connection."`
    * `"✓ Only contact methods enabled by the user are shown."`
    * `"🚫 Private contact is never shown on public profiles."`
  - Open an accepted help request coordinate modal or guidance request coordination card.
  - Verify that the shared contact details card displays the same explicit gating warning copy consistently.

- [ ] **Request Workflow Descriptions & Warnings**:
  - Verify that request status cards display status-specific descriptive workflow notes:
    * **Pending**: `"⏳ Waiting for mentor response."` or `"⏳ Waiting for your response."`
    * **Accepted**: `"✅ Session coordination is available below."` or `"✅ Session coordination is active below."`
    * **Completed**: `"🎓 Guidance completed. You can review this mentor."` or `"🎓 Guidance completed."`
    * **Declined**: `"❌ Mentor declined this request."` or `"❌ You declined this request."`
    * **Cancelled**: `"🚫 You cancelled this request."` or `"🚫 Student cancelled this request."`
  - Verify duplicate requests show descriptive info: `"ℹ️ You already have an active request with this mentor. New requests are allowed after completed, cancelled, or declined sessions."`

---

## 🔵 13. Phase 5 — Learning Circles Module

### Circle Discovery & Filters
- [ ] **Discover Circles Tab**:
  - Navigate to Learning Circles → Discover tab.
  - Verify search bar filters circles by title, description, category, and department.
  - Verify Category, Difficulty, and Meeting Mode dropdowns filter results correctly.
  - Verify "X circles found" count updates dynamically.
  - Verify each circle card shows: title, description, category badge, difficulty badge, meeting mode, member count/max, and creator name.
  - Verify "View Details" button opens the Circle Workspace in Overview tab.

### Circle Creation
- [ ] **Create Circle Modal**:
  - Click "Start a Circle" button.
  - Leave Title blank → submit → verify inline error "Title is required."
  - Enter a Title shorter than 5 chars → verify "Title must be at least 5 characters."
  - Enter Description shorter than 20 chars → verify "Description must be at least 20 characters."
  - Enter Max Members = 1 → verify "Max members must be between 2 and 100."
  - Enter Meeting Location as `http://insecure.com` → verify error about https://.
  - Enter Meeting Location as plain text "Room 203 Block B" → verify accepted (no error).
  - Enter Meeting Location as `https://meet.google.com/xyz` → verify accepted.
  - Fill all fields correctly → submit → verify success toast "Circle Created! 🎉".
  - Verify circle appears in "My Circles" tab with "👑 Owner" badge.
  - Verify workspace opens automatically after creation.

### Join & Leave
- [ ] **Join Circle**:
  - As a different user, find an active public circle.
  - Click "+ Join" → verify success toast "Joined! 🎉".
  - Verify "✓ Joined" badge appears on card.
  - Verify "Open Workspace" button replaces "Join" button.
  - Try joining again → verify error "You are already a member of this circle."
  - Set max_members to current count → try to join → verify "This circle is full." error.
  - Archive the circle → try joining → verify "This circle is not accepting new members right now." error.

### Leave Circle
- [ ] **Leave Circle**:
  - As a member (non-owner), click "Leave" button.
  - Verify "Left Circle" success toast.
  - Verify "Join" button reappears on the card.
  - As the owner, verify no "Leave" button is shown (only "Open Workspace" action).

### Circle Workspace
- [ ] **Overview Tab**:
  - Open a circle workspace → verify Overview shows description, category, difficulty, mode, schedule, location/link, creator, created date, member count, visibility.
  - If location is a URL (https://), verify it renders as a clickable link.
  - If location is plain text, verify it renders as text.
  - If archived/paused, verify amber warning banner appears.
  - If not a member, verify "You are not a member yet" info box appears.

- [ ] **Members Tab**:
  - Open Members tab → verify all members are listed with name, department, year, join date.
  - Verify Owner has "👑 Owner" badge, others have "Member" badge.
  - Verify names do not expose raw UUIDs or emails.

- [ ] **Resources Tab**:
  - As a member, click "Share a Resource".
  - Submit with empty Title → verify "Title is required."
  - Enter URL as `http://insecure.com` → verify "URL must use https:// protocol" error.
  - Enter URL as `javascript:alert(1)` → verify blocked with https error.
  - Enter URL as `https://youtube.com` → verify accepted.
  - Verify resource appears in list with type icon, title, uploader name, relative timestamp.
  - Verify uploader can delete their own resource (trash icon visible).
  - Verify owner can also delete any resource.
  - Verify non-uploader non-owner sees no delete icon.
  - As an archived circle member, verify "Share a Resource" form is hidden.

- [ ] **Discussion Tab**:
  - As a member, post a message with type "Update".
  - Verify post appears at top with author name, time, type badge.
  - Post with type "Question", "Plan", "Announcement" → verify different badge colors.
  - Verify post author can delete their own post.
  - Verify circle owner can delete any post.
  - Verify non-author non-owner cannot see delete icon on others' posts.
  - As an archived circle member, verify post form is hidden.

### Archive / Restore
- [ ] **Archive Circle (Owner only)**:
  - In workspace header, click "📦 Archive".
  - Verify success toast "Circle Archived".
  - Verify workspace header shows "archived" badge.
  - Verify "Archived" status badge appears on circle card.
  - Verify Join button is hidden on archived circles.
  - Verify post form and resource form are hidden in workspace.
  - Click "♻ Restore" → verify "Circle Restored" toast and active status restored.

### Profile Integration
- [ ] **My Profile – Learning Circles Count**:
  - After joining 1+ circles, navigate to My Profile.
  - Verify "🔵 Learning Circles" section appears below Doubts section.
  - Verify the count displayed matches the number of circles joined/owned.
  - Verify the section is hidden if user has 0 circles.

### Security & Privacy
- [ ] **URL Safety**:
  - Attempt to share a resource with URL `javascript:void(0)` → blocked.
  - Attempt to share a resource with URL `data:text/html,...` → blocked.
  - Attempt to share a resource with URL `file:///etc/passwd` → blocked.
  - Attempt to share a resource with URL `https://drive.google.com/...` → accepted.
- [ ] **No Private Data Leaks**:
  - Verify no UUID, email, or phone number is displayed anywhere in the Learning Circles module.
  - Verify all member names resolve to full_name from profiles join.

---

## 🔵 14. Phase 5.1 — Learning Circle Secure Resource Uploads & Owner Status Lock

### Secure File Uploads
- [ ] **Segment Selector (Link vs File)**:
  - Visit the resources tab in an active workspace.
  - Verify the presence of the segmented control: "External HTTPS Link" and "Secure File Upload".
  - Click on "Secure File Upload". Verify that the drag-and-drop file input is displayed, and the external URL input is hidden.
- [ ] **File Type Validation**:
  - Attempt to drag-and-drop or select a file with an unsupported type (e.g. `.exe`, `.dmg`, `.mp3`).
  - Verify that an inline warning states "Unsupported file type." and blocks selection.
  - Choose a supported file type (e.g. `.pdf`, `.png`, `.jpg`, `.docx`, `.xlsx`, `.pptx`, `.txt`). Verify that it is accepted, and that the file size is formatted nicely.
- [ ] **File Size Boundary**:
  - Attempt to select a file larger than 10MB.
  - Verify that an error "File size exceeds the 10 MB limit." is shown and selection is cleared.
- [ ] **Auto-title and Suggest Type**:
  - Choose a PDF file named `Chemistry_Lecture_Notes.pdf`.
  - Verify that the title input automatically fills with `Chemistry_Lecture_Notes` and the Resource Type suggests `PDF`.
- [ ] **File Upload Submission**:
  - Add an optional description and submit the form.
  - Verify that the loading state triggers: "+ Uploading..." is displayed, and inputs are disabled.
  - Once complete, verify that a success toast "File Uploaded! 🚀" is shown, and the new resource appears in the list with a beautiful "💾 [Size]" badge, original uploader name, and secure preview/download actions.

### Secure Preview Lightbox Modal
- [ ] **PDF Interactive Preview**:
  - Locate a PDF resource and click **Preview**.
  - Verify that a secure signed URL is generated with 5-minute expiry.
  - Verify that the lightbox overlay modal appears containing an interactive `iframe` rendering the PDF document natively in the browser.
- [ ] **Image Preview**:
  - Locate a PNG/JPG resource and click **Preview**.
  - Verify that the lightbox overlay modal displays the image natively with a responsive viewer.
- [ ] **Office Documents Fallback (Word/Excel/Slides)**:
  - Locate a `.docx` or `.xlsx` resource and click **Preview**.
  - Verify that the lightbox modal displays a detailed file metadata card containing the file name, size, type, uploader name, and date.
  - Verify that the caution message: `"Direct browser preview is not supported for Office documents to preserve security. Please download the file to open it."` is shown.
  - Click **Download File Securely**. Verify that the file downloads successfully.

### Status Lock Restrictions
- [ ] **Upload Lock States**:
  - Log in as the Owner and go to the Overview tab.
  - Select **🟡 Pause Uploads** status.
  - Switch to the Resources tab as the Owner or a normal Member.
  - Verify that the "+ Share a Resource" button and form are replaced by: `"🔒 Resource uploads are disabled because this circle is currently paused."`
  - Verify that discussions and announcements still remain active.
  - Select **📦 Archive** status.
  - Verify that both the resource upload form AND the discussion post forms are completely hidden.

### Secure Role Capabilities
- [ ] **Role Guidelines Split Card**:
  - Go to the Overview tab of any circle.
  - Verify the split Capability Guidelines card displays clear details for Circle Owner and Circle Member permissions.
- [ ] **Safe Resource Deletion**:
  - Verify that Owners can delete *any* resource (link or file) by clicking the trash icon.
  - Verify that normal Members can *only* delete resources they uploaded themselves, and see no trash icons on others' resources.
  - Verify that when a file resource is deleted, it is securely deleted from the private Supabase Storage bucket first before removing the row from PostgreSQL.

