export type DeveloperEmailTemplate =
  | "welcome"
  | "email_confirmation"
  | "password_reset"
  | "submission_received"
  | "changes_requested"
  | "submission_approved"
  | "submission_rejected"
  | "game_published"
  | "support_ticket_received";

export const DEVELOPER_EMAILS: Record<DeveloperEmailTemplate, { subject: string; preview: string }> = {
  welcome: { subject: "Welcome to Uniblex Developers", preview: "Your studio workspace is ready." },
  email_confirmation: { subject: "Confirm your Uniblex developer email", preview: "Verify this address to finish account setup." },
  password_reset: { subject: "Reset your Uniblex developer password", preview: "Use the secure link to choose a new password." },
  submission_received: { subject: "We received your game submission", preview: "Your submission is safely queued for review." },
  changes_requested: { subject: "Changes requested for your Uniblex submission", preview: "Open the portal to review developer-visible feedback." },
  submission_approved: { subject: "Your Uniblex submission was approved", preview: "Your game has passed review." },
  submission_rejected: { subject: "Update on your Uniblex submission", preview: "Open the portal for the decision and next steps." },
  game_published: { subject: "Your game is now published on Uniblex", preview: "Your approved release is live." },
  support_ticket_received: { subject: "Uniblex Developer Support received your request", preview: "We saved your request and reference number." }
};

