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
