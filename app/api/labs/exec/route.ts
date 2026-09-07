import { NextResponse } from "next/server";
import { academyRuntimeRequest, requireLearner } from "../../../../lib/academy-runtime";

export async function POST(req: Request) {
  const auth = await requireLearner(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const sessionId = String(body?.sessionId || "").trim();
  const command = String(body?.command || "");
  if (!sessionId || !command.trim()) {
    return NextResponse.json({ error: "session_and_command_required" }, { status: 422 });
  }

  const result = await academyRuntimeRequest("/exec", {
    sessionId,
    userId: auth.user.id,
    command
  });
  return NextResponse.json(result);
}
