import { NextRequest, NextResponse } from "next/server";
import { rest } from "../../../../lib/db";
import { academyWorkerRpc } from "../../../../lib/worker-rpc";

const topics = [
  ["Linux Process and Memory Internals","linux-process-memory-internals","Systems","intermediate"],
  ["HTTP, TLS and the Modern Web Request","http-tls-modern-web-request","Networking","intermediate"],
  ["Git Internals: Objects, References and History","git-internals-objects-references-history","Development","intermediate"],
  ["SQLite Internals and Durable Transactions","sqlite-internals-durable-transactions","Databases","intermediate"],
  ["PostgreSQL MVCC and Transaction Isolation","postgresql-mvcc-transaction-isolation","Databases","advanced"],
  ["Containers: Namespaces, Cgroups and Isolation","containers-namespaces-cgroups-isolation","Systems","advanced"],
  ["DNS Resolution from Stub Resolver to Authoritative Server","dns-resolution-internals","Networking","intermediate"],
  ["ELF Binary Internals","elf-binary-internals","Binary Analysis","advanced"],
  ["Python Execution: Bytecode, Frames and the VM","python-bytecode-frames-vm","Programming Languages","intermediate"],
  ["Web Authentication: Sessions, Cookies and Tokens","web-auth-sessions-cookies-tokens","Security","intermediate"],
  ["Cryptographic Hashes, MACs and Digital Signatures","hashes-macs-digital-signatures","Security","intermediate"],
  ["TCP Reliability, Flow and Congestion Control","tcp-reliability-flow-congestion","Networking","advanced"],
  ["JavaScript Event Loop and Asynchronous Execution","javascript-event-loop-async-execution","Programming Languages","intermediate"],
  ["Operating System File Descriptors and I/O","file-descriptors-io-internals","Systems","intermediate"]
] as const;

export async function GET(req: NextRequest) {
  const authorization = req.headers.get("authorization");
  const accepted = [process.env.CRON_SECRET, process.env.ACADEMY_WORKER_TOKEN]
    .filter((value): value is string => Boolean(value))
    .some((value) => authorization === `Bearer ${value}`);
  if (!accepted) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [title, slug, category, difficulty] = topics[Math.floor(Date.now()/86400000) % topics.length];
  const existing = await rest(`academy_courses?slug=eq.${encodeURIComponent(slug)}&select=id,status&limit=1`);
  if (existing[0]) return NextResponse.json({ ok:true, skipped:"course already exists", courseId:existing[0].id });

  const created = await rest("academy_courses", { method:"POST", headers:{ Prefer:"return=representation" }, body:JSON.stringify({
    slug,title,summary:`Evidence-grounded technical course on ${title}.`,description:"Daily ZeroDriveX Academy course generated through research, course construction, and independent technical review.",category,difficulty,canonical_language:"en",status:"draft",certificate_price_cents:499,is_learning_free:true,current_version:1,estimated_hours:4,prerequisites:[],learning_objectives:[],metadata:{generated_daily:true,pipeline_state:"vps_queued"}
  })});
  const course=created[0];
  const run=await academyWorkerRpc("academy_worker_enqueue", { p_course_id:course.id,p_agent_type:"research",p_input:{mode:"daily_course",autoPipeline:true,durable:true,executionPlane:"vps",title,category,difficulty,objective:"Research this topic from authoritative primary sources, then build a rigorous free technical course with reproducible labs, assessments, and dynamic instances where useful."} });
  return NextResponse.json({ok:true,courseId:course.id,researchRun:run,executionPlane:"vps"},{status:202});
}
