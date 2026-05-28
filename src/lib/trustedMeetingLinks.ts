/**
 * Trusted Meeting Links Validation Helper
 * Prevents phishing by restricting clickable meeting links to verified education/enterprise portals.
 */

const TRUSTED_DOMAINS = [
  'meet.google.com',
  'zoom.us',
  'us02web.zoom.us',
  'teams.microsoft.com',
  'microsoft.com',
  'webex.com',
  'cisco.webex.com',
];

/**
 * Checks if a meeting URL is secure and matches our trusted domains list.
 */
export const isTrustedMeetingLink = (url: string): boolean => {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (!trimmed.toLowerCase().startsWith('https://')) return false;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    
    return TRUSTED_DOMAINS.some(
      (domain) => host === domain || host.endsWith('.' + domain)
    );
  } catch (err) {
    return false;
  }
};

/**
 * Returns a human-friendly brand name for the meeting service provider.
 */
export const getMeetingPlatform = (url: string): string => {
  const lower = url.toLowerCase();
  if (lower.includes('google.com')) return 'Google Meet 🟢';
  if (lower.includes('zoom.us')) return 'Zoom Video 🔵';
  if (lower.includes('teams.microsoft.com') || lower.includes('microsoft.com')) return 'Microsoft Teams 🟣';
  if (lower.includes('webex.com')) return 'Cisco Webex 🔵';
  return 'Meeting Link 🔗';
};

/**
 * Sanitizes and normalizes a meeting link.
 */
export const normalizeMeetingLink = (url: string): string => {
  return url.trim();
};
