import { getSupabaseUser, userRpc } from "./supabase-auth";

export async function requireLearner(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return { ok: false as const, status: 401, error: "authentication_required" };
  const accessToken = match[1];
  const user = await getSupabaseUser(accessToken);
  if (!user?.id) return { ok: false as const, status: 401, error: "invalid_session" };
  return { ok: true as const, accessToken, user };
}

export async function requireLessonAccess(accessToken: string, courseSlug: string, lessonSlug: string) {
  const access = await userRpc(accessToken, "academy_lesson_access", {
    p_course_slug: courseSlug,
    p_lesson_slug: lessonSlug
  });
  return access;
}

export async function academyRuntimeRequest(path: string, body: Record<string, unknown>) {
  const base = (process.env.ACADEMY_LAB_SERVICE_URL || "https://api.zdxai.us/academy-lab").replace(/\/$/, "");
  const token = process.env.ACADEMY_WORKER_TOKEN;
  if (!token) throw new Error("Academy worker token is not configured");

  const response = await fetch(base + path, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(data?.error || `Academy runtime failed (${response.status})`);
  return data;
}
