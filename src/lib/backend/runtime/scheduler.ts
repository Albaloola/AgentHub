import { CronExpressionParser } from "cron-parser";
import { db, toBooleans } from "@/lib/db";
import type { ScheduledTask } from "@/lib/shared/types";
import { channelBelongsToAgent } from "@/lib/backend/services/channels";
import { createNotification } from "@/lib/backend/services/notifications";
import { executeSingleAgentRequest } from "@/lib/backend/services/execution";

const POLL_INTERVAL_MS = 15_000;

type ScheduledTaskRow = ScheduledTask & { agent_name?: string };

let schedulerTimer: NodeJS.Timeout | null = null;
let cyclePromise: Promise<void> | null = null;

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function toSqliteDate(date: Date) {
  return [
    date.getUTCFullYear(),
    "-",
    pad(date.getUTCMonth() + 1),
    "-",
    pad(date.getUTCDate()),
    " ",
    pad(date.getUTCHours()),
    ":",
    pad(date.getUTCMinutes()),
    ":",
    pad(date.getUTCSeconds()),
  ].join("");
}

export function computeNextRunAt(cronExpression: string | null, from?: Date | string | null) {
  if (!cronExpression) return null;
  try {
    const currentDate = from ? new Date(from) : new Date();
    const interval = CronExpressionParser.parse(cronExpression, { currentDate });
    return toSqliteDate(interval.next().toDate());
  } catch {
    return null;
  }
}

function loadTask(taskId: string) {
  const row = db
    .prepare(
      `SELECT st.*, a.name as agent_name
       FROM scheduled_tasks st
       LEFT JOIN agents a ON a.id = st.agent_id
       WHERE st.id = ?`,
    )
    .get(taskId) as Record<string, unknown> | undefined;
  return row ? (toBooleans(row) as unknown as ScheduledTaskRow) : undefined;
}

function claimTask(taskId: string) {
  const result = db.prepare(
    `UPDATE scheduled_tasks
     SET is_running = 1, last_started_at = datetime('now'), last_status = 'running', last_error = NULL
     WHERE id = ? AND COALESCE(is_running, 0) = 0`,
  ).run(taskId);
  return result.changes > 0;
}

async function executeTask(task: ScheduledTaskRow, trigger: "manual" | "scheduler") {
  if (!channelBelongsToAgent(task.channel_id, task.agent_id)) {
    throw new Error("Task channel does not belong to the selected agent");
  }

  const result = await executeSingleAgentRequest({
    agentId: task.agent_id,
    conversationId: task.conversation_id,
    channelId: task.channel_id,
    content: task.prompt,
    conversationName: `${task.name} Task`,
    metadata: {
      scheduled_task_id: task.id,
      trigger,
    },
  });

  const nextRunAt = computeNextRunAt(task.cron_expression, new Date());
  db.prepare(
    `UPDATE scheduled_tasks
     SET conversation_id = ?,
         is_running = 0,
         last_started_at = COALESCE(last_started_at, datetime('now')),
         last_run_at = datetime('now'),
         next_run_at = ?,
         run_count = run_count + 1,
         last_status = 'completed',
         last_error = NULL
     WHERE id = ?`,
  ).run(result.conversationId, nextRunAt, task.id);

  createNotification({
    type: "scheduled_task.completed",
    sourceType: "scheduled_task",
    severity: "success",
    title: `${task.name} Completed`,
    body: `Ran ${trigger === "manual" ? "manually" : "on schedule"} in ${result.agentName}.`,
    sourceId: task.id,
    agentId: task.agent_id,
    channelId: task.channel_id,
    conversationId: result.conversationId,
    taskId: task.id,
    actionUrl: `/chat/${result.conversationId}`,
    dedupeKey: `${task.id}:${result.responseMessageId}`,
    deliveryChannel: "in_app",
    deliveryStatus: "delivered",
    routingKey: `scheduled_task:${trigger}`,
    routingMetadata: {
      trigger,
      response_message_id: result.responseMessageId,
      token_count: result.tokenCount,
    },
  });

  return {
    taskId: task.id,
    conversationId: result.conversationId,
    result,
  };
}

export async function runScheduledTaskNow(taskId: string, trigger: "manual" | "scheduler" = "manual", options?: {
  alreadyClaimed?: boolean;
}) {
  const task = loadTask(taskId);
  if (!task) {
    throw new Error("Task not found");
  }
  if (!options?.alreadyClaimed && !claimTask(task.id)) {
    throw new Error("Task is already running");
  }

  try {
    const updatedTask = loadTask(task.id);
    if (!updatedTask) {
      throw new Error("Task disappeared while starting");
    }
    return await executeTask(updatedTask, trigger);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown task failure";
    const nextRunAt = computeNextRunAt(task.cron_expression, new Date());
    db.prepare(
      `UPDATE scheduled_tasks
       SET is_running = 0,
           last_run_at = datetime('now'),
           next_run_at = ?,
           run_count = run_count + 1,
           last_status = 'error',
           last_error = ?
       WHERE id = ?`,
    ).run(nextRunAt, errorMessage, task.id);

    createNotification({
      type: "scheduled_task.failed",
      sourceType: "scheduled_task",
      severity: "error",
      title: `${task.name} Failed`,
      body: errorMessage,
      sourceId: task.id,
      agentId: task.agent_id,
      channelId: task.channel_id,
      conversationId: task.conversation_id,
      taskId: task.id,
      actionUrl: task.conversation_id ? `/chat/${task.conversation_id}` : "/scheduled-tasks",
      dedupeKey: `${task.id}:error:${toSqliteDate(new Date()).slice(0, 16)}`,
      deliveryChannel: "in_app",
      deliveryStatus: "failed",
      routingKey: `scheduled_task:${trigger}`,
      routingMetadata: { trigger, error: errorMessage },
    });

    throw error;
  }
}

function claimDueTaskIds() {
  const rows = db
    .prepare(
      `SELECT id
       FROM scheduled_tasks
       WHERE is_active = 1
         AND COALESCE(is_running, 0) = 0
         AND next_run_at IS NOT NULL
         AND next_run_at <= datetime('now')
       ORDER BY next_run_at ASC
       LIMIT 5`,
    )
    .all() as { id: string }[];
  return rows.map((row) => row.id);
}

async function runSchedulerCycle() {
  if (cyclePromise) {
    return cyclePromise;
  }

  cyclePromise = (async () => {
    const taskIds = claimDueTaskIds();
    for (const taskId of taskIds) {
      try {
        await runScheduledTaskNow(taskId, "scheduler");
      } catch {
        // runScheduledTaskNow persists the failure state and notification
      }
    }
  })().finally(() => {
    cyclePromise = null;
  });

  return cyclePromise;
}

export function ensureSchedulerStarted() {
  if (schedulerTimer) {
    return;
  }

  schedulerTimer = setInterval(() => {
    void runSchedulerCycle();
  }, POLL_INTERVAL_MS);
  schedulerTimer.unref?.();

  void runSchedulerCycle();
}
