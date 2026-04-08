import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  let prefs = db
    .prepare("SELECT * FROM theme_preferences WHERE id = 'default'")
    .get();

  if (!prefs) {
    db.prepare(
      "INSERT INTO theme_preferences (id) VALUES ('default')",
    ).run();
    prefs = db
      .prepare("SELECT * FROM theme_preferences WHERE id = 'default'")
      .get();
  }

  return NextResponse.json(prefs);
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as Partial<{
    theme: string;
    accent_color: string;
    font_family: string;
    density: string;
    border_radius: string;
    custom_css: string;
  }>;

  // Ensure default row exists
  let prefs = db
    .prepare("SELECT * FROM theme_preferences WHERE id = 'default'")
    .get();
  if (!prefs) {
    db.prepare(
      "INSERT INTO theme_preferences (id) VALUES ('default')",
    ).run();
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.theme !== undefined) {
    updates.push("theme = ?");
    values.push(body.theme);
  }
  if (body.accent_color !== undefined) {
    updates.push("accent_color = ?");
    values.push(body.accent_color);
  }
  if (body.font_family !== undefined) {
    updates.push("font_family = ?");
    values.push(body.font_family);
  }
  if (body.density !== undefined) {
    updates.push("density = ?");
    values.push(body.density);
  }
  if (body.border_radius !== undefined) {
    updates.push("border_radius = ?");
    values.push(body.border_radius);
  }
  if (body.custom_css !== undefined) {
    updates.push("custom_css = ?");
    values.push(body.custom_css);
  }

  if (updates.length > 0) {
    db.prepare(
      `UPDATE theme_preferences SET ${updates.join(", ")} WHERE id = 'default'`,
    ).run(...values);
  }

  const updated = db
    .prepare("SELECT * FROM theme_preferences WHERE id = 'default'")
    .get();
  return NextResponse.json(updated);
}
