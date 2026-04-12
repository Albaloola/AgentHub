/**
 * Automation types — webhooks, schedules, external API keys, notifications,
 * and third-party integrations. Anything that triggers an agent from outside
 * the UI belongs here.
 */

// --- External API keys ------------------------------------------------------

export interface ApiKey {
  id: string;
  name: string;
  key_hash: string;
  permissions: string;
  rate_limit_rpm: number;
  last_used_at: string | null;
  created_at: string;
}

// --- Webhooks ---------------------------------------------------------------

export interface Webhook {
  id: string;
  name: string;
  secret: string;
  agent_id: string;
  system_prompt: string | null;
  body_transform: string | null;
  rate_limit_per_min: number;
  is_active: boolean;
  total_triggers: number;
  last_triggered_at: string | null;
  created_at: string;
}

export interface WebhookEvent {
  id: string;
  webhook_id: string;
  payload: string | null;
  response_message_id: string | null;
  status: string;
  error: string | null;
  created_at: string;
}

// --- Scheduled tasks --------------------------------------------------------

export interface ScheduledTask {
  id: string;
  name: string;
  agent_id: string;
  prompt: string;
  cron_expression: string | null;
  conversation_id: string | null;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  run_count: number;
  last_status: string | null;
  last_error: string | null;
  created_at: string;
}

// --- Notifications ----------------------------------------------------------

export interface NotificationRule {
  id: string;
  event_type: string;
  channel: string;
  config: string;
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  source_id: string | null;
  is_read: boolean;
  created_at: string;
}

// --- Third-party integrations -----------------------------------------------

export interface Integration {
  id: string;
  type: string;
  name: string;
  config: string;
  agent_id: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  event_count: number;
  created_at: string;
}

export const INTEGRATION_TYPES = [
  { value: "github", label: "GitHub", icon: "github" },
  { value: "gitlab", label: "GitLab", icon: "gitlab" },
  { value: "jira", label: "Jira", icon: "ticket" },
  { value: "slack", label: "Slack", icon: "message-square" },
  { value: "discord", label: "Discord", icon: "message-circle" },
  { value: "telegram", label: "Telegram", icon: "send" },
  { value: "email", label: "Email", icon: "mail" },
  { value: "custom", label: "Custom", icon: "plug" },
];
