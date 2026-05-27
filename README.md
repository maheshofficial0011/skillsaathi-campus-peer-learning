# SkillSaathi - Campus Peer Learning & Collaboration Platform

SkillSaathi is a campus peer-learning and student collaboration platform designed to connect students, share academic resources, find project teammates, ask anonymous doubts, and facilitate mentor connections with campus seniors.

This repository contains the **Phase 0 Setup** of the SkillSaathi MVP application.

---

## 🛠️ Tech Stack & Dependencies
- **Core Framework**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vite.dev/)
- **Styling**: [Tailwind CSS v3](https://v3.tailwindcss.com/) (using PostCSS)

---

## 📂 Phase 0 Folder Structure
The source code is organized following the required modular layout:

```text
src/
  ├── components/          # Reusable UI component folders
  │    └── ui/             # Core UI atomic design components (buttons, badges, inputs)
  ├── layouts/             # Page structural layout templates
  │    └── MainLayout.tsx  # Dynamic layout containing the topbar and responsive navigation sidebar
  ├── lib/                 # Third-party service integrations & client wrappers
  ├── pages/               # High-level feature page views (placeholders)
  │    ├── LandingPage.tsx
  │    ├── AuthPage.tsx
  │    ├── DashboardPage.tsx
  │    ├── ProfilePage.tsx
  │    ├── DoubtsPage.tsx
  │    ├── LearningCirclesPage.tsx
  │    ├── ProjectMatePage.tsx
  │    └── SeniorConnectPage.tsx
  ├── types/               # TypeScript type definition files
  ├── styles.css           # Global Tailwind CSS entry styles
  ├── App.tsx              # Main routing and navigation controller
  └── main.tsx             # Application entrypoint script
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to interact with the dashboard.

### 3. Build for Production
Verify typescript compliance and build the production bundle:
```bash
npm run build
```
