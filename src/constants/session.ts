/**
 * Application session & lifecycle configuration constants.
 */

/**
 * Security / session inactivity timeout duration in milliseconds.
 * Default: 60 minutes (3,600,000 ms).
 *
 * Behavior:
 * - App backgrounded < SESSION_TIMEOUT_MS: Resumes silently where the user left off with zero data loss.
 * - App backgrounded >= SESSION_TIMEOUT_MS: Shows a resume prompt to continue or start fresh.
 */
export const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 3,600,000 ms (60 minutes)

/**
 * Persistent storage keys used for session lifecycle and draft state preservation.
 */
export const STORAGE_KEYS = {
  /** Uncommitted billing draft data saved on background / cold-start */
  BILLING_DRAFT: '@billdesk_billing_draft',
  /** Timestamp (Date.now()) when the app last transitioned to 'background' */
  LAST_BACKGROUNDED_AT: '@billdesk_last_backgrounded_at',
} as const;
