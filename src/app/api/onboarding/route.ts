import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  let state = db
    .prepare("SELECT * FROM onboarding_state WHERE id = 'default'")
    .get() as
    | {
        id: string;
        completed_steps: string;
        is_complete: number;
        current_step: number;
      }
    | undefined;

  if (!state) {
    db.prepare(
      "INSERT INTO onboarding_state (id) VALUES ('default')",
    ).run();
    state = db
      .prepare("SELECT * FROM onboarding_state WHERE id = 'default'")
      .get() as {
      id: string;
      completed_steps: string;
      is_complete: number;
      current_step: number;
    };
  }

  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { step: number };

  // Ensure default row exists
  let state = db
    .prepare("SELECT * FROM onboarding_state WHERE id = 'default'")
    .get() as
    | {
        id: string;
        completed_steps: string;
        is_complete: number;
        current_step: number;
      }
    | undefined;

  if (!state) {
    db.prepare(
      "INSERT INTO onboarding_state (id) VALUES ('default')",
    ).run();
    state = db
      .prepare("SELECT * FROM onboarding_state WHERE id = 'default'")
      .get() as {
      id: string;
      completed_steps: string;
      is_complete: number;
      current_step: number;
    };
  }

  const completedSteps: number[] = JSON.parse(state.completed_steps);
  if (!completedSteps.includes(body.step)) {
    completedSteps.push(body.step);
  }

  // current_step = highest completed step + 1 (derived, not blindly incremented)
  const newCurrentStep = completedSteps.length > 0 ? Math.max(...completedSteps) + 1 : 0;
  // Complete when all expected steps (0-4) are done
  const TOTAL_STEPS = 5;
  const isComplete = completedSteps.length >= TOTAL_STEPS ? 1 : 0;

  db.prepare(
    `UPDATE onboarding_state
     SET completed_steps = ?, current_step = ?, is_complete = ?
     WHERE id = 'default'`,
  ).run(JSON.stringify(completedSteps), newCurrentStep, isComplete);

  const updated = db
    .prepare("SELECT * FROM onboarding_state WHERE id = 'default'")
    .get();
  return NextResponse.json(updated);
}
