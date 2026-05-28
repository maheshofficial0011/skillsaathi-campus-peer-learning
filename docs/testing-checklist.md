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

