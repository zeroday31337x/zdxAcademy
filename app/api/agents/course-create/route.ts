import { NextResponse } from "next/server";
import { getCourse } from "../../../../lib/db";
import { academyWorkerRpc } from "../../../../lib/worker-rpc";

function allowed(req: Request) {
  const token = process.env.ACADEMY_ADMIN_TOKEN;
  return !!token && req.headers.get("authorization") === "Bearer " + token;
}

export async function POST(req: Request) {
  if (!allowed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const course = await getCourse(body.courseSlug);
  if (!course) return NextResponse.json({ error: "course_not_found" }, { status: 404 });

  const run = await academyWorkerRpc("academy_worker_enqueue", {
    p_course_id: course.id,
    p_agent_type: "course_creator",
    p_input: {
      researchRunIds: body.researchRunIds || [],
      requirements: body.requirements || {},
      autoPipeline: body.autoPipeline !== false
    }
  });
  return NextResponse.json({ run }, { status: 202 });
}
