import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/api/cron/daily-course") {
    const auth = req.headers.get("authorization");
    const accepted = [process.env.CRON_SECRET, process.env.ACADEMY_WORKER_TOKEN]
      .filter(Boolean)
      .some(secret => auth === `Bearer ${secret}`);
    if (!accepted) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/api/cron/daily-course"] };
