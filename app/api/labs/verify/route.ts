import { NextResponse } from "next/server";
import { academyRuntimeRequest, requireLearner } from "../../../../lib/academy-runtime";
import { academyWorkerRpc } from "../../../../lib/worker-rpc";

export async function POST(req: Request) {
  const auth = await requireLearner(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const sessionId = String(body?.sessionId || "").trim();
  if (!sessionId) return NextResponse.json({ error: "session_required" }, { status: 422 });

  const result = await academyRuntimeRequest("/verify", {
    sessionId,
    userId: auth.user.id
  });

  let progress = null;
  if (result?.passed && result?.lessonId) {
    progress = await academyWorkerRpc("academy_worker_mark_lab_complete", {
      p_user_id: auth.user.id,
      p_lesson_id: result.lessonId,
      p_evidence: {
        session_id: result.sessionId,
        checks: result.checks || [],
        isolation: result.isolation || {},
        verified_at: result.verifiedAt
      }
    });
  }

  return NextResponse.json({ ...result, progress });
}
