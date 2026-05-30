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


## 🔵 15. Phase 5.2 — Learning Circle Join Requests & Member Profile Verification

### Join Request Workflow
- [ ] **Request to Join Button**:
  - Log in as a normal student (non-member, non-owner).
  - Open the **Discover Circles** explorer tab.
  - Locate an active circle and verify that the button displays **Request to Join** (instant direct join is disabled).
  - Verify that clicking it triggers the **Join Request Modal**.
- [ ] **Join Request Modal Validations**:
  - In the Join Request Modal, select a role interest (Learner, Contributor, Peer Mentor).
  - Leave the application message blank or type less than 10 characters.
  - Click **Submit Application**. Verify that an error message: `"Please provide a message explaining why you want to join (minimum 10 characters)."` is displayed and submission is blocked.
  - Type a meaningful message (at least 10 characters) and submit.
  - Verify that a success toast `"Request Submitted! ⌛"` is shown, the modal closes, and the button changes to `"⌛ Pending (Cancel)"`.
- [ ] **Pending Requests Summary & Cancellation**:
  - Navigate to the **My Circles** explorer tab.
  - Locate the **Pending Join Requests** dashboard panel.
  - Verify that the submitted request appears in this list with its title, role interest, status, and the submitted message.
  - Click the **Cancel** action or the button on the card. Confirm that the request is updated to `cancelled` and disappears from the dashboard, allowing you to click "Request to Join" again.
- [ ] **Lock Restrictions on Inactive Circles**:
  - Visit a circle that is **Paused** or **Archived** (as a non-member).
  - Verify that the "Request to Join" button is completely disabled or hidden, displaying `Paused` or `Archived`, and no new requests can be submitted.

### Owner Dashboard & Response Actions
- [ ] **Pending Join Requests Tab**:
  - Log in as the Owner of the learning circle that has a pending request.
  - Open the **Manage Workspace** panel and switch to the **Join Requests** tab.
  - Verify that the pending request is listed with the requester's name, department, year of study, role interest, application message, and academic credentials.
- [ ] **Requester Public Profile Preview (No Private Fields)**:
  - Click **View Full Public Profile** next to the requester's name.
  - Verify that the profile modal loads correctly showing academic focus, learning goals, qualifications, skills, and portfolio badges (GitHub, LinkedIn).
  - **CRITICAL PRIVACY CHECK**: Verify that **no** private contact details (phone, email, WhatsApp, raw UUIDs, or database IDs) are displayed anywhere.
- [ ] **Status Change Locking**:
  - Set the circle status to **Paused** or **Archived** in the Overview tab.
  - Go to the **Join Requests** tab.
  - Verify that a prominent warnings block states: `"You cannot accept or review pending requests while the circle is in a non-active status."`
  - Verify that both the **Accept Application** and **Reject Application** action buttons are fully disabled.
  - Re-enable the circle status to **Active**. Verify that warning disappears and buttons are fully enabled.
- [ ] **Reject Flow with Custom Context**:
  - With the circle active, type an optional response message: `"Sorry, we have reached maximum member limits for this study group."`
  - Click **Reject Application**.
  - Verify that a success toast is shown, and the request is removed from the active pending list.
  - Log in as the requester. Verify that the card now shows the **Request again** trigger, and displays the owner's custom rejection comment inline.
- [ ] **Accept Flow & Workspace Access**:
  - Submit another request from a test student.
  - Log in as the Owner and go to the **Join Requests** tab.
  - Click **Accept Application** (with or without a custom response message).
  - **NOTE**: The database RLS insert policy requires the join request to have status = `accepted` before the membership row can be inserted. Verify that the API executes the status update first, followed by the membership insert.
  - Verify that a success toast `"Application Approved! 🎉"` is shown, and the request is removed from the list.
  - Click the **Members** tab in the workspace. Verify that the accepted requester has been instantly added as a `member`.
  - Log in as the accepted student. Verify that you can now fully access the workspace, share resources, view files, and write discussion posts.


### Profile Custom Academic Links & URL Validation
- [ ] **Optional Academic Fields during Editing**:
  - Navigate to your **Profile Page** and click **Edit Profile**.
  - Locate the **Academic & Learning Profile** section. Verify that all fields (Headline, Academic Interests, Learning Goals, Current Focus, Qualification Summary, GitHub URL, LinkedIn URL, Portfolio URL) are present and completely optional.
- [ ] **Profile URL Safety Check**:
  - Type an unsafe URL scheme into the GitHub URL input (e.g. `http://github.com/myuser`, `javascript:alert(1)`, `data:text/html,...`, or relative link).
  - Click **Save Changes**.
  - Verify that an explicit error: `"GitHub URL must use the https:// protocol."` is triggered and saving is blocked.
  - Change all URL inputs to start with strictly `https://` (e.g., `https://github.com/user`, `https://linkedin.com/in/user`). Click **Save Changes**. Verify that saving succeeds without issue.


## 🌟 Phase 5.3: Learning Circle Workflow Rules, Owner Management, Resource Ranking Polish

### 1. Private Meeting Coordinates Access
- [ ] **Owner Setup**:
  - In your owner workspace, open the **Overview** tab and click **Manage Settings**.
  - Fill in the **Member-Only Meeting Link** (must strictly be an `https://` URL, e.g. `https://meet.google.com/abc-defg-hij`) and **Member-Only Password** (e.g. `secret123`).
  - Click **Save Settings** and confirm the success toast.
- [ ] **Accepted Member View**:
  - Log in as an accepted member of the circle. Open the circle workspace **Overview** tab.
  - Verify that a premium looking **Confidential Meeting Coordinates** card is rendered, displaying a clickable **Join Online Session** button and a selectable access password.
- [ ] **Public / Non-Member View**:
  - Log in as a non-member student, or browse the discover cards.
  - Verify that the private coordinates, meeting link, and password are **never** shown on discover cards, public circles list, or the non-member details view.

### 2. Cohort Capacity Constraints
- [ ] **Settings Lower Bound Guard**:
  - As the Owner, go to **Manage Settings** and attempt to set the maximum capacity lower than 2, higher than 100, or lower than the current active member count.
  - Verify that saving is blocked, and an explicit validation error is displayed.
- [ ] **Active Requests Capacity Warning**:
  - Simulate/fill the cohort to the capacity limit.
  - Go to the **Join Requests** tab.
  - Verify that a warning banner states: `"Circle capacity limit reached"`.
  - Verify that the **Accept Application** action button is completely disabled for all pending requests.
  - Verify that you can still decline/reject requests while full.
  - Go to **Manage Settings**, increase the capacity, and verify that the warning banner disappears and the accept button becomes active.

### 3. Owner Roster Controls & Alphabetical Members List
- [ ] **Roster Alphabetical Sorting**:
  - Open the **Members** tab in your workspace.
  - Verify that the **Owner** is strictly pinned at the very top of the list with a `"👑 Owner"` badge.
  - Verify that all other members are sorted strictly **alphabetically** by their public full name.
- [ ] **Member Removal**:
  - As the Owner, locate a standard member on the roster.
  - Click the **❌ Remove** button next to their name and confirm the browser alert.
  - Verify that the member is removed from the roster instantly, and the member count is decremented.
  - Log in as the removed member. Verify that you have lost access to the workspace, resources, and discussions, and can now cleanly submit a new join request.

### 4. Resource Pinning & Likes Interaction
- [ ] **One Like Per User Constraint**:
  - Open the **Resources** tab as a member.
  - Locate a resource and click the **🤍 Like** button. Verify that the like count is incremented and the button changes to `❤️ Liked`.
  - Click the button again. Verify that it unlikes the resource, decrementing the count back to 0.
- [ ] **Owner-only Resource Pinning**:
  - As a circle owner, locate a resource. Click **📌 Pin**.
  - Verify that a vibrant `📌 PINNED` badge is rendered, and the resource is instantly ranked at the very top of the list.
  - Verify that regular members **do not** see the pin/unpin action button.
- [ ] **Resource Paging / Pagination**:
  - Upload 4 or more study resources.
  - Verify that initially only the top 3 resources are rendered.
  - Verify that a **➕ Show more resources** button is rendered at the bottom of the list.
  - Click the button. Verify that the list expands to show all remaining resources, and is replaced by a **➖ Show fewer resources** button to collapse it back.
## 🌟 Phase 5.4: Learning Circle Exit Workflow & Resource Verification System

### 1. Leave Study Circle Exit Form
- [ ] **Departing Member Flow**:
  - Log in as a regular member of a circle.
  - On the circle card (Discover/My Circles), click the **Leave** button.
  - Verify that a premium looking **Leave Circle: [Circle Name]** modal is rendered.
  - Select a reason (e.g., "Completed learning goal") and type an optional message: `"Thanks for the great DSA discussions!"`.
  - Click **🚪 Leave Study Circle** and confirm the success toast.
  - Verify that you are instantly removed from the circle, loss of workspace access is immediate, and you can now request to join again cleanly.
  - Verify that the owner **does not** see the old accepted request as `"Repair Needed"`.

### 2. Owner Remove Member custom form
- [ ] **Roster Removal Flow**:
  - As the Owner, navigate to the **Members** tab.
  - Click the **❌ Remove** button next to a standard member.
  - Verify that a premium looking **Remove Member: [Member Name]** modal is rendered.
  - Choose a reason (e.g., "Inactive member") and write a message: `"No updates in over 2 weeks. Removing to open slots."`.
  - Click **🚫 Remove Member** and confirm the success toast.
  - Verify that the roster is updated, and the member loses access.
  - Log in as the removed student. Verify that you can cleanly request to join again, and see the owner's custom removal reason.

### 3. Member Submitted Resources Dashboard
- [ ] **Pending upload flow**:
  - Log in as a regular member of an active circle.
  - Click **+ Share a Resource / File** under the **Resources** tab.
  - Type a secure URL in link mode (e.g., `https://google.com/notes`). Note the live formatting verification alert.
  - Click **Share Resource**. Verify the success toast: `"Your shared material has been sent to the circle owner for verification."`
  - Verify that the link is **not** displayed in the Main Library Resources list yet.
  - Locate the **My Submitted Resources** panel. Verify that the link is listed with an orange `⏳ Pending` badge.

### 4. Owner Resource Verification Console & Safety Check
- [ ] **Resource Approval Flow**:
  - Log in as the Owner of the circle. Open the **Resources** tab.
  - Locate the **Resource Verification Queue** console. Verify that the member's pending link is listed with uploader name, shared date, link coordinates, safety formats, and Decline/Approve buttons.
  - Click **✅ Approve Only**. Verify that the resource is removed from the verification queue and added to the **Main Library Resources** list with a success toast.
- [ ] **Safety warning triggers**:
  - Log in as a member. Submit a resource URL targeting an executable file (e.g., `https://example.com/malicious.exe`).
  - Log in as the Owner. Locate the item in the verification queue.
  - Verify that a prominent amber safety warning is displayed: `"This link targets a file type (.exe) that can be executed."`
  - Click **❌ Decline & Reject**.
  - Verify that a custom modal prompts you for a rejection reason.
  - Type `"Executable file formats are blocked for security."` (must be at least 5 chars). Click **Decline Material**.
  - Log in as the member. Locate the item in **My Submitted Resources**. Verify that it has a red `❌ Rejected` badge and displays the owner's feedback reason inline.

### 5. Roster Aggregate Stats and Owner Recommendation Ranking
- [ ] **Members stats display**:
  - Open the **Members** tab as a member.
  - Verify that each member card displays inline aggregate metrics, e.g., `Shared: 2 | V: 1 | P: 1 | R: 0`.
- [ ] **Star Recommendation Rank**:
  - As the Owner, locate a verified resource in the main library list.
  - Click **⭐ Recommend**. Verify that a premium blue `⭐ RECOMMENDED` badge is rendered, and the resource is sorted directly above likes/newest (pinned is still at the absolute top).
  - Regular members see the badge, but **cannot** toggle the recommendation status.

## ⚙️ Phase 5.4A: Leave Lifecycle Tracking and Old Accepted Request Cleanup

### 1. Old Accepted Request Filtering (Anti-"Repair Needed" check)
- [ ] **False Repair Shield**:
  - Run the diagnostic query (from `supabase/README.md`) on the Supabase console. Confirm that any old accepted join requests that exist *without* a corresponding active `learning_circle_members` row (e.g. users who intentionally left before lifecycle logs existed) are correctly retrieved.
  - Log in as the Circle Owner. Navigate to the circle's **Requests** tab.
  - Verify that old accepted request entries with no `membership_created_at` (null in the database) **do not** render at all and do **not** trigger a false `"Repair Needed"` warning banner.
  - Check that ONLY actual active pending requests OR true, broken accepted requests (`membership_created_at` is NOT null and `member_left_at` is null) appear.

### 2. Precise exit/kick logs tracking by ID
- [ ] **Precise Leave Logs**:
  - Log in as a member and click **Leave**. Provide a reason and message.
  - Verify in the database (or via local UI checks) that the `member_left_at`, `leave_reason`, `leave_message`, and `left_by` fields are successfully saved **specifically on the single, latest accepted join request row** using its unique ID, and that previous historic join requests for that user are unaffected.
- [ ] **Precise Kick Logs**:
  - Log in as the Circle Owner, navigate to the **Members** roster, and remove a member with a custom message.
  - Verify in the database (or via local UI checks) that the `member_left_at`, `leave_reason`, `leave_message`, and `removed_by` fields are successfully recorded on the latest accepted join request row by ID.

### 3. Request Again flow
- [ ] **Re-Request lifecycle**:
  - Log in as a student who previously left or was removed from a circle.
  - Navigate to the **Discover** tab. Locate the circle card.
  - Verify that the card's join request button renders `"Request Again"`.
  - Click `"Request Again"`. Type a new application message (minimum 10 chars) and submit.
  - Verify the application goes to pending status, and displays `"⌛ Pending (Cancel)"` to block duplicates.

## 💎 Phase 5.5: Learning Circles Final Polish & Stability Checklist

### 1. Verification Queue & Rejected Resource Polish
- [ ] **Active Owner Verification Queue Filtering**:
  - Log in as the Owner. Navigate to the circle's **Resources** tab.
  - Verify that the active **Resource Verification Queue** shows ONLY resources with status `pending_verification`.
  - Verify that rejected resources **do not** appear in this active queue list.
- [ ] **Owner-only Rejected Resource History Collapsible**:
  - Verify that a collapsible section titled `"Rejected Resource History"` appears below the active queue when there are rejected files.
  - Toggle the collapsible section open. Verify that historically rejected resources are displayed with their title, uploader name, rejected date, and rejection reason, and that **no** Accept/Decline action buttons are shown.
- [ ] **Uploader-only Rejected Status Panel**:
  - Log in as the member whose resource was rejected.
  - Verify that the rejected resource remains visible strictly inside **My Submitted Resources** dashboard panel, showing a red `❌ Rejected` badge and the owner's custom rejection feedback reason.
  - Verify that this rejected resource is completely invisible inside the **Main Library Resources** view.
- [ ] **Empty Active Queue State**:
  - As the Owner, verify that if there are no pending resources waiting for review, the verification console renders a clean status label: `"No resources waiting for verification."`

### 2. Workspace Roster & Spacing Details
- [ ] **Owner Roster Priority**:
  - Open the **Members** tab in the circle workspace.
  - Verify that the Owner is strictly displayed at the very top of the list with a `"👑 Owner"` badge.
- [ ] **Alphabetical Standard Members Sorting**:
  - Verify that all standard members are sorted strictly alphabetically by their full profile name.
- [ ] **Tablet/Mobile Spacing and Joined Dates**:
  - Resize the viewport to simulated tablet/mobile widths.
  - Verify that the joined date (e.g., `"Joined 30 May 2026"`) remains cleanly visible and does not wrap awkwardly or overlap.
- [ ] **Compact Resource stats**:
  - Verify that every member's roster listing displays their contribution metrics compactly (`Shared | V | P | R`) and that stats increment correctly on approvals/rejections.

### 3. Resource Ordering & Badges
- [ ] **Tab Header Resource Counters**:
  - Verify that the tab header displays the exact current library resources count, e.g., `"Resources (3)"`.
- [ ] **Main Library Badges**:
  - Open the verified resources list. Verify that every resource renders a green `"✅ Verified by Owner"` badge.
  - Verify that owner-pinned resources render `"📌 Pinned"` and owner-recommended resources render `"⭐ Owner Recommended"`.
  - Verify that likes display in a clean `"👍 X likes"` button format.
- [ ] **Resource Slicing and Expansion Toggles**:
  - Verify that if there are 4 or more verified resources, only the first 3 are rendered, with smooth `➕ Show more resources` and `➖ Show fewer resources` buttons to toggle expansion.
- [ ] **Resource Sorting Hierarchy**:
  - Verify resources are ranked in the following exact hierarchy: `Pinned first -> Recommended second -> Likes count third -> Newest first`.

### 4. Meeting Privacy & Clipboard Copy Controls
- [ ] **Meeting Details Access Rights**:
  - Log in as a non-member. Verify that no meeting coordinates or credentials are shown on discover cards or non-member views.
  - Log in as a member. Verify that the credentials card is titled `"Members-only meeting details"`.
  - Verify that if meeting details are empty, the coordinates container displays: `"Meeting details will be shared by the owner."`
- [ ] **Clipboard Copy Triggers**:
  - Click the **Copy (📋)** button next to the meeting link. Verify that it copies the URL to your clipboard and fires a success toast: `"Meeting link copied to clipboard."`
  - Click the **Copy (📋)** button next to the meeting password. Verify that it copies the passcode to your clipboard and fires a success toast: `"Meeting password copied to clipboard."`

### 5. Standard Empty States & Fallbacks
- [ ] **Main Verified Resources Fallback**:
  - Verify that if there are no verified study materials shared yet, the view shows: `"No verified resources yet."`
- [ ] **My Submitted Resources Fallback**:
  - As a member, if you have not shared any materials yet, verify that the panel shows: `"You have not submitted resources yet."`
- [ ] **Discussion Tab Fallback**:
  - Verify that if there are no posts shared yet, the view shows: `"No discussion posts yet."`
- [ ] **Join Requests Tab Fallback**:
  - As the Owner, verify that if there are no pending join requests, the tab shows: `"No pending join requests."`

### 6. Cohort Capacity Bounds and request Again
- [ ] **Discover Cards cohort limits**:
  - Locate a full circle. Verify that the card displays a red `"Full"` badge and shows members count as `C/M` (e.g. `20/20`).
  - Verify that the join button is active but displays a clear warning: `"Full — owner must increase capacity before accepting."`
  - Verify that the join application is still allowed to be sent to the owner, but the owner is blocked from accepting until they increase maximum capacity.
- [ ] **Request Again Verification**:
  - After a member intentionally leaves or is removed, verify that the Discover card join button displays `"Request Again"` and lets the student re-apply.

---

## 🗣️ Phase 5.6: Professional Discussion Board, Moderation, Presence System & UX Polish

### 1. SQL Database Patch Verification
- [ ] **Presence Table Created**:
  - In Supabase Table Editor, verify `public.learning_circle_presence` table exists with columns: `id`, `circle_id`, `user_id`, `last_seen_at`, `current_tab`, `created_at`, `updated_at`.
  - Verify the unique constraint `unique_circle_user` on `(circle_id, user_id)`.
- [ ] **Post Extensions Applied**:
  - In Supabase Table Editor, verify `public.learning_circle_posts` now has: `title`, `body`, `tags`, `is_pinned`, `pinned_by`, `pinned_at`, `is_resolved`, `resolved_by`, `resolved_at`, `edited_at`, `deleted_at`, `deleted_by` columns.
- [ ] **Replies Table Created**:
  - Verify `public.learning_circle_post_replies` table exists.
- [ ] **Reactions Table Created**:
  - Verify `public.learning_circle_post_reactions` table exists.

### 2. Discussion Stats Dashboard
- [ ] **Stat Cards Render**:
  - Navigate to the **Discussion** tab inside a circle workspace.
  - Verify 4 stat cards are displayed: `Total Posts`, `Open Questions`, `Announcements`, `Active Replies`.
  - Verify that the numbers are correct and match actual data.
- [ ] **Real-time Stats Updates**:
  - Add a new reply to a post. Verify that `Active Replies` count increments immediately without a full page reload.
  - Delete a reply. Verify that `Active Replies` count decrements immediately.

### 3. New Post Composer Modal
- [ ] **Open Composer**:
  - Click `➕ New Post`. Verify the composer modal opens.
- [ ] **Post Type Selection**:
  - Verify the post type dropdown includes: `📢 Discussion`, `❓ Question`, `📣 Announcement` (owner only), `📅 Study Plan`.
  - As a non-owner, verify that the `Announcement` option is hidden or blocked.
- [ ] **Character Counter Validation**:
  - Try submitting with an empty title or body. Verify inline error messages appear.
  - Verify that the submit button is disabled until minimum requirements are met.
- [ ] **Successful Submission**:
  - Fill in title and body, select a post type, and submit. Verify the post appears immediately in the discussion list without a full page reload.
  - Verify a success toast fires.

### 4. Post Card Features
- [ ] **Post Type Badge**:
  - Verify that each post card renders a colored badge for its type (e.g., sky blue for Discussion, amber for Question, rose for Announcement, indigo for Study Plan).
- [ ] **Announcement Glow Line**:
  - Pin an announcement post as the owner. Verify a red line appears at the very top of the post card.
- [ ] **"Edited" Label**:
  - Edit an existing post. Verify a small `(edited)` timestamp label appears next to the post's timestamp after saving.
- [ ] **Soft-Delete Placeholder**:
  - As the owner, soft-delete a post. Verify the post renders a dashed placeholder: `"🚫 This post was removed by the owner."` instead of disappearing from the list.

### 5. Question Resolution
- [ ] **Mark Resolved**:
  - Create a `question` type post. Verify the `✅ Mark Resolved` button is present.
  - Click it. Verify the post card shows a `✅ Resolved` badge.
- [ ] **Filter by Resolved State**:
  - In the filter bar, select the `❓ Questions` post type. Verify a new filter dropdown appears: `All Questions`, `❓ Open / Unresolved`, `✅ Resolved Only`.
  - Toggle between states. Verify only matching posts appear in the list.

### 6. Post Pinning & Helpful Reactions
- [ ] **Owner Pin Post**:
  - As the circle owner, click the pin action on a post. Verify the post moves to the top of the list and shows a `📌 Pinned` indicator.
- [ ] **Helpful Reaction**:
  - Click `👍 Helpful` on a post. Verify the count increments.
  - Click again to undo. Verify the count decrements.
  - Verify users cannot react to their own posts (or that it handles gracefully).

### 7. Threaded Reply Drawer
- [ ] **Expand Replies**:
  - Click on a post to expand the reply drawer. Verify existing replies load correctly.
- [ ] **Add Reply**:
  - Type a reply and submit. Verify the reply appears immediately in the drawer.
  - Verify that the main post list shows the incremented reply count instantly.
- [ ] **Edit / Delete Reply**:
  - As the reply author, click edit. Modify the text and save. Verify `(edited)` appears.
  - Delete the reply. Verify it disappears from the drawer and the post's reply count decrements.
- [ ] **Author Online Dot**:
  - If the post author is logged in concurrently, verify a small animated green dot 🟢 appears on their avatar.

### 8. Search & Filter Controls
- [ ] **Search Input**:
  - Type a keyword in the search box. Verify only matching posts (by title or body) are shown.
  - Clear the search. Verify all posts return.
- [ ] **"My Posts" Toggle**:
  - Click `👤 My Posts`. Verify only posts by the current user are shown.
- [ ] **Paused/Archived Read-Only Banner**:
  - As the owner, change the circle status to `Paused` or `Archived`.
  - Navigate to the Discussion tab. Verify the amber banner `"🔒 Discussions are read-only because this circle is currently paused/archived."` appears.
  - Verify the `➕ New Post` button is hidden while in this state.

### 9. Lightweight Presence Bar
- [ ] **Bar Renders for Members**:
  - As an accepted member, open a circle workspace. Verify the presence bar appears between the tab navigation and the tab content area.
- [ ] **Presence Counts**:
  - Verify the bar shows: 🟢 X online · 🟡 Y recently active · ⚫ Z offline.
  - Open the workspace from a second user account in a separate browser. Verify the online count updates on the next heartbeat (within ~60 seconds).
- [ ] **Hidden for Non-Members**:
  - As a non-member or guest, verify the presence bar does not render.

### 10. Member Tab Presence Indicators
- [ ] **Color-coded Status Dots**:
  - Navigate to the Members tab. Verify each member card shows a colored status dot: green for Online, amber for Recently active, and grey for Offline.
- [ ] **"Last seen" Timestamp**:
  - Verify that each member card shows their last seen timestamp in relative format (e.g., "Last seen: just now" or "Last seen: 5m ago").
- [ ] **Heartbeat Accuracy**:
  - Stay in the workspace for more than 60 seconds. Verify that the current user's status shows as Online in the members list.

---

## 📋 Phase 5.6B — Discussion Auto-Cleanup & Deletion Lifecycle

### 1. Deleted Post Placeholder (4-Hour Window)
- [ ] **Soft delete a post** as the author or owner. Verify:
  - The post's content (title, body, tags) is immediately hidden.
  - A `🚫 This post was deleted by the author.` or `This post was removed by the owner.` placeholder appears.
  - The placeholder shows `Visible for a few hours for context · <relative time>`.
  - No helpful button, reply button, edit/delete actions, pin, or resolve controls are shown on the placeholder.
- [ ] **Confirm delete modal** reads:  
  `"This will soft-delete the post. The content will be hidden immediately. A placeholder will remain visible for up to 4 hours for context, then disappear automatically. The record is retained for moderation."`
- [ ] **Success toast** after deletion reads:  
  `"The post was removed. A placeholder will appear for up to 4 hours for context, then disappear automatically."`

### 2. Deleted Reply Placeholder (4-Hour Window)
- [ ] **Delete a reply** in the threaded drawer. Verify:
  - The reply body, helpful buttons, and edit/delete actions are immediately hidden.
  - A `🚫 This comment was deleted by the author.` or `removed by the owner.` placeholder appears.
  - The placeholder shows `Visible temporarily for context · <relative time>`.
- [ ] **Success toast** after reply deletion reads:  
  `"The comment was removed. A placeholder will appear for up to 4 hours for context, then disappear automatically."`

### 3. Automatic Expiry (After 4 Hours)
- [ ] Simulate an expired deletion by temporarily editing `isDeletedRecently` to use a 0-second window in dev.
  - Verify deleted post/reply placeholders completely vanish from the UI (no empty slot, no placeholder card).
  - Verify the post/reply is absent from `posts` array and `repliesByPost` state after refresh.
- [ ] Verify that expired deleted posts do NOT count in the `Show more/fewer` button count.

### 4. Show More / Fewer Accuracy
- [ ] With >3 visible posts, verify the `➕ Show more discussions (N more)` button appears.
- [ ] The count `N` should only include non-deleted posts and placeholders within the 4-hour window.
- [ ] After all posts expire (or only ≤3 remain visible), verify the button disappears entirely.

### 5. Content Safety — No Leakage
- [ ] Inspect the DOM on a deleted post placeholder. Verify:
  - No title, body, or tags text is rendered.
  - No author email or UUID is visible.
  - No helpful/reaction buttons are rendered.
  - No pin, resolve, edit, or delete action buttons are rendered.
- [ ] Inspect the network response: verify deleted content body is returned by the API but never rendered in JSX.

### 6. Stats Accuracy
- [ ] After deleting a post, verify the discussion stats bar updates:
  - `totalPosts` reflects only visible posts (non-deleted, or recently deleted within 4h).
  - `openQuestions` and `resolvedQuestions` only count non-deleted question posts.
  - `totalReplies` reflects only visible (non-expired) replies.
- [ ] After 4 hours (simulate by mock or wait), re-fetch stats. Verify expired posts drop from all counts.

### 7. Regression — Existing Features
- [ ] Post create, edit, pin, resolve still work correctly.
- [ ] Reply add, edit, helpful reaction still work correctly.
- [ ] Filter by type, search, mine, resolved still work correctly.
- [ ] Reset filters button clears all active filters correctly.
- [ ] Owner badge and You badge still render correctly on non-deleted posts/replies.
- [ ] Real-time presence heartbeat and online dot still function on non-deleted posts.

---

## 🤝 15. Phase 6.1 — Find Teammates / Project Mate Finder Core System

> **Requires Supabase Patch**: Run `supabase/phase6-project-mate-finder-core-patch.sql` in the SQL Editor before testing.

### 1. Project Creation Workflow
- [ ] **Create Project Modal validation**:
  - Open **Find Teammates** tab. Click **+ Post Project Board**.
  - Submit title shorter than 5 chars → verify warning: `"Title must be at least 5 characters long."`
  - Submit description shorter than 20 chars → verify warning: `"Description must be at least 20 characters long."`
  - Set Max Team Size < 2 or > 20 → verify validation blocks it.
- [ ] **Role Builder constructor**:
  - Click **+ Add Role Slot**. Define role names, prerequisite skills, slots count, description, and select priority.
  - Verify that leaving optional description or skills empty does not block creation.
- [ ] **HTTPS coordination links validation**:
  - In coordination links, enter `http://google.com/meet` → verify warning: `"All external links must strictly use the https:// protocol."`
  - Enter `javascript:alert(1)` or `data:text/html` → verify strict validation blocks submission.
  - Enter valid URLs starting with strictly `https://` → verify successful creation.
- [ ] **Project Owner bootstrap**:
  - Once project is created, click **Manage Workspace** -> check **Team Roster** card.
  - Verify that the creator has been automatically registered as a team member with role: `"Project Owner"`.

### 2. Discover Projects & Filter Management
- [ ] **Discover Projects card**:
  - Open **Discover Projects** tab as a logged-in student.
  - Verify that the newly created project card appears instantly, showing title, description, category, difficulty, work mode, owner, required skills, and team size.
- [ ] **Match Score calculation**:
  - Check the compatibility match score badge on the card.
  - Verify it correctly computes a percentage based on:
    * Skills overlap (50%): matching required skills in project/roles with your profile skills.
    * Department preference (25%): matching project preferred department list with your department.
    * Year preference (25%): matching project preferred years with your academic year of study.
  - Verify that hovering or looking at matching preview lists the specific criteria matched.
- [ ] **Active filters and reset**:
  - Enter search query in input. Verify list filters.
  - Select Category, Project Type, Difficulty, and Work Mode dropdowns. Verify cards update instantly.
  - Check "Has Open Slots", "Beginner Friendly", or "Hackathon" checkboxes. Verify correct filtering.
  - Click **Reset Filters**. Verify that all fields clear, all checkboxes reset, and the full projects list returns.

### 3. Application Lifecycle (Non-Owner Flow)
- [ ] **Owner self-apply blocked**:
  - As the project creator, verify that no "Join Request" or "Apply" buttons are available on your own project cards in the discover list.
- [ ] **Submit Application**:
  - Log in with Student Account A (not project creator). Go to discover list.
  - Click **Join Request** (or **Apply** next to a role). The **Submit Join Request** modal should open.
  - Enter message shorter than 10 characters → submit → verify warning: `"Application message must be at least 10 characters."`
  - Enter invalid portfolio URL (e.g. `http://portfolio.com`) → verify HTTPS block.
  - Enter message >= 10 chars, safe portfolio URL (https://) and click Submit. Verify success toast and status indicator shows `"Applied (pending)"`.
- [ ] **Duplicate pending application blocked**:
  - Go back to the card. Try to apply again.
  - Verify that no Apply actions are active, and attempting duplicate submissions is blocked by both frontend rules and database constraints.
- [ ] **Withdraw Application**:
  - Go to **My Applications** tab.
  - Locate the pending application, click **Withdraw**.
  - Confirm withdrawal. Verify status updates to `"withdrawn"`, and you can now click "Join Request" again on the discover page.

### 4. Owner Review Queue & Safety Guards
- [ ] **Applications Queue**:
  - Log in as the Project Owner. Navigate to **Manage Workspace** on the project.
  - In **Applications Queue** card, locate Student A's pending application.
- [ ] **Safeguarded Profile Previews**:
  - Click on Student A's name to view profile summary details.
  - Verify it displays name, department, year, skills, headline, interests, learning goals, summary, and public social URLs.
  - **CRITICAL PRIVACY AUDIT**: Verify that **no** private college emails, phone numbers, WhatsApp links, or database UUIDs are shown or leaked in the HTML.
- [ ] **Owner Reject Decision**:
  - Click **Reject** next to an application. The modal should prompt for response reasons.
  - Type a decline reason and click Submit.
  - Verify the application status updates, and **no** team member roster row is created.
  - Log in as the rejected student. Verify that in **My Applications**, the request is labelled `"rejected"` and displays the owner's custom comment. Verify you can cleanly apply again.
- [ ] **Owner Accept & Roster Upgrade**:
  - Log in as Student B. Submit a join request.
  - Log in as Owner. Open workspace. Click **Accept** next to Student B's application.
  - Type a welcome comment and click Submit.
  - Verify:
    * Application status is updated to `"accepted"`.
    * A new active team member row for Student B is inserted in `project_team_members`.
    * `current_team_size` is incremented.
    * The corresponding role's `slots_filled` is incremented.
- [ ] **Capacity Over-limit Shield**:
  - Simulate a full team (e.g. set max size to 2 and add a member).
  - Attempt to accept another application.
  - Verify that the action is blocked, showing a warning: `"Cannot accept: Project team has reached maximum capacity."`

### 5. Private Coordination & Workspace Views
- [ ] **Public / Non-Member Privacy Protection**:
  - Log in as Student C (non-member, non-owner).
  - Inspect the project card and project details.
  - **CRITICAL SECURITY AUDIT**: Verify that `coordination_link`, `github_repo_url`, `shared_doc_url`, and `private_notes` are **completely hidden and return null** (non-accessible).
- [ ] **Teammate Secure Coordination access**:
  - Log in as Student B (accepted member). Go to the project workspace Overview.
  - Verify that the **Secure Team Coordination** credentials card is fully visible, displaying active coordination meeting link, GitHub repository link, shared document link, and team tasks notes.
  - Verify that Student B does **not** see "Edit Credentials" button.

### 6. Team Exits & Management
- [ ] **Member Voluntary Leave**:
  - Log in as Student B (accepted member). Go to workspace.
  - Click **Leave Team**. The modal should prompt for leave reasons.
  - Type a reason and submit.
  - Verify:
    * Student B's roster listing shows `"Left / Removed"` with `left_at` timestamp.
    * `current_team_size` is decremented.
    * Role `slots_filled` is decremented.
    * Student B loses workspace access immediately, and can request to join again cleanly.
- [ ] **Owner Kick Member**:
  - Log in as Project Owner. Open roster.
  - Click **Kick** next to Student B. Modal prompts for removal reason.
  - Type a reason and submit.
  - Verify:
    * Roster record shows `"Left / Removed"`.
    * Team counts and role slots decrement safely.
    * Student B loses access and can re-apply in the future.
  - Verify that the project owner **cannot** kick themselves.


### 7. Supabase RLS Verification & Debugging Queries

Run these diagnostics in the Supabase SQL Editor to audit active team status, RLS policies, and bootstrapped owner records:

```sql
-- 1. Audit active project listings
select id, title, created_by, current_team_size, max_team_size, status
from public.project_posts
order by created_at desc
limit 5;

-- 2. Audit team members active slots and bootstrapped owners
select project_id, user_id, role_name, left_at
from public.project_team_members
order by created_at desc
limit 10;

-- 3. Audit open positions and slots filled counts
select role_name, slots_needed, slots_filled
from public.project_roles
order by created_at desc
limit 10;

-- 4. Verify no infinite recursion in project_team_members SELECT policy
-- (Should execute cleanly without stack depth limit exceeded exceptions)
select * from public.project_team_members limit 5;
```


