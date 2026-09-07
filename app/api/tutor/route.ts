import { NextResponse } from "next/server";
import { academyRuntimeRequest, requireLearner, requireLessonAccess } from "../../../lib/academy-runtime";
import { getLesson } from "../../../lib/db";

export async function POST(req: Request) {
  const auth = await requireLearner(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const courseSlug = String(body?.courseSlug || "").trim();
  const lessonSlug = String(body?.lessonSlug || "").trim();
  const question = String(body?.question || "").trim().slice(0, 3000);
  const labOutput = String(body?.labOutput || "").slice(-5000);
  const messages = Array.isArray(body?.messages) ? body.messages.slice(-6) : [];

  if (!courseSlug || !lessonSlug || !question) {
    return NextResponse.json({ error: "course_lesson_question_required" }, { status: 422 });
  }

  const access = await requireLessonAccess(auth.accessToken, courseSlug, lessonSlug);
  if (!access?.allowed) return NextResponse.json({ error: "lesson_locked" }, { status: 423 });

  const lessonData = await getLesson(courseSlug, lessonSlug, "en");
  if (!lessonData?.lesson) return NextResponse.json({ error: "lesson_not_found" }, { status: 404 });

  const system = [
    "You are the ZeroDriveX Academy lesson tutor.",
    "Use only the current lesson, its objectives, and the learner context supplied here.",
    "Do not reveal checkpoint answer keys or solve graded work outright.",
    "Give progressive hints, explain mechanisms accurately, and identify uncertainty.",
    "For lab help, diagnose the learner's actual terminal output before suggesting the next step.",
    "Keep answers concise enough to use while learning.",
    "",
    "Course: " + lessonData.course.title,
    "Module: " + lessonData.module.title,
    "Lesson: " + lessonData.lesson.title,
    "Objectives: " + JSON.stringify(lessonData.lesson.learning_objectives || []),
    "Lesson material:",
    String(lessonData.lesson.body_markdown || "").slice(0, 12000)
  ].join("\n");

  const conversation = messages.map((m: any) => ({
    role: m?.role === "assistant" ? "assistant" : "user",
    content: String(m?.content || "").slice(0, 1200)
  }));

  const runtime = await academyRuntimeRequest("/tutor", {
    system,
    user: JSON.stringify({
      recent_conversation: conversation,
      learner_question: question,
      recent_lab_output: labOutput || null
    })
  });

  return NextResponse.json({
    model: runtime.model,
    answer: runtime.content
  });
}
