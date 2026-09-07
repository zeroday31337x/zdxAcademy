import { NextResponse } from "next/server";
import { academyRuntimeRequest, requireLearner, requireLessonAccess } from "../../../../lib/academy-runtime";
import { userRpc } from "../../../../lib/supabase-auth";
import { academyWorkerRpc } from "../../../../lib/worker-rpc";

export async function POST(req: Request) {
  const auth = await requireLearner(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const courseSlug = String(body?.courseSlug || "").trim();
  const lessonSlug = String(body?.lessonSlug || "").trim();
  if (!courseSlug || !lessonSlug) {
    return NextResponse.json({ error: "course_and_lesson_required" }, { status: 422 });
  }

  const access = await requireLessonAccess(auth.accessToken, courseSlug, lessonSlug);
  if (!access?.allowed) return NextResponse.json({ error: "lesson_locked" }, { status: 423 });

  const lab = await userRpc(auth.accessToken, "academy_get_lab", {
    p_course_slug: courseSlug,
    p_lesson_slug: lessonSlug
  });
  const spec = await academyWorkerRpc("academy_worker_lab_spec", {
    p_lesson_id: lab.lesson_id
  });

  const session = await academyRuntimeRequest("/session", {
    userId: auth.user.id,
    lessonId: lab.lesson_id,
    courseSlug,
    lessonSlug,
    starterArtifacts: spec.starter_artifacts || [],
    expectedArtifacts: spec.expected_artifacts || [],
    verificationSpec: spec.verification_spec || {}
  });

  return NextResponse.json({
    sessionId: session.sessionId,
    expiresAfterIdleMs: session.expiresAfterIdleMs,
    lab: {
      lessonId: lab.lesson_id,
      title: lab.title,
      instructionsMarkdown: lab.instructions_markdown,
      environment: lab.environment,
      starterArtifacts: lab.starter_artifacts || [],
      expectedArtifacts: lab.expected_artifacts || []
    }
  }, { status: 201 });
}
