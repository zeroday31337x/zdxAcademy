import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/api/cron/daily-course") {
    const secret = process.env.CRON_SECRET || process.env.ACADEMY_WORKER_TOKEN;
    if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/api/cron/daily-course"] };
