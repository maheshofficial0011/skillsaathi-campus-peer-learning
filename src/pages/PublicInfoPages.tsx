import React from 'react';

type PublicPage = 'about' | 'contact' | 'faq' | 'privacy' | 'terms' | 'not-found';

interface PublicInfoPageProps {
  page: PublicPage;
  onNavigate: (page: string) => void;
}

interface PageContent {
  eyebrow: string;
  title: string;
  intro: string;
  sections: Array<{ title: string; body: string }>;
}

const pageContent: Record<Exclude<PublicPage, 'not-found'>, PageContent> = {
  about: {
    eyebrow: 'About SkillSaathi',
    title: 'A simpler way for students to learn together',
    intro: 'SkillSaathi is a campus peer-learning platform built to make everyday academic support easier to find, share, and grow.',
    sections: [
      { title: 'Learn with your campus community', body: 'Ask anonymous doubts, join learning circles, find project teammates, and connect with seniors from one focused student platform.' },
      { title: 'Built for useful connections', body: 'SkillSaathi keeps the experience simple: students can discover the right kind of peer support without adding unnecessary friction to campus life.' },
      { title: 'Demo-ready foundation', body: 'This version presents the core platform experience clearly while keeping student trust, readability, and responsible community participation in view.' },
    ],
  },
  contact: {
    eyebrow: 'Contact / Support',
    title: 'Need help with SkillSaathi?',
    intro: 'For platform questions, feedback, or support during this demo, reach out through your campus SkillSaathi coordinator.',
    sections: [
      { title: 'What to include', body: 'Share a short description of what you were trying to do, the screen you were on, and any message you saw. Please do not include passwords or sensitive personal information.' },
      { title: 'Community concerns', body: 'If content or conduct on the platform feels inappropriate, report it to your campus coordinator so it can be reviewed through the appropriate campus process.' },
      { title: 'Demo support', body: 'SkillSaathi is currently presented as a campus peer-learning demo. Your feedback helps improve clarity, usefulness, and the student experience.' },
    ],
  },
  faq: {
    eyebrow: 'Frequently Asked Questions',
    title: 'Quick answers for students',
    intro: 'Here are the basics for understanding how SkillSaathi supports campus peer learning.',
    sections: [
      { title: 'What can I do on SkillSaathi?', body: 'You can ask anonymous doubts, explore learning circles, look for project teammates, connect with seniors, and maintain your student profile.' },
      { title: 'Do I need an account?', body: 'You can read these public information pages without signing in. The campus learning features require you to open the app and use the available sign-in flow.' },
      { title: 'Are anonymous doubts completely private?', body: 'Anonymous doubts are designed to reduce hesitation when asking for academic help. Use them responsibly and avoid sharing personal, confidential, or sensitive information.' },
      { title: 'How should I use peer guidance?', body: 'Treat peer support as a helpful starting point. For official academic decisions, deadlines, policies, or safety concerns, confirm details with your institution.' },
    ],
  },
  privacy: {
    eyebrow: 'Privacy Policy',
    title: 'A clear, student-friendly privacy note',
    intro: 'SkillSaathi is designed for campus peer learning. This demo aims to keep the information students share limited to what supports that experience.',
    sections: [
      { title: 'Information you provide', body: 'The platform may use account and profile details, along with content you choose to submit through its learning features, to provide the app experience.' },
      { title: 'Share thoughtfully', body: 'Do not post passwords, financial information, government identifiers, private contact details, or sensitive personal information in doubts, circles, projects, or messages.' },
      { title: 'Demo scope', body: 'This page is a plain-language demo notice, not a substitute for an institution-specific privacy policy. A production rollout should publish the final policy approved for that campus.' },
    ],
  },
  terms: {
    eyebrow: 'Terms & Community Guidelines',
    title: 'Learn together with respect',
    intro: 'SkillSaathi works best when students use it as a helpful, inclusive, and academically responsible campus space.',
    sections: [
      { title: 'Be constructive', body: 'Ask clear questions, offer useful guidance, and communicate respectfully. Harassment, discrimination, threats, and deliberately harmful content do not belong here.' },
      { title: 'Protect privacy', body: 'Share only information you are comfortable using for peer learning. Do not post another person\'s private information or request sensitive details from other students.' },
      { title: 'Use academic judgment', body: 'Peer learning should support understanding, not enable cheating or misrepresent someone else\'s work. Follow your institution\'s academic integrity expectations.' },
      { title: 'Demo scope', body: 'These guidelines provide a clear demo-ready baseline. A production campus rollout should adopt the institution\'s reviewed terms, moderation process, and support contacts.' },
    ],
  },
};

export const PublicInfoPage: React.FC<PublicInfoPageProps> = ({ page, onNavigate }) => {
  if (page === 'not-found') {
    return (
      <section className="public-page public-page-centered">
        <p className="public-eyebrow">Page not found</p>
        <h2 className="public-title">This page is not available</h2>
        <p className="public-intro">The page you requested may have moved or may not be part of this SkillSaathi demo.</p>
        <button className="public-button" onClick={() => onNavigate('landing')}>Return Home</button>
      </section>
    );
  }

  const content = pageContent[page];

  return (
    <section className="public-page">
      <p className="public-eyebrow">{content.eyebrow}</p>
      <h2 className="public-title">{content.title}</h2>
      <p className="public-intro">{content.intro}</p>
      <div className="public-section-grid">
        {content.sections.map((section) => (
          <article key={section.title} className="public-section">
            <h3>{section.title}</h3>
            <p>{section.body}</p>
          </article>
        ))}
      </div>
      <button className="public-button" onClick={() => onNavigate('auth')}>Open SkillSaathi</button>
    </section>
  );
};
