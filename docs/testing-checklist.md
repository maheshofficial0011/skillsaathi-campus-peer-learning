# SkillSaathi Phase 3.5 - Manual Testing Checklist

Use this checklist to perform regression testing and ensure full readiness of all SkillSaathi modules before proceeding to Phase 4 (Senior Connect).

---

## Ã°Å¸â€�ï¿½ 1. Authentication & Route Protection
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

## Ã°Å¸â€˜Â¤ 2. Profile Page & Completeness Card
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

## Ã°Å¸Â¤ï¿½ 3. Peer Help Requests Board
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

## Ã°Å¸â€™Â¬ 4. Anonymous Doubts Module
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

## Ã°Å¸â€œÂ± 5. Mobile Responsiveness Polish
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

## Ã¢Å“ï¿½Ã¯Â¸ï¿½ 6. Doubt Answer & Reply Edit / Delete

> **Requires Supabase patch**: Run `supabase/phase3-answer-reply-edit-delete-patch.sql` in the SQL Editor before testing.

- [ ] **Edit own answer**: Post an answer. Click **Edit** Ã¢â€ â€™ modify text Ã¢â€ â€™ **Save Answer**. Verify success toast and `(edited)` label appears.
- [ ] **Cancel edit**: Click **Cancel**. Verify original text restored with no API call.
- [ ] **Delete own unaccepted answer**: Delete an unaccepted/unpinned answer. Confirm dialog. Verify it disappears, counters update, toast fires.
- [ ] **Delete blocked for accepted answer**: Verify no **Delete** button; hint `"Accepted Ã¢â‚¬â€� cannot delete"` shown.
- [ ] **Delete blocked for pinned answer**: Verify no **Delete** button; hint `"Pinned Ã¢â‚¬â€� cannot delete"` shown.
- [ ] **Edit own reply**: Click **Edit** on own reply Ã¢â€ â€™ modify Ã¢â€ â€™ **Save**. Verify toast and `(edited)` label.
- [ ] **Delete own reply (not pinned)**: Confirm dialog. Verify reply removed, count decremented, toast fires.
- [ ] **Delete blocked for pinned reply**: Reply author sees `"Pinned Ã¢â‚¬â€� cannot delete"` instead of Delete button.
- [ ] **Other users cannot edit/delete**: Log in as a different user Ã¢â‚¬â€� no Edit/Delete buttons on others' answers or replies.

---

## Ã°Å¸â€œÅ’ 7. Reply Pinning

> **Requires Supabase patch**: Run `supabase/phase3-answer-reply-edit-delete-patch.sql`.

- [ ] **Doubt creator can pin a reply**: Click **Ã°Å¸â€œÅ’ Pin** on a reply Ã¢â€ â€™ success toast Ã¢â€ â€™ `Ã°Å¸â€œÅ’ Pinned` amber badge appears.
- [ ] **Pinned reply floats to top**: Pinned reply appears before all un-pinned replies in the thread.
- [ ] **Multiple pinned replies allowed**: Pin two replies. Both appear at the top with amber badges.
- [ ] **Doubt creator can unpin**: Click **Ã°Å¸â€œÅ’ Unpin** Ã¢â€ â€™ badge disappears, reply sorts normally.
- [ ] **Non-creator cannot pin**: Log in as non-creator Ã¢â‚¬â€� no Pin button in reply action rows.
- [ ] **Closed doubt Ã¢â‚¬â€� no pinning**: Close the doubt. Pin button disappears even for creator.
- [ ] **Sort respects pinned first**: Toggle Ã°Å¸â€�Â¥ Top / Ã°Å¸â€¢â€™ Newest. Pinned replies always stay at the top.
- [ ] **Reply author can edit pinned reply**: **Edit** button still visible; text saves; `(edited)` label appears.

---

## Ã°Å¸â€ºÂ¡Ã¯Â¸ï¿½ 8. Self-Answer Safety

> **Product rule**: Self-answering is allowed. Students can share their own solutions. But it is labelled and does not inflate stats.

- [ ] **Doubt creator can post own answer**: While status is `open` or `answered`, creator submits an answer. Success toast fires.
- [ ] **Own answer shows badge**: Creator's answer shows grey `Ã°Å¸â„¢â€¹ Answered by asker` badge. Other users' answers do NOT show this badge.
- [ ] **Doubt creator cannot rate own answer**: No **Ã¢Â­ï¿½ Rate** button on the creator's own answer. Rating form is inaccessible.
- [ ] **Doubt creator CAN rate other users' answers**: Ã¢Â­ï¿½ Rate button appears on others' answers when status is `answered`/`solved`.
- [ ] **Doubt creator can accept own answer**: Ã¢Å“â€¦ Accept visible on own answer. After accepting: `Ã¢Å“â€¦ Accepted Answer` badge appears, status Ã¢â€ â€™ `solved`.
- [ ] **Own accepted answer does NOT inflate stat**: Go to **My Profile Ã¢â€ â€™ Doubt Contribution**. Accepting own answer should NOT increment `Accepted Answers` count.
- [ ] **External accepted answer DOES increment stat**: The answerer's profile `Accepted Answers` count increases after creator accepts their answer.
- [ ] **Like button hidden for own content**: Ã°Å¸â€˜ï¿½ Like button not shown on own answers or replies. Count is still displayed as read-only text if others liked it.

---

## Ã°Å¸Å½â€œ 9. Phase 4 - Senior Connect Module & Polishes

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
  - Log in with Student Account A. Go to **Senior Connect** Ã¢â€ â€™ **Find Seniors**.
  - Locate Senior Mentor B. Click **Request Guidance**. Prevents requesting self (Senior Mentor B sees request modal blocked for their own profile).
  - Submit request with topic, message, preferred mode, and time. Outgoing request appears in **My Requests** as `Ã¢ï¿½Â³ pending`.
  - Log in as Senior Mentor B. Go to **Senior Connect** Ã¢â€ â€™ **Mentor Dashboard**.
  - In **Incoming Guidance Requests**, locate Student A's request. Click **Accept**.
  - Verify the accept modal prompts for:
    * Message (optional)
    * Meeting Mode (Online / In-Person / Hybrid)
    * Scheduled Time (required text)
    * Meeting/Contact Details (required text)
  - Fill these details and submit. Request moves to accepted.
  - Log back in as Student A. Check **My Requests**.
  - Verify the request shows `Ã¢Å“â€¦ accepted` status and a dedicated **Session Coordination Details** panel appears:
    * Displays selected Mode, Scheduled Time, and a clean copy-paste contact details card showing the Meet link or campus location shared by the senior.
  - Senior marks the session as `completed`. Verify status changes to `Ã°Å¸Å½â€œ completed` and statistics update.

- [ ] **Senior Mentor Impact stats**:
  - Log in as Senior Mentor B. View the **Mentor Dashboard**.
  - Verify that the stats grid lists 6 distinct counters: **Received, Pending, Accepted, Completed, Declined, Completion Rate (%)**.
  - Open the **My Profile** page. Verify a dedicated **Ã°Å¸Å½â€œ Senior Mentor Impact** section is rendered with Completed, Accepted, Pending, Declined, and Completion Rate counters, bio, topics of expertise, availability hours, and preference mode.
  - Click on Senior Mentor B's name from a Doubt post to open their `PublicProfileModal`.
  - Verify a premium **Senior Mentor** card is rendered containing their bio, expertise badges, availability details, and the 3-column stats panel (**Completed, Accepted, Completion Rate %**).
  - Double check that this section does NOT mix with Peer Help trust scores or Doubt rating stats.

- [ ] **Help Request coordination note**:
  - Open the **Peer Help Request** details modal for an accepted help request.
  - If you are either the request creator or the helper, verify that a clean **Next Step: Coordinate Session** guidance tip box is shown right below the people details block, instructing you on how to share links or locations based on the chosen mode.

---

## Ã°Å¸Å½â€œ 10. Phase 4.5 - Senior Connect Reputation & Safety Polish

> **Requires Supabase patches**: Run `supabase/phase4-contact-privacy-patch.sql` and `supabase/phase4-senior-reviews-safety-patch.sql` in the SQL Editor.

- [ ] **Mentor Status Availability Settings**:
  - Log in as a Senior Mentor. Go to the **Mentor Dashboard**, click **Edit**.
  - Locate the **Mentor Status** select dropdown (Accepting / Busy / Unavailable).
  - Select `Unavailable` and click **Save**.
  - Log in as a different student. Browse the mentor in **Find Seniors**.
  - Verify that the card displays a clear `Unavailable` badge, a warning message `"Ã¢Å¡Â Ã¯Â¸ï¿½ This mentor is not accepting requests right now"`, and the **Request Guidance** button is completely disabled.
  - Log back in as the mentor, change status to `Busy`, and save.
  - Log in as the student, verify the card displays a `Busy` badge, shows a warning `"Ã¢Å¡Â Ã¯Â¸ï¿½ Mentor is busy; response may be delayed"`, but the **Request Guidance** button is ENABLED and allows requests.
  - Set status to `Accepting`. Verify normal behavior.

- [ ] **Guidance Feedback (Ratings & Reviews)**:
  - Log in as Student A. Once a guidance session with Senior B is marked as `completed`, locate the request in **My Requests**.
  - Verify a **Ã¢Â­ï¿½ Give Mentor Feedback** button is visible.
  - Click it. The **Rate Guidance Session** modal should open, showing:
    * 1Ã¢â‚¬â€œ5 star selectors (rating > 0 validation constraint).
    * Helpfulness Yes / No toggle buttons.
    * Comments textbox.
  - Select 5 stars, click "Yes, helpful", write a comment, and submit. Verify success toast.
  - The button should now change to **Ã¢Å“ï¿½Ã¯Â¸ï¿½ Edit Review** and show a `Ã¢Å“â€œ Reviewed` badge.
  - Click **Ã¢Å“ï¿½Ã¯Â¸ï¿½ Edit Review**, change rating or comment, and save. Verify success toast.
  - Try logging in as the senior (Senior B). Try to review your own session. Verify RLS and UI prevent seniors from reviewing their own sessions.

- [ ] **Public Profile Reviews Grid**:
  - Open Senior B's **Public Profile Modal** from a post or card.
  - Verify that the profile displays the cumulative **Average Mentor Rating** (e.g. `Ã¢Â­ï¿½ 5.0`) and the **Guidance Reviews** count.
  - Verify that a list of **Recent Guidance Reviews** is rendered.
  - Verify that each review item is strictly anonymous, showing `"Anonymous Junior"` instead of student name/email/UUID.
  - Verify that the recent reviews list is capped at a maximum of the 3 most recent records.
  - Verify that these mentor guidance stats remain completely segregated from Peer Help trust scores and Doubt ratings.

- [ ] **Duplicate Active Request Prevention**:
  - Log in as Student A. Send a guidance request to Senior B.
  - While that request is still `pending` or `accepted`, try to send another guidance request to Senior B.
  - Verify that both the API check and the database index constraint block the duplicate request, showing a clear warning toast `"You already have an active guidance request with this senior"`.

---

## Ã¢Â­ï¿½ 11. Phase 4.6 - Review Display & Mentor Review Management Polish

- [ ] **Mentor Dashboard Received Reviews**:
  - Log in as a Senior Mentor who has received reviews from juniors.
  - Navigate to **Senior Connect** -> **Mentor Dashboard** (Tab 3).
  - Verify that a dedicated **Ã¢Â­ï¿½ Reviews Received** section is visible.
  - Check that if there are no reviews, a clean empty state card is displayed: `"No mentor reviews yet. Complete guidance sessions to receive reviews."`
  - If reviews exist, verify that each review card contains:
    * Reviewer's real public name (e.g. `Jane Doe`), department, and year of study (due to the completed guidance session connection).
    * Rating stars (1Ã¢â‚¬â€œ5).
    * Helpfulness badge (`Ã°Å¸â€˜ï¿½ Helpful`).
    * Guidance request topic (e.g. `Resume Review`).
    * Date and comment content.
  - Verify that reviewer email and reviewer UUID are strictly HIDDEN and not leaked.
  - Click **View Profile** on a review card. Verify that the `PublicProfileModal` for the junior opens correctly.

- [ ] **Public Profile Modal Refactored Reviews**:
  - Open any user's public profile modal (who is a senior mentor with > 3 reviews).
  - Verify that reviews are organized into two separate compact sections: **Senior Guidance Reviews** and **Peer Help Reviews**.
  - Verify that **Senior Guidance Reviews** are strictly anonymous, showing `"Anonymous Junior"` as the reviewer, and never leak email, UUID, phone, or WhatsApp details.
  - Verify that reviews in both sections are sorted by quality (best-first):
    1. Rating (1Ã¢â‚¬â€œ5) descending.
    2. Helpful (`true`) first.
    3. Created_at date descending.
  - Verify that both sections initially display a maximum of `3` reviews.
  - If a section has more than 3 reviews, verify that a **Show more peer reviews** / **Show more mentor reviews** button is visible.
  - Click the show more button. Verify the list expands to show all reviews in that section, and the button text changes to **Show fewer reviews**.
  - Click **Show fewer reviews**. Verify the list collapses back to 3 reviews.

- [ ] **User's Own Profile Page (ProfilePage) Review Summaries**:
  - Log in and navigate to **My Profile**.
  - Locate the **Senior Mentor Impact** card.
  - Verify that a **Ã¢Â­ï¿½ Top Received Mentor Reviews** section is rendered.
  - Check that it lists up to the top 3 best mentor reviews (sorted quality-first) anonymously.
  - Verify that if you have more than 3 reviews, a footnote is displayed: `"Ã°Å¸â€™Â¡ View all received mentor reviews in Senior Connect dashboard."`

- [ ] **Reputation Systems Separation**:
  - Verify that there is no combined global score or mixed ratings:
    * **Peer Help Reviews** use a 1-5 star scale (Trust Score %).
    * **Senior Guidance Reviews** use a separate 1-5 star scale (Average Mentor Rating).
    * **Doubt Contribution Ratings** use a 1-10 scale (Average Doubt Answer Rating).
  - Double check that doubt scores or peer help ratings never leak into the senior mentor rating averages, keeping the three modules strictly independent.

---

## Ã°Å¸â€œË† 12. Phase 4.7 - Final Pre-Phase-5 Stability & Review UX Polish

- [ ] **My Profile Toggles & Counters**:
  - Go to **My Profile** tab.
  - Verify **Peer Help Reviews (N)** header displays the compact count of reviews.
  - Verify reviews sort quality-first (`rating desc Ã¢â€ â€™ helpful true first Ã¢â€ â€™ created_at desc`).
  - Verify Peer Help reviews cap at `3` initially with an independent **Show more reviews** / **Show fewer reviews** button.
  - Verify **Ã¢Â­ï¿½ Top Received Mentor Reviews (N)** header displays the compact count of reviews.
  - Verify Mentor reviews cap at `3` initially with an independent **Show more reviews** / **Show fewer reviews** button and the redirection footnote.
  - Verify empty states `"No peer help reviews yet"` and `"No senior guidance reviews yet"` render nicely when there are no reviews.

- [ ] **Mentor Dashboard Reviews Capping & Counters**:
  - Open **Senior Connect** Ã¢â€ â€™ **Mentor Dashboard** (Tab 3).
  - Verify header displays **Ã¢Â­ï¿½ Reviews Received (N)** with total received reviews count.
  - Verify the list of reviews is sorted best-first.
  - Verify the list caps at `5` initially with a local **Show more reviews** / **Show fewer reviews** button.
  - Verify that clicking the button expands the list locally to show all received reviews.

- [ ] **In-Page Review Refresh**:
  - As a student, navigate to **Senior Connect** Ã¢â€ â€™ **My Requests**.
  - Rate a completed session (submit or edit feedback).
  - Submit the form. Verify that the request status, review badges, and any active dashboard reviews lists are immediately updated in-place without requiring a browser reload.

- [ ] **Contact Privacy & Warning Copy**:
  - Edit your profile and go to the **Private Contact Sharing Settings** section.
  - Verify the explicit gating warnings are displayed:
    * `"Ã°Å¸â€�â€™ Only visible after an accepted/completed connection."`
    * `"Ã¢Å“â€œ Only contact methods enabled by the user are shown."`
    * `"Ã°Å¸Å¡Â« Private contact is never shown on public profiles."`
  - Open an accepted help request coordinate modal or guidance request coordination card.
  - Verify that the shared contact details card displays the same explicit gating warning copy consistently.

- [ ] **Request Workflow Descriptions & Warnings**:
  - Verify that request status cards display status-specific descriptive workflow notes:
    * **Pending**: `"Ã¢ï¿½Â³ Waiting for mentor response."` or `"Ã¢ï¿½Â³ Waiting for your response."`
    * **Accepted**: `"Ã¢Å“â€¦ Session coordination is available below."` or `"Ã¢Å“â€¦ Session coordination is active below."`
    * **Completed**: `"Ã°Å¸Å½â€œ Guidance completed. You can review this mentor."` or `"Ã°Å¸Å½â€œ Guidance completed."`
    * **Declined**: `"Ã¢ï¿½Å’ Mentor declined this request."` or `"Ã¢ï¿½Å’ You declined this request."`
    * **Cancelled**: `"Ã°Å¸Å¡Â« You cancelled this request."` or `"Ã°Å¸Å¡Â« Student cancelled this request."`
  - Verify duplicate requests show descriptive info: `"Ã¢â€žÂ¹Ã¯Â¸ï¿½ You already have an active request with this mentor. New requests are allowed after completed, cancelled, or declined sessions."`

---

## Ã°Å¸â€�Âµ 13. Phase 5 Ã¢â‚¬â€� Learning Circles Module

### Circle Discovery & Filters
- [ ] **Discover Circles Tab**:
  - Navigate to Learning Circles Ã¢â€ â€™ Discover tab.
  - Verify search bar filters circles by title, description, category, and department.
  - Verify Category, Difficulty, and Meeting Mode dropdowns filter results correctly.
  - Verify "X circles found" count updates dynamically.
  - Verify each circle card shows: title, description, category badge, difficulty badge, meeting mode, member count/max, and creator name.
  - Verify "View Details" button opens the Circle Workspace in Overview tab.

### Circle Creation
- [ ] **Create Circle Modal**:
  - Click "Start a Circle" button.
  - Leave Title blank Ã¢â€ â€™ submit Ã¢â€ â€™ verify inline error "Title is required."
  - Enter a Title shorter than 5 chars Ã¢â€ â€™ verify "Title must be at least 5 characters."
  - Enter Description shorter than 20 chars Ã¢â€ â€™ verify "Description must be at least 20 characters."
  - Enter Max Members = 1 Ã¢â€ â€™ verify "Max members must be between 2 and 100."
  - Enter Meeting Location as `http://insecure.com` Ã¢â€ â€™ verify error about https://.
  - Enter Meeting Location as plain text "Room 203 Block B" Ã¢â€ â€™ verify accepted (no error).
  - Enter Meeting Location as `https://meet.google.com/xyz` Ã¢â€ â€™ verify accepted.
  - Fill all fields correctly Ã¢â€ â€™ submit Ã¢â€ â€™ verify success toast "Circle Created! Ã°Å¸Å½â€°".
  - Verify circle appears in "My Circles" tab with "Ã°Å¸â€˜â€˜ Owner" badge.
  - Verify workspace opens automatically after creation.

### Join & Leave
- [ ] **Join Circle**:
  - As a different user, find an active public circle.
  - Click "+ Join" Ã¢â€ â€™ verify success toast "Joined! Ã°Å¸Å½â€°".
  - Verify "Ã¢Å“â€œ Joined" badge appears on card.
  - Verify "Open Workspace" button replaces "Join" button.
  - Try joining again Ã¢â€ â€™ verify error "You are already a member of this circle."
  - Set max_members to current count Ã¢â€ â€™ try to join Ã¢â€ â€™ verify "This circle is full." error.
  - Archive the circle Ã¢â€ â€™ try joining Ã¢â€ â€™ verify "This circle is not accepting new members right now." error.

### Leave Circle
- [ ] **Leave Circle**:
  - As a member (non-owner), click "Leave" button.
  - Verify "Left Circle" success toast.
  - Verify "Join" button reappears on the card.
  - As the owner, verify no "Leave" button is shown (only "Open Workspace" action).

### Circle Workspace
- [ ] **Overview Tab**:
  - Open a circle workspace Ã¢â€ â€™ verify Overview shows description, category, difficulty, mode, schedule, location/link, creator, created date, member count, visibility.
  - If location is a URL (https://), verify it renders as a clickable link.
  - If location is plain text, verify it renders as text.
  - If archived/paused, verify amber warning banner appears.
  - If not a member, verify "You are not a member yet" info box appears.

- [ ] **Members Tab**:
  - Open Members tab Ã¢â€ â€™ verify all members are listed with name, department, year, join date.
  - Verify Owner has "Ã°Å¸â€˜â€˜ Owner" badge, others have "Member" badge.
  - Verify names do not expose raw UUIDs or emails.

- [ ] **Resources Tab**:
  - As a member, click "Share a Resource".
  - Submit with empty Title Ã¢â€ â€™ verify "Title is required."
  - Enter URL as `http://insecure.com` Ã¢â€ â€™ verify "URL must use https:// protocol" error.
  - Enter URL as `javascript:alert(1)` Ã¢â€ â€™ verify blocked with https error.
  - Enter URL as `https://youtube.com` Ã¢â€ â€™ verify accepted.
  - Verify resource appears in list with type icon, title, uploader name, relative timestamp.
  - Verify uploader can delete their own resource (trash icon visible).
  - Verify owner can also delete any resource.
  - Verify non-uploader non-owner sees no delete icon.
  - As an archived circle member, verify "Share a Resource" form is hidden.

- [ ] **Discussion Tab**:
  - As a member, post a message with type "Update".
  - Verify post appears at top with author name, time, type badge.
  - Post with type "Question", "Plan", "Announcement" Ã¢â€ â€™ verify different badge colors.
  - Verify post author can delete their own post.
  - Verify circle owner can delete any post.
  - Verify non-author non-owner cannot see delete icon on others' posts.
  - As an archived circle member, verify post form is hidden.

### Archive / Restore
- [ ] **Archive Circle (Owner only)**:
  - In workspace header, click "Ã°Å¸â€œÂ¦ Archive".
  - Verify success toast "Circle Archived".
  - Verify workspace header shows "archived" badge.
  - Verify "Archived" status badge appears on circle card.
  - Verify Join button is hidden on archived circles.
  - Verify post form and resource form are hidden in workspace.
  - Click "Ã¢â„¢Â» Restore" Ã¢â€ â€™ verify "Circle Restored" toast and active status restored.

### Profile Integration
- [ ] **My Profile Ã¢â‚¬â€œ Learning Circles Count**:
  - After joining 1+ circles, navigate to My Profile.
  - Verify "Ã°Å¸â€�Âµ Learning Circles" section appears below Doubts section.
  - Verify the count displayed matches the number of circles joined/owned.
  - Verify the section is hidden if user has 0 circles.

### Security & Privacy
- [ ] **URL Safety**:
  - Attempt to share a resource with URL `javascript:void(0)` Ã¢â€ â€™ blocked.
  - Attempt to share a resource with URL `data:text/html,...` Ã¢â€ â€™ blocked.
  - Attempt to share a resource with URL `file:///etc/passwd` Ã¢â€ â€™ blocked.
  - Attempt to share a resource with URL `https://drive.google.com/...` Ã¢â€ â€™ accepted.
- [ ] **No Private Data Leaks**:
  - Verify no UUID, email, or phone number is displayed anywhere in the Learning Circles module.
  - Verify all member names resolve to full_name from profiles join.

---

## Ã°Å¸â€�Âµ 14. Phase 5.1 Ã¢â‚¬â€� Learning Circle Secure Resource Uploads & Owner Status Lock

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
  - Once complete, verify that a success toast "File Uploaded! Ã°Å¸Å¡â‚¬" is shown, and the new resource appears in the list with a beautiful "Ã°Å¸â€™Â¾ [Size]" badge, original uploader name, and secure preview/download actions.

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
  - Select **Ã°Å¸Å¸Â¡ Pause Uploads** status.
  - Switch to the Resources tab as the Owner or a normal Member.
  - Verify that the "+ Share a Resource" button and form are replaced by: `"Ã°Å¸â€�â€™ Resource uploads are disabled because this circle is currently paused."`
  - Verify that discussions and announcements still remain active.
  - Select **Ã°Å¸â€œÂ¦ Archive** status.
  - Verify that both the resource upload form AND the discussion post forms are completely hidden.

### Secure Role Capabilities
- [ ] **Role Guidelines Split Card**:
  - Go to the Overview tab of any circle.
  - Verify the split Capability Guidelines card displays clear details for Circle Owner and Circle Member permissions.
- [ ] **Safe Resource Deletion**:
  - Verify that Owners can delete *any* resource (link or file) by clicking the trash icon.
  - Verify that normal Members can *only* delete resources they uploaded themselves, and see no trash icons on others' resources.
  - Verify that when a file resource is deleted, it is securely deleted from the private Supabase Storage bucket first before removing the row from PostgreSQL.


## Ã°Å¸â€�Âµ 15. Phase 5.2 Ã¢â‚¬â€� Learning Circle Join Requests & Member Profile Verification

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
  - Verify that a success toast `"Request Submitted! Ã¢Å’â€º"` is shown, the modal closes, and the button changes to `"Ã¢Å’â€º Pending (Cancel)"`.
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
  - Verify that a success toast `"Application Approved! Ã°Å¸Å½â€°"` is shown, and the request is removed from the list.
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


## Ã°Å¸Å’Å¸ Phase 5.3: Learning Circle Workflow Rules, Owner Management, Resource Ranking Polish

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
  - Verify that the **Owner** is strictly pinned at the very top of the list with a `"Ã°Å¸â€˜â€˜ Owner"` badge.
  - Verify that all other members are sorted strictly **alphabetically** by their public full name.
- [ ] **Member Removal**:
  - As the Owner, locate a standard member on the roster.
  - Click the **Ã¢ï¿½Å’ Remove** button next to their name and confirm the browser alert.
  - Verify that the member is removed from the roster instantly, and the member count is decremented.
  - Log in as the removed member. Verify that you have lost access to the workspace, resources, and discussions, and can now cleanly submit a new join request.

### 4. Resource Pinning & Likes Interaction
- [ ] **One Like Per User Constraint**:
  - Open the **Resources** tab as a member.
  - Locate a resource and click the **Ã°Å¸Â¤ï¿½ Like** button. Verify that the like count is incremented and the button changes to `Ã¢ï¿½Â¤Ã¯Â¸ï¿½ Liked`.
  - Click the button again. Verify that it unlikes the resource, decrementing the count back to 0.
- [ ] **Owner-only Resource Pinning**:
  - As a circle owner, locate a resource. Click **Ã°Å¸â€œÅ’ Pin**.
  - Verify that a vibrant `Ã°Å¸â€œÅ’ PINNED` badge is rendered, and the resource is instantly ranked at the very top of the list.
  - Verify that regular members **do not** see the pin/unpin action button.
- [ ] **Resource Paging / Pagination**:
  - Upload 4 or more study resources.
  - Verify that initially only the top 3 resources are rendered.
  - Verify that a **Ã¢Å¾â€¢ Show more resources** button is rendered at the bottom of the list.
  - Click the button. Verify that the list expands to show all remaining resources, and is replaced by a **Ã¢Å¾â€“ Show fewer resources** button to collapse it back.
## Ã°Å¸Å’Å¸ Phase 5.4: Learning Circle Exit Workflow & Resource Verification System

### 1. Leave Study Circle Exit Form
- [ ] **Departing Member Flow**:
  - Log in as a regular member of a circle.
  - On the circle card (Discover/My Circles), click the **Leave** button.
  - Verify that a premium looking **Leave Circle: [Circle Name]** modal is rendered.
  - Select a reason (e.g., "Completed learning goal") and type an optional message: `"Thanks for the great DSA discussions!"`.
  - Click **Ã°Å¸Å¡Âª Leave Study Circle** and confirm the success toast.
  - Verify that you are instantly removed from the circle, loss of workspace access is immediate, and you can now request to join again cleanly.
  - Verify that the owner **does not** see the old accepted request as `"Repair Needed"`.

### 2. Owner Remove Member custom form
- [ ] **Roster Removal Flow**:
  - As the Owner, navigate to the **Members** tab.
  - Click the **Ã¢ï¿½Å’ Remove** button next to a standard member.
  - Verify that a premium looking **Remove Member: [Member Name]** modal is rendered.
  - Choose a reason (e.g., "Inactive member") and write a message: `"No updates in over 2 weeks. Removing to open slots."`.
  - Click **Ã°Å¸Å¡Â« Remove Member** and confirm the success toast.
  - Verify that the roster is updated, and the member loses access.
  - Log in as the removed student. Verify that you can cleanly request to join again, and see the owner's custom removal reason.

### 3. Member Submitted Resources Dashboard
- [ ] **Pending upload flow**:
  - Log in as a regular member of an active circle.
  - Click **+ Share a Resource / File** under the **Resources** tab.
  - Type a secure URL in link mode (e.g., `https://google.com/notes`). Note the live formatting verification alert.
  - Click **Share Resource**. Verify the success toast: `"Your shared material has been sent to the circle owner for verification."`
  - Verify that the link is **not** displayed in the Main Library Resources list yet.
  - Locate the **My Submitted Resources** panel. Verify that the link is listed with an orange `Ã¢ï¿½Â³ Pending` badge.

### 4. Owner Resource Verification Console & Safety Check
- [ ] **Resource Approval Flow**:
  - Log in as the Owner of the circle. Open the **Resources** tab.
  - Locate the **Resource Verification Queue** console. Verify that the member's pending link is listed with uploader name, shared date, link coordinates, safety formats, and Decline/Approve buttons.
  - Click **Ã¢Å“â€¦ Approve Only**. Verify that the resource is removed from the verification queue and added to the **Main Library Resources** list with a success toast.
- [ ] **Safety warning triggers**:
  - Log in as a member. Submit a resource URL targeting an executable file (e.g., `https://example.com/malicious.exe`).
  - Log in as the Owner. Locate the item in the verification queue.
  - Verify that a prominent amber safety warning is displayed: `"This link targets a file type (.exe) that can be executed."`
  - Click **Ã¢ï¿½Å’ Decline & Reject**.
  - Verify that a custom modal prompts you for a rejection reason.
  - Type `"Executable file formats are blocked for security."` (must be at least 5 chars). Click **Decline Material**.
  - Log in as the member. Locate the item in **My Submitted Resources**. Verify that it has a red `Ã¢ï¿½Å’ Rejected` badge and displays the owner's feedback reason inline.

### 5. Roster Aggregate Stats and Owner Recommendation Ranking
- [ ] **Members stats display**:
  - Open the **Members** tab as a member.
  - Verify that each member card displays inline aggregate metrics, e.g., `Shared: 2 | V: 1 | P: 1 | R: 0`.
- [ ] **Star Recommendation Rank**:
  - As the Owner, locate a verified resource in the main library list.
  - Click **Ã¢Â­ï¿½ Recommend**. Verify that a premium blue `Ã¢Â­ï¿½ RECOMMENDED` badge is rendered, and the resource is sorted directly above likes/newest (pinned is still at the absolute top).
  - Regular members see the badge, but **cannot** toggle the recommendation status.

## Ã¢Å¡â„¢Ã¯Â¸ï¿½ Phase 5.4A: Leave Lifecycle Tracking and Old Accepted Request Cleanup

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
  - Verify the application goes to pending status, and displays `"Ã¢Å’â€º Pending (Cancel)"` to block duplicates.

## Ã°Å¸â€™Å½ Phase 5.5: Learning Circles Final Polish & Stability Checklist

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
  - Verify that the rejected resource remains visible strictly inside **My Submitted Resources** dashboard panel, showing a red `Ã¢ï¿½Å’ Rejected` badge and the owner's custom rejection feedback reason.
  - Verify that this rejected resource is completely invisible inside the **Main Library Resources** view.
- [ ] **Empty Active Queue State**:
  - As the Owner, verify that if there are no pending resources waiting for review, the verification console renders a clean status label: `"No resources waiting for verification."`

### 2. Workspace Roster & Spacing Details
- [ ] **Owner Roster Priority**:
  - Open the **Members** tab in the circle workspace.
  - Verify that the Owner is strictly displayed at the very top of the list with a `"Ã°Å¸â€˜â€˜ Owner"` badge.
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
  - Open the verified resources list. Verify that every resource renders a green `"Ã¢Å“â€¦ Verified by Owner"` badge.
  - Verify that owner-pinned resources render `"Ã°Å¸â€œÅ’ Pinned"` and owner-recommended resources render `"Ã¢Â­ï¿½ Owner Recommended"`.
  - Verify that likes display in a clean `"Ã°Å¸â€˜ï¿½ X likes"` button format.
- [ ] **Resource Slicing and Expansion Toggles**:
  - Verify that if there are 4 or more verified resources, only the first 3 are rendered, with smooth `Ã¢Å¾â€¢ Show more resources` and `Ã¢Å¾â€“ Show fewer resources` buttons to toggle expansion.
- [ ] **Resource Sorting Hierarchy**:
  - Verify resources are ranked in the following exact hierarchy: `Pinned first -> Recommended second -> Likes count third -> Newest first`.

### 4. Meeting Privacy & Clipboard Copy Controls
- [ ] **Meeting Details Access Rights**:
  - Log in as a non-member. Verify that no meeting coordinates or credentials are shown on discover cards or non-member views.
  - Log in as a member. Verify that the credentials card is titled `"Members-only meeting details"`.
  - Verify that if meeting details are empty, the coordinates container displays: `"Meeting details will be shared by the owner."`
- [ ] **Clipboard Copy Triggers**:
  - Click the **Copy (Ã°Å¸â€œâ€¹)** button next to the meeting link. Verify that it copies the URL to your clipboard and fires a success toast: `"Meeting link copied to clipboard."`
  - Click the **Copy (Ã°Å¸â€œâ€¹)** button next to the meeting password. Verify that it copies the passcode to your clipboard and fires a success toast: `"Meeting password copied to clipboard."`

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
  - Verify that the join button is active but displays a clear warning: `"Full Ã¢â‚¬â€� owner must increase capacity before accepting."`
  - Verify that the join application is still allowed to be sent to the owner, but the owner is blocked from accepting until they increase maximum capacity.
- [ ] **Request Again Verification**:
  - After a member intentionally leaves or is removed, verify that the Discover card join button displays `"Request Again"` and lets the student re-apply.

---

## Ã°Å¸â€”Â£Ã¯Â¸ï¿½ Phase 5.6: Professional Discussion Board, Moderation, Presence System & UX Polish

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
  - Click `Ã¢Å¾â€¢ New Post`. Verify the composer modal opens.
- [ ] **Post Type Selection**:
  - Verify the post type dropdown includes: `Ã°Å¸â€œÂ¢ Discussion`, `Ã¢ï¿½â€œ Question`, `Ã°Å¸â€œÂ£ Announcement` (owner only), `Ã°Å¸â€œâ€¦ Study Plan`.
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
  - As the owner, soft-delete a post. Verify the post renders a dashed placeholder: `"Ã°Å¸Å¡Â« This post was removed by the owner."` instead of disappearing from the list.

### 5. Question Resolution
- [ ] **Mark Resolved**:
  - Create a `question` type post. Verify the `Ã¢Å“â€¦ Mark Resolved` button is present.
  - Click it. Verify the post card shows a `Ã¢Å“â€¦ Resolved` badge.
- [ ] **Filter by Resolved State**:
  - In the filter bar, select the `Ã¢ï¿½â€œ Questions` post type. Verify a new filter dropdown appears: `All Questions`, `Ã¢ï¿½â€œ Open / Unresolved`, `Ã¢Å“â€¦ Resolved Only`.
  - Toggle between states. Verify only matching posts appear in the list.

### 6. Post Pinning & Helpful Reactions
- [ ] **Owner Pin Post**:
  - As the circle owner, click the pin action on a post. Verify the post moves to the top of the list and shows a `Ã°Å¸â€œÅ’ Pinned` indicator.
- [ ] **Helpful Reaction**:
  - Click `Ã°Å¸â€˜ï¿½ Helpful` on a post. Verify the count increments.
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
  - If the post author is logged in concurrently, verify a small animated green dot Ã°Å¸Å¸Â¢ appears on their avatar.

### 8. Search & Filter Controls
- [ ] **Search Input**:
  - Type a keyword in the search box. Verify only matching posts (by title or body) are shown.
  - Clear the search. Verify all posts return.
- [ ] **"My Posts" Toggle**:
  - Click `Ã°Å¸â€˜Â¤ My Posts`. Verify only posts by the current user are shown.
- [ ] **Paused/Archived Read-Only Banner**:
  - As the owner, change the circle status to `Paused` or `Archived`.
  - Navigate to the Discussion tab. Verify the amber banner `"Ã°Å¸â€�â€™ Discussions are read-only because this circle is currently paused/archived."` appears.
  - Verify the `Ã¢Å¾â€¢ New Post` button is hidden while in this state.

### 9. Lightweight Presence Bar
- [ ] **Bar Renders for Members**:
  - As an accepted member, open a circle workspace. Verify the presence bar appears between the tab navigation and the tab content area.
- [ ] **Presence Counts**:
  - Verify the bar shows: Ã°Å¸Å¸Â¢ X online Ã‚Â· Ã°Å¸Å¸Â¡ Y recently active Ã‚Â· Ã¢Å¡Â« Z offline.
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

## Ã°Å¸â€œâ€¹ Phase 5.6B Ã¢â‚¬â€� Discussion Auto-Cleanup & Deletion Lifecycle

### 1. Deleted Post Placeholder (4-Hour Window)
- [ ] **Soft delete a post** as the author or owner. Verify:
  - The post's content (title, body, tags) is immediately hidden.
  - A `Ã°Å¸Å¡Â« This post was deleted by the author.` or `This post was removed by the owner.` placeholder appears.
  - The placeholder shows `Visible for a few hours for context Ã‚Â· <relative time>`.
  - No helpful button, reply button, edit/delete actions, pin, or resolve controls are shown on the placeholder.
- [ ] **Confirm delete modal** reads:  
  `"This will soft-delete the post. The content will be hidden immediately. A placeholder will remain visible for up to 4 hours for context, then disappear automatically. The record is retained for moderation."`
- [ ] **Success toast** after deletion reads:  
  `"The post was removed. A placeholder will appear for up to 4 hours for context, then disappear automatically."`

### 2. Deleted Reply Placeholder (4-Hour Window)
- [ ] **Delete a reply** in the threaded drawer. Verify:
  - The reply body, helpful buttons, and edit/delete actions are immediately hidden.
  - A `Ã°Å¸Å¡Â« This comment was deleted by the author.` or `removed by the owner.` placeholder appears.
  - The placeholder shows `Visible temporarily for context Ã‚Â· <relative time>`.
- [ ] **Success toast** after reply deletion reads:  
  `"The comment was removed. A placeholder will appear for up to 4 hours for context, then disappear automatically."`

### 3. Automatic Expiry (After 4 Hours)
- [ ] Simulate an expired deletion by temporarily editing `isDeletedRecently` to use a 0-second window in dev.
  - Verify deleted post/reply placeholders completely vanish from the UI (no empty slot, no placeholder card).
  - Verify the post/reply is absent from `posts` array and `repliesByPost` state after refresh.
- [ ] Verify that expired deleted posts do NOT count in the `Show more/fewer` button count.

### 4. Show More / Fewer Accuracy
- [ ] With >3 visible posts, verify the `Ã¢Å¾â€¢ Show more discussions (N more)` button appears.
- [ ] The count `N` should only include non-deleted posts and placeholders within the 4-hour window.
- [ ] After all posts expire (or only Ã¢â€°Â¤3 remain visible), verify the button disappears entirely.

### 5. Content Safety Ã¢â‚¬â€� No Leakage
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

### 7. Regression Ã¢â‚¬â€� Existing Features
- [ ] Post create, edit, pin, resolve still work correctly.
- [ ] Reply add, edit, helpful reaction still work correctly.
- [ ] Filter by type, search, mine, resolved still work correctly.
- [ ] Reset filters button clears all active filters correctly.
- [ ] Owner badge and You badge still render correctly on non-deleted posts/replies.
- [ ] Real-time presence heartbeat and online dot still function on non-deleted posts.

---

## Ã°Å¸Â¤ï¿½ 15. Phase 6.1 Ã¢â‚¬â€� Find Teammates / Project Mate Finder Core System

> **Requires Supabase Patch**: Run `supabase/phase6-project-mate-finder-core-patch.sql` in the SQL Editor before testing.

### 1. Project Creation Workflow
- [ ] **Create Project Modal validation**:
  - Open **Find Teammates** tab. Click **+ Post Project Board**.
  - Submit title shorter than 5 chars Ã¢â€ â€™ verify warning: `"Title must be at least 5 characters long."`
  - Submit description shorter than 20 chars Ã¢â€ â€™ verify warning: `"Description must be at least 20 characters long."`
  - Set Max Team Size < 2 or > 20 Ã¢â€ â€™ verify validation blocks it.
- [ ] **Role Builder constructor**:
  - Click **+ Add Role Slot**. Define role names, prerequisite skills, slots count, description, and select priority.
  - Verify that leaving optional description or skills empty does not block creation.
- [ ] **HTTPS coordination links validation**:
  - In coordination links, enter `http://google.com/meet` Ã¢â€ â€™ verify warning: `"All external links must strictly use the https:// protocol."`
  - Enter `javascript:alert(1)` or `data:text/html` Ã¢â€ â€™ verify strict validation blocks submission.
  - Enter valid URLs starting with strictly `https://` Ã¢â€ â€™ verify successful creation.
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
  - Enter message shorter than 10 characters Ã¢â€ â€™ submit Ã¢â€ â€™ verify warning: `"Application message must be at least 10 characters."`
  - Enter invalid portfolio URL (e.g. `http://portfolio.com`) Ã¢â€ â€™ verify HTTPS block.
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

---

## Ã°Å¸â€œâ€¹ Phase 6.2 Ã¢â‚¬â€� Project Mate Finder Lifecycle Polish, Discussion Board & Shared Resources

> **Requires Supabase Patch**: Run `supabase/phase6-project-mate-workspace-polish-patch.sql` in the SQL Editor before testing.

### 1. Active-Member Based Privacy Gating
- [ ] **Lock Access Immediately on Exit**:
  - Log in as Student B (accepted member). Verify you can see the **Secure Team Coordination** credentials, read/write to the **Team Discussion**, and access the **Shared Resources** library.
  - Leave the team or have the owner kick you from the roster.
  - Verify that the workspace tab closes instantly and you lose access to all credentials, discussion threads, and resources.
  - Verify that gating is strictly database-driven (requires a `project_team_members` row with `left_at IS NULL`), not just checking if an accepted application exists.

### 2. Role Slot & Team Capacity Enforcement
- [ ] **Apply Modal Capability Checks**:
  - In a project with multiple roles where one is fully staffed (e.g., `slots_filled >= slots_needed`) and others are open:
  - Open the **Submit Join Request** modal.
  - Verify that the fully staffed role is disabled and grayed out in the select dropdown.
  - Verify you can successfully select and apply to any of the remaining open roles.
  - If all roles are fully staffed or the team capacity `max_team_size` is reached, verify that the primary "Submit Application" button is disabled and a clear warning banner is shown.

### 3. Application Grouping & Re-application UX
- [ ] **Grouping in "My Applications"**:
  - Navigate to **My Applications** tab.
  - Verify that applications are neatly grouped into 5 distinct categories:
    * **Active Teams**: Accepted applications where you are currently an active member.
    * **Pending Applications**: Active requests waiting for owner review.
    * **Rejected Applications**: Requests declined by the owner (displays rejection comment).
    * **Withdrawn Applications**: Requests you cancelled.
    * **Past Teams**: Accepted applications where you have since left or been removed.
  - Verify that the **Open Team Workspace** action is displayed ONLY on Active Teams.
  - Verify that **Apply Again** is displayed on Left, Rejected, and Withdrawn cards, and is fully active if the project capacity still has open slots.

### 4. Owner Boundary Checks
- [ ] **Owner Cannot Leave Own Project**:
  - Log in as the project creator (Owner).
  - Open the Team Roster list.
  - Verify that your card does NOT render a "Leave Team" button.
  - Verify that you cannot kick yourself.
  - Verify you can pause, complete, or archive the project using the status settings dropdown instead of leaving.

### 5. Private Team Discussion Board (Workspace Tab 2)
- [ ] **Roster-Gated Read/Write**:
  - Verify that only the owner and active team members (not left members or non-members) can read or publish discussion posts.
- [ ] **Post Creation & Metadata**:
  - Publish a new post. Verify you can select from four post types: `Update`, `Question`, `Announcement`, `Task`.
  - Verify you can add comma-separated tags.
  - Verify the post renders with uploader name, relative timestamp, type-colored badge, and tags.
- [ ] **Reactions & Comment Replies Drawer**:
  - Click `Ã°Å¸â€˜ï¿½ Helpful` reaction button on a post. Verify it increments. Click again to toggle off.
  - Click `Comments` to slide open the replies drawer.
  - Add a reply. Verify it renders instantly and increments the comment counter.
  - As the author, delete your comment. Verify it deletes safely and decrements the counter.
- [ ] **Owner Controls & Soft Deletion**:
  - As the Owner, verify you can pin critical posts. Pinned posts must stay anchored at the top of the discussion board.
  - Verify that authors can delete their own posts, and owners can delete any post.

### 6. Shared Resources Library (Workspace Tab 3)
- [ ] **HTTPS Links Only**:
  - Click **Share a Link**.
  - Attempt to upload an insecure link (e.g. `http://...` or `javascript:...`). Verify it blocks with an explicit protocol validation error.
  - Submit a valid `https://` link.
- [ ] **Owner Auto-Verification vs Member Queue**:
  - As the Owner, submit a resource link. Verify it is verified instantly and appears directly in the **Verified Material Library**.
  - As a normal Member, submit a resource link. Verify it is sent to the pending verification list and shows in your **My Submitted Resources** dashboard as `Ã¢ï¿½Â³ Pending`.
- [ ] **Verification Console Moderation**:
  - Log in as Owner. Open the Shared Resources tab.
  - Locate the **Material Verification Queue** containing the member's pending resource.
  - Verify that if the URL ends in `.exe`, a prominent safety warning alerts you.
  - Decline the material. Verify that a modal prompts you for a rejection reason.
  - Type a rejection reason and save. Verify the resource is removed from the queue.
  - Log in as the member. Verify that the resource shows in your dashboard with a red `Ã¢ï¿½Å’ Rejected` badge and displays the owner's feedback comments.
  - Approve a resource. Verify it is verified instantly, removed from the queue, and appears in the public **Verified Material Library** visible to all teammates.
- [ ] **Owner & Uploader Pin Controls**:
  - As the Owner, pin a verified resource. Verify a blue `Ã°Å¸â€œÅ’ PINNED` badge appears and it floats to the top of the library.
  - Verify that Owners and original uploaders can delete resources safely.

---

## Ã°Å¸â€œâ€¹ Phase 6.3A Ã¢â‚¬â€� Project Formation Count Sync, Self-Healing DB Updates, and Custom Category/Type Support

### 1. Roster & Live Team Count Sync
- [ ] **Active Count Live Truth**:
  - Go to **Discover Projects**. Locate a project team where a member has voluntarily left or was kicked.
  - Verify that the Discover project card displays `Team Size: activeCount / max_team_size` where `activeCount` strictly represents active members (`left_at IS NULL`). Departed members must not be counted.
  - Verify that the **My Projects** dashboard card displays `Members: activeCount / max_team_size` correctly.
  - Open the **Workspace** for that project. Verify that the **Capacity** value in the header metadata bar displays `activeCount / max_team_size`.
  - Verify that the **Team Roster** section header displays `Team Roster (activeCount / max_team_size)` accurately.

### 2. Role Slot & Team Capacity Enforcement
- [ ] **Reopening Roles on Departure**:
  - As a member who occupies a crucial role slot (e.g. Presenter), voluntarily leave the project team or have the owner remove you.
  - Check the project card as a non-member. Verify that the role slot count decrements instantly (e.g. Presenter changes from `1/1 Full` to `0/1 Open` or similar), and the role displays as open.
  - Open the **Submit Join Request** modal. Verify that the Presenter role is fully enabled and selectable.
  - As the project owner, accept a new applicant for the open role. Verify that the role slot increment is captured, and the project capacity limits self-heal immediately in the database and UI.

### 3. "Other" Custom Category & Project Type Support
- [ ] **Create Project modal with custom inputs**:
  - Open the **Start a Project** modal.
  - In the **Category** dropdown, select the `"Other"` option. Verify that a text input labeled `"Custom Category Name *"` appears.
  - Leave it blank or type a single character and click submit. Verify that a validation toast blocks submission: `"Custom Category must be at least 2 characters."`
  - Fill it with `"Bio-Informatics"` (length >= 2).
  - In the **Project Type** dropdown, select the `"Other"` option. Verify that a text input labeled `"Custom Project Type *"` appears.
  - Fill it with `"Graduation Capstone"` and complete the form. Submit.
  - Verify that the project is created successfully and displays the category `"Bio-Informatics"` and project type `"Graduation Capstone"` clearly on the card and workspace details.
  - Open the **Discover Projects** tab. Locate the **Category** and **Project Type** filter dropdowns.
  - Verify that `"Bio-Informatics"` and `"Graduation Capstone"` are automatically discovered and listed alphabetically at the end of the default choices!
  - Select `"Bio-Informatics"` from the filter. Verify that the project filters instantly.

### 4. Database Self-Healing Repair Query
- [ ] **Verification of Repair Query**:
  - If cached values inside `project_posts.current_team_size` or `project_roles.slots_filled` become desynchronized, run the idempotent sync SQL script in the Supabase SQL Editor.
  - Verify that all counts self-heal to match active memberships (`left_at IS NULL`) exactly, without destroying historical logs or applications.

---

## Ã°Å¸â€œâ€¹ Phase 6.3B Ã¢â‚¬â€� Project Mate Workspace Repairs & UX Polish

### 1. One-User-One-Helpful-Reaction Toggling
- [ ] **Single Helpful Vote**:
  - Log in as a member. Navigate to **Shared Resources**.
  - Click **Ã°Å¸â€˜ï¿½ Helpful** on a verified resource. Verify the count increments from `0` to `1` and the button highlights as active.
  - Click the **Ã°Å¸â€˜ï¿½ Helpful** button again. Verify the count decrements from `1` back to `0` and highlights are removed.
  - Click the button rapidly multiple times. Verify that count never inflates beyond `1` and strictly toggles between `0` and `1`.
  - Log in as the project owner. Verify that you see the updated reaction count, and clicking the button toggles your own individual upvote independently.

### 2. Lead Role Selection & Slot Reservation
- [ ] **Dynamic Reservation during Project Creation**:
  - Open the **Post Teammate Search** modal.
  - Define three required open position slots under **4. Role-Specific Open Slots** (e.g. Backend Engineer, Frontend Wizard, UI Designer).
  - Go to **4.5. My Role in This Project** dropdown.
  - Select **Project Lead Only (Do not consume dynamic slot)**. Submit. Open workspace Members. Verify your role is `Project Lead` and the position slots show `0/1` filled.
  - Create another project with the same roles. Select **Reserve Dynamic Open Position Below**.
  - Choose `Backend Engineer` from the positioning dropdown list. Submit.
  - Open workspace Members. Verify that your roster card lists you with both `Ã°Å¸â€˜â€˜ Lead` and `Backend Engineer` badges, and the Backend Engineer slot displays as `1/1 Full` instantly!
  - Create a third project. Select **Specify Custom Role Title**.
  - Type `"System Architect"`. Submit. Open roster. Verify your card displays the custom `"System Architect"` role badge cleanly.

### 3. Broader Settings Console Sidebar
- [ ] **Pre-filled Settings Console**:
  - Open the **Coordination & Settings** subtab as the project owner.
  - Click **Edit Credentials** to open the Settings console form.
  - Verify that all 12 project fields (Title, Summary, Description, Category, Project Type, Difficulty, Work Mode, Required Skills, Departments, Academic Year, Timeline, Capacity, Deadline, Coordination link, GitHub link, Shared Document, and Private Notes) pre-fill with their existing database values, rather than leaving inputs empty.
- [ ] **HTTPS Links Only Constraints**:
  - Under **5. Secure Collaboration Settings**, edit a coordination, repository, or shared document link with an insecure URL (e.g. `http://meet.google.com/xyz` or `javascript:...`).
  - Click **Save All Settings**. Verify that the save is blocked and an error toast triggers: `"All external links must strictly use the https:// protocol."`
  - Correct the links to start with `https://` and save. Verify the save succeeds.
- [ ] **Active Roster Capacity Constraints**:
  - In the Settings form, edit the **Maximum Team Size** input.
  - Enter a number lower than the active roster member count (e.g. if you have 3 active members, try setting capacity to 2).
  - Click **Save All Settings**. Verify that saving is blocked with a descriptive validation error.
  - Set the capacity equal to or higher than 3. Verify it saves successfully.

### 4. Premium Team Roster & Privacy
- [ ] **Active Members Roster & Profile Previews**:
  - Navigate to the **Members** list in your workspace.
  - Verify that the Owner is strictly pinned at the very top of the list with a `"Ã°Å¸â€˜â€˜ Lead"` badge.
  - Verify that other active members are sorted alphabetically by their full names.
  - Check that each member card displays their initials avatar, department/year, joined date, and dynamic role badge.
  - Click **View Profile** next to a teammate's name. Verify that the public profile modal opens correctly.
  - **CRITICAL PRIVACY CHECK**: Verify that no email address, phone number, WhatsApp link, or raw database UUID is leaked inside the profile card or workspace layout.
- [ ] **Past Members separated history (Owner only)**:
  - As the project owner, kick an active member with a reason.
  - Verify that the kicked member is removed from the active roster and appears under **Ã¢Å’â€º Past Members / Team History** collapsible list (visible only to the owner).
  - Verify that the past member card lists their name, role, exit date, exit reason, and a fully functional **View Profile** button safely gating contact fields.

### 5. Sandboxed Link-Based Sharing
- [ ] **Folder Link & Repository URL Warnings**:
  - Click **Share Material** under the Shared Resources tab.
  - Click **Ã°Å¸â€œï¿½ Folder Link**. Verify that the form placeholder changes to an HTTPS URL guide, and a prominent yellow warning states that browser directory uploading is disabled for security sandboxing.
  - Click **Ã°Å¸â€™Â» Code Repo**. Verify that the help note guides the student to paste a secure HTTPS repository link.
- [ ] **Resource Deletion Boundary Rules**:
  - Log in as a normal member. Upload a resource to the verification queue.
  - Log in as the Owner. Verify the queue, and click **Approve Material** to verify it.
  - Log in as the member. Look at the verified material list. Verify that the trash/remove icon next to your verified resource is completely hidden or disabled, blocking members from removing approved resources.
  - Go to **My Submitted Materials** at the bottom.
  - Locate an unverified (pending or rejected) resource submission.
  - Verify that a **Cancel Submission & Delete** button is visible.
  - Click **Cancel Submission & Delete** and confirm the alert. Verify that the unverified resource is deleted successfully from both the list and database cache.





---

## Phase 6.3C: Project Lifecycle, Role Management & Completion Controls

### 1. My Projects â€” Lifecycle Sections
- [ ] Navigate to My Projects tab. Verify 4 lifecycle sections: Recruiting, Running, Completed, Archived & Paused.
- [ ] Create a project. It appears in Recruiting section with correct quick action buttons.
- [ ] Click 'Mark Running'. Project moves from Recruiting to Running section immediately.
- [ ] Click 'Mark Completed'. Completion Note modal appears. Add a note and confirm.
- [ ] Project moves to Completed section with View Summary / Restore to Running / Archive buttons.
- [ ] Click 'Archive' from Completed. Archive confirm modal appears. Confirm.
- [ ] Project moves to Archived & Paused section (collapsed by default).
- [ ] Expand Archived section. Verify Restore to Recruiting button works.
- [ ] Verify Completed section shows 'Show More' / 'Show Fewer' for > 3 projects.

### 2. Role Management Panel (Team Lead Console)
- [ ] Open workspace for an owned project. Right sidebar shows 'Role Slots' panel.
- [ ] Click '+ Add Role'. Inline form appears.
- [ ] Fill in role name, description, skills, slots, priority. Click Add Role.
- [ ] New role appears in the list with edit and delete buttons.
- [ ] Click edit (pencil icon). Edit form opens pre-filled. Change name and save.
- [ ] Verify updated role name shows in the list.
- [ ] Try to delete a role with active members. Verify error: 'This role has active members.'
- [ ] Delete a role with no members. Verify it is removed successfully.
- [ ] Verify new role appears in the Apply modal for external applicants.

### 3. Completed Project Summary Panel
- [ ] Open workspace for a completed project. Coordination tab shows a green summary banner.
- [ ] Verify: Completed At date, Team Lead Note, Members count, Resources count, Posts count.
- [ ] Verify: Restore to Running and Archive buttons visible for owner.
- [ ] For non-owner, verify: Restore and Archive buttons are NOT visible.
- [ ] For archived project, verify archived banner with Restore to Recruiting button.

### 4. Archive Confirm Modal
- [ ] Click Archive on any project. Confirm modal appears with Archive Project / Cancel.
- [ ] Click Cancel. Modal closes. Project status unchanged.
- [ ] Click Archive Project. Project status changes to archived. Active workspace closes.
- [ ] Archived project removed from Recruiting/Running/Completed sections.

### 5. Application Rule by Phase
- [ ] View a completed project in Discover. Verify 'Apply' CTA is not shown (project completed).
- [ ] View an archived project. Verify no apply button.

### 6. Smart Section Scroll & Sorting
- [ ] Add more than 3 members to a team. Open Team Roster on Workspace page. Verify max-height scrolling (max-h-64 overflow-y-auto) is applied to roster list.
- [ ] Add more than 3 past members to a project. Expand Past Team History. Verify list has max-height scrolling (max-h-64) and is sorted by exit date (recent-first).
- [ ] In Discover tab, view a project with > 3 required slots. Verify Required Slots list has max-height scrolling (max-h-60 overflow-y-auto).
- [ ] Create > 3 pending applications for an owned project. Verify Applications Queue has max-height scrolling (max-h-64) and is sorted by application date (recent-first).
- [ ] In My Projects tab, check Completed Projects and Archived Projects sections. Both should be collapsible and collapsed by default.

### 7. Discover CTA Rules by Project Status
- [ ] Mark a project Completed. Open Discover tab. Verify the project card action button shows "? Project Completed" badge instead of Apply/Apply Again.
- [ ] Pause a project. Open Discover tab. Verify the project card action button shows "?? Project Paused" badge instead of Apply/Apply Again.
- [ ] Archive a project. Open Discover tab. Verify the project card action button shows "?? Project Archived" badge instead of Apply/Apply Again.
- [ ] View an In-Progress project. Verify the button shows "Apply to Running Project" with the italic note "Project is already in progress".

### 8. Resource Layout & URL Overflow Styling
- [ ] Submit a resource with an extremely long URL (e.g. > 100 characters). Verify that in My Submitted Materials panel, the URL breaks nicely (break-all class applied) and does not blow out the card or page layout.

## Phase 6.3D: Project Mate Workspace Layout, Scroll Flow & Final UX Repair

### 1. Full-Width Workspace Header & Subtabs
- [ ] Open a project workspace.
- [ ] Verify that the **Workspace Header Card** (Title, Description, Status Select) spans 100% full-width of the container.
- [ ] Verify that the **Subtab Navigation Bar** spans 100% full-width of the container.
- [ ] Resize viewport to mobile/tablet sizes and verify that the header and subtabs stack and scale perfectly without horizontal scrolling.

### 2. Workspace Subtab Split Layout
- [ ] Switch to the **Coordination & Settings** subtab.
  - [ ] Verify a responsive 2-column layout on desktop: Left/Main shows secure coordinates and guide, Right/Sidebar shows Roster, Past History, and Required Slots.
- [ ] Switch to the **Team Discussion** subtab.
  - [ ] Verify a 100% full-width thread container.
  - [ ] Verify that the Team Roster sidebar is **NOT** visible.
- [ ] Switch to the **Shared Resources** subtab.
  - [ ] Verify a 100% full-width shared materials library.
  - [ ] Verify that the Team Roster sidebar is **NOT** visible.

### 3. Scroll Traps Removal & Pagination Controls
- [ ] Open the **Coordination** subtab.
  - [ ] Verify that **Team Roster**, **Past Members**, **Required Slots**, and **Applications Queue** lists do **NOT** contain nested scroll traps.
  - [ ] Verify that lists with more than 3 items display a clean **Show More** button indicating the count of remaining items.
  - [ ] Click **Show More** on each list and verify that the list expands fully.
  - [ ] Click **Show Fewer** and verify that the list collapses cleanly back to 3 items.

### 4. Inline Accordion replies on Discussion Board
- [ ] Switch to the **Team Discussion** subtab.
  - [ ] Click the **Comments (N)** button on any thread card.
  - [ ] Verify that the replies accordion opens **inline** directly under the post card reaction footer.
  - [ ] Verify that the comment posting form and active replies render inside the card bounds.
  - [ ] Click the **Comments (N)** button again to toggle the accordion shut.
  - [ ] Try publishing a reply and verify that it renders inline and the comment count updates dynamically.

### 5. Polished Empty States & Card Stacking
- [ ] Open a project workspace with no past team members or open slots.
  - [ ] Verify that the Roster's **Past Members Section** shows a clean empty state: "No team history recorded." when expanded.
  - [ ] Verify that the **Required Slots** sidebar shows a polished placeholder: "All team positions have been filled! ðŸŽ‰".
- [ ] Under the **Shared Resources** subtab, verify that verified resource cards with long filenames or URLs wrap cleanly without card blow-outs (using `break-all` and `break-words`).
- [ ] Verify that verified library card footer action buttons (Preview, Download, Helpful, Pin, Delete) use a flex-wrap container so they stack elegantly on smaller viewports.

 
 

 
 
## Phase 6.3E: Project Mate Sidebar Scroll Cards, Header Polish, and Teammates Section Upgrade
- [ ] Verify the workspace header grid shows Difficulty, Work Mode, Type, Capacity, and Open Roles perfectly aligned.
- [ ] Open a project with more than 3 members. Verify the Teammates Console applies thin-scrollbar and search/filter inputs appear.
- [ ] Test teammate search by typing a name; verify the list filters correctly.
- [ ] Test teammate role filter; verify the list filters by role.
- [ ] Open Role Slots (Owner view). Verify max-height scroll is applied for > 3 roles and progress bars appear for slots.
- [ ] Open Required Slots. Verify open roles are sorted first, skill chips are rendered, and max-height scroll is applied for > 3 roles.
- [ ] Expand Past Members. Verify it has a scroll body for > 3 members, sorted by recent exit date.
- [ ] Open Applications Queue (Owner view). Verify applicants are sorted by newest-first and scroll body applies for > 3 applications.

## ??? 27. Phase 6.4: Project Task Assignment & Verification
*Verify that project owners can assign tasks and members can submit work.*

- [ ] **Task Creation (Owner)**
  - Open project workspace and click the Project Tasks subtab.
  - In the console, select ? Assign New Task.
  - Fill in task details and assign it to an active member.
  - Verify that the task appears in the Task Board under 'To Do / In Progress'.
- [ ] **Task Progression (Assignee)**
  - Sign in as the assigned member.
  - Go to the Project Tasks tab.
  - Open the task details and click Mark In Progress. Verify status update.
- [ ] **Task Submission (Assignee)**
  - With the task in progress, click View Details.
  - Fill in the submission form (Link/URL + Notes) and submit.
  - Verify that the task moves to the Submitted column.
- [ ] **Task Verification (Owner)**
  - Sign back in as the owner.
  - Open Review Queue under Project Tasks.
  - Open the submitted task and click Verify & Approve.
  - Verify that the task moves to the Verified column and status turns green.
- [ ] **Task Rejection (Owner)**
  - Assign a new task, submit it as the member.
  - As owner, reject the submission with feedback.
  - Verify the status updates to Rejected and the feedback is visible to the member.



---

## ? 28. Phase 6.4A: Resource Preview, Public Contact Links & Task Dashboard Polish

### 1. Shared Resources — Video Preview
- [ ] Upload a video resource file to the project workspace as a member.
- [ ] As the owner, verify the Verification Queue shows a ? Play Video button for video resources.
- [ ] Click ? Play Video — verify the lightbox modal opens with an HTML5 <video> player, streamed securely via signed URL. No raw file_path is shown.
- [ ] Approve the video. In the Verified Library, verify ? Play Video button now appears (previously only PDF/image were supported).
- [ ] Confirm PDF and Image previews still work correctly (iframe embed, img viewer).

### 2. Resource Verification Queue — Scroll
- [ ] Submit 4+ resources as a member. As owner, verify the queue list body scrolls inside max-h-[400px].
- [ ] Verify the queue header (title + pending badge) remains fixed and does not scroll.
- [ ] Verify Approve/Decline buttons remain reachable inside each card.

### 3. My Submitted Materials — Polish
- [ ] Upload a file with a long name. In My Submitted Materials, verify filename is truncated with ellipsis and 	itle tooltip shows full name.
- [ ] Verify file size label (XX.X KB) appears next to the file name for file resources.
- [ ] Verify link resources show a safely truncated clickable URL.
- [ ] For a resource with neither file_path nor url: verify "No file or link attached." fallback is shown (no broken <a href="">).

### 4. Helpful Resource Behavior
- [ ] Click the Helpful ?? button on a verified resource — verify helpful_count increments and button changes visual state.
- [ ] Click again (if reaction table exists) — verify count decrements and button goes inactive.
- [ ] Refresh page — verify eacted_by_me state is correctly restored from DB.

### 5. Public-Safe Teammate Contact Links
- [ ] Roster cards: teammates who have GitHub/LinkedIn/Portfolio set in their profile should show clickable badge links directly on the card.
- [ ] Team Contact Sharing panel: public links show for ALL active teammates regardless of share_* flags.
- [ ] Private contacts (email/phone/WhatsApp) appear ONLY when teammate has set the respective share_* flag to true.
- [ ] Non-members: verify Contact Sharing panel is NOT visible.
- [ ] No raw UUIDs, emails, or phone numbers are shown to non-members.
- [ ] Teammate with no public links and no shared contacts: "This teammate has not shared contact details. Use project discussion or shared workspace coordination." is displayed.

### 6. Task Attachment — Disabled State
- [ ] For an attachment with no file_path and no url: verify — No source attached helper text is shown (not a broken empty href).
- [ ] Video task attachments: verify ? Play button appears and plays in the secure lightbox.
- [ ] Submission deliverable files: same null guard applied — — No source shown when both are null.

### 7. My Work Dashboard — Status Grouping
- [ ] Tasks appear in correct group sections: ?? Assigned, ? In Progress, ? Pending Review, ? Verified, ?? Needs Revision, ?? Extension Requested / Granted.
- [ ] A task past due date shows in ?? Overdue Tasks banner spanning full width at top of dashboard.
- [ ] Empty groups are hidden entirely (not shown as empty sections).
- [ ] Member with no tasks assigned sees: "No project work assigned yet." empty state.

### 8. Owner Review Queue — Newest First
- [ ] Multiple members submit tasks at different times. Owner opens ?? Review Queue.
- [ ] Verify most recently submitted task appears first (created_at desc order confirmed in API).


---

## 29. Phase 6.4B: Video Resource Polish, Profile Integration, Teammate Counts & Preset Abstractions

### 1. Video Resource Constraints & DB Compatibility
- [ ] Select **Upload File** -> **Resource File Type** -> **Video** in the workspace sharing form.
- [ ] Verify that the specific Video helper text is visible: *"Upload a short project demo, explanation, walkthrough, or reference clip."*
- [ ] Confirm that the accepted formats block displays: *"Accepted: .mp4, .webm, .mov up to 20MB."*
- [ ] Select a video file under 20MB - verify it uploads and submits successfully.
- [ ] Try uploading a video file over 20MB - verify it is blocked by the size limit check with a clear error message.
- [ ] Verify that uploaded video files map to `resource_type === 'other'` under the hood, but display as a `Video` badge in the UI.
- [ ] Confirm that video preview plays correctly in the lightbox player and video download works.
- [ ] Try uploading a dangerous script file (.exe, .bat, .cmd, .sh, etc.) - verify it is immediately blocked.

### 2. Video Player Lightbox and URL Expiry
- [ ] Play a video resource or task attachment in the lightbox preview.
- [ ] Confirm the HTML5 player has `controls` and does NOT autoplay.
- [ ] Verify that if the playback URL is expired or incorrect, an error toast is triggered: `"Preview link expired. Reopen preview to refresh."`

### 3. Resource Controlled Internal Scrolls
- [ ] Verify that the Verified Material list starts internal compact scrolling (max-h 420px) only when containing > 4 items.
- [ ] Verify that My Submitted Materials starts compact scrolling (max-h 300px) only when containing > 4 items.
- [ ] Verify that the Verification Queue starts scrolling (max-h 300px) when containing > 3 items.

### 4. Workspace Teammate Task Counts & Role Tags
- [ ] Open the workspace teammates console list in the Roster tab.
- [ ] Verify that each teammate card shows their project role tag (e.g. "Ã°Å¸â€˜â€˜ Lead" or custom roles).
- [ ] Verify each card calculates and displays teammate task metrics (Assigned, Verified, Pending, Overdue counts) client-side in real-time.

### 5. Task Assignment Presets
- [ ] As Project Lead, go to Task Assignment panel.
- [ ] Click one of the quick preset template buttons (Frontend UI, Backend API, UI/UX, Research, QA, Demo).
- [ ] Verify that the Title, Objective, and Priority fields are pre-filled automatically with premium defaults.

### 6. Empty Submissions Block & Size Caps
- [ ] Open task drawer as assignee. Try submitting with note < 10 characters or without selecting any file/URL. Verify that validation errors are displayed.
- [ ] Try uploading a submission file larger than 20MB. Verify that the size limit guard rejects it.

### 7. Private Self-View Profile Dashboard
- [ ] Open My Profile tab while logged in as a student.
- [ ] Scroll to the bottom to find the private Project Work Dashboard.
- [ ] Verify KPIs display correctly (Active Teams, Verified Tasks, Pending Tasks, Overdue Tasks, Past Teams).
- [ ] Verify current and past project participations timeline lists display correctly.
- [ ] Confirm that active project entries show a rocket Ã°Å¸Å¡â‚¬ "Open Workspace" shortcut button.
- [ ] Confirm that this workspace redirect button is strictly restricted to active team members.

### 8. Premium Task Status Lock Banners
- [ ] Open task drawer for a verified task - verify a green Ã°Å¸Â�â€  "Task Verified & Completed" premium banner is displayed.
- [ ] Open task drawer for a cancelled task - verify a neutral Ã°Å¸Å¡Â« "Task Assignment Cancelled" banner is displayed.
- [ ] Open task drawer for a pending-review task - verify a purple Ã¢Â�Â³ "Work Pending Lead Review" banner is displayed.
- [ ] Open task drawer for a needs-revision (rejected) task - verify a red Ã¢Å¡Â Ã¯Â¸Â� "Revisions Requested" banner is displayed.



---

## 30. Phase 6.4C: My Profile Review Scroll, Dynamic Badge Logic & Profile Polish

### 1. Peer Help & Senior Mentor Reviews Scrollboxes
- [ ] Receive or write 4+ Peer Help Reviews - verify that the Peer Help Reviews container limits height (`max-h-[360px]`) and enables vertical scrolling (`overflow-y-auto thin-scrollbar`).
- [ ] Confirm that no duplicate or confusing "Show more reviews" / "Show fewer reviews" toggle button is rendered.
- [ ] As a Senior Mentor, receive 4+ Guidance Reviews - verify the Received Mentor Reviews container similarly limits height (`max-h-[360px]`) and enables scrolling.
- [ ] Confirm the review card feedback comment is displayed in a styled container that wraps long words correctly (`break-words break-all`).

### 2. Dynamic Badge Logic
- [ ] Verify that profile header badges calculate and display in real-time based on actual user counts:
  - **Peer Helper**: displays "Getting Started" (0 reviews), "Helpful Peer" (1â€“2 helpful reviews), "Trusted Helper" (3â€“5 helpful reviews), or "Top Helper" (6+ helpful reviews).
  - **Doubt Solver**: displays "Doubt Solver" (1-2 answered doubts), "Active Solver" (3-5), or "Community Mentor" (6+).
  - **Project Contributor**: displays "Project Contributor" (1-2 verified tasks), "Reliable Teammate" (3-5), or "Project Champion" (6+).
  - **Teamwork**: displays "Team Player" (1 active project roster), "Strong Collaborator" (2+ active/verified tasks), or "Project Lead" (Owner with verified tasks).
- [ ] Verify that hover tooltips on each badge accurately detail the counts and progression requirements.
- [ ] Verify that the **Senior Mentor** badge only displays for users with `is_senior_mentor` explicitly set to true.
- [ ] Confirm that if a user has no reviews, solved doubts, or projects, the default fallback displays a neutral "Getting Started" state.

### 3. Timeline Scrollers & KPI Alignments
- [ ] Open My Profile - verify that the **Active Projects**, **Pending Assigned Tasks**, **Verified Contributions**, and **Past Projects** sections enable dynamic heights and scrollboxes based on item counts.
- [ ] Verify that empty states are beautifully styled and direct the student to collaboration modules.
- [ ] Ensure that mobile screen views are completely responsive and have no horizontal overflow.
- [ ] Confirm that no private contact phone/WhatsApp or private task files are exposed.

