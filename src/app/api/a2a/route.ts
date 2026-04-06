import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuid } from "uuid";

export async function GET() {
  const cards = db
    .prepare(
      `SELECT c.*, a.name AS agent_name
       FROM a2a_agent_cards c
       JOIN agents a ON a.id = c.agent_id
       ORDER BY c.created_at DESC`,
    )
    .all();
  return NextResponse.json(cards);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    agent_id: string;
    card_json: string;
  };

  if (!body.agent_id || !body.card_json) {
    return NextResponse.json(
      { error: "agent_id and card_json are required" },
      { status: 400 },
    );
  }

  const id = uuid();
  const endpointUrl = `/api/a2a/${id}/invoke`;

  db.prepare(
    `INSERT INTO a2a_agent_cards (id, agent_id, card_json, endpoint_url)
     VALUES (?, ?, ?, ?)`,
  ).run(id, body.agent_id, body.card_json, endpointUrl);

  const card = db
    .prepare("SELECT * FROM a2a_agent_cards WHERE id = ?")
    .get(id);
  return NextResponse.json(card, { status: 201 });
}
