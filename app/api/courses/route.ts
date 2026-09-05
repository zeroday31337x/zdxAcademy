import { NextResponse } from "next/server";
import { getCourses } from "../../../lib/db";

export async function GET() {
  return NextResponse.json({ courses: await getCourses() });
}
