// Per-topic concept checklists for the guided AI lesson chat.
//
// Each topic lists the small set of things the tutor should make sure the
// learner actually understands by the end of the conversation — not a
// script to read top to bottom, just the concepts the AI should naturally
// steer toward covering. This is the one place to edit lesson content:
// add a topic, add/remove a concept, or reword a label, and both the
// AI's instructions and the on-page checklist panel pick it up automatically.
//
// `id` must be a short, stable, lowercase-with-dashes string — it's what
// the AI reports back as "covered" and what the client uses to track
// progress, so don't rename an existing id once learners may have
// progress stored against it.

module.exports = {
  'strong-passwords': {
    title: 'Creating Strong Passwords',
    concepts: [
      { id: 'length-over-complexity', label: 'Why length matters more than complexity' },
      { id: 'unique-per-account', label: 'Using a unique password for every account' },
      { id: 'avoid-personal-info', label: 'Avoiding personal info and dictionary words' },
      { id: 'password-manager', label: 'What a password manager does for you' },
      { id: 'enable-mfa', label: 'Why to turn on multi-factor authentication' },
    ],
  },

  'managers-mfa': {
    title: 'Password Managers & MFA',
    concepts: [
      { id: 'reuse-risk', label: 'Why reusing a password across sites is risky' },
      { id: 'manager-benefits', label: 'What a password manager actually gives you' },
      { id: 'autofill-phishing-defense', label: 'How autofill helps you avoid lookalike phishing sites' },
      { id: 'mfa-second-factor', label: 'Why a second factor stops a stolen password from being enough' },
      { id: 'mfa-method-choice', label: 'Preferring an authenticator app or security key over SMS' },
    ],
  },

  'after-a-breach': {
    title: 'Responding to a Breach',
    concepts: [
      { id: 'change-password-now', label: 'Changing the affected password immediately' },
      { id: 'reused-passwords', label: 'Changing it anywhere else it was reused' },
      { id: 'enable-mfa-after', label: "Turning on MFA if it wasn't already on" },
      { id: 'check-activity', label: 'Checking account activity and login history' },
      { id: 'sign-out-sessions', label: 'Signing out of all active sessions and devices' },
    ],
  },
};
