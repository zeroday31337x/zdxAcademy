import { NextRequest, NextResponse } from "next/server";
import { rest } from "../../../../lib/db";
import { academyWorkerRpc } from "../../../../lib/worker-rpc";

const topics = [
  { title: "Linux Process and Memory Internals", slug: "linux-process-memory-internals", category: "Systems", difficulty: "intermediate", sources: ["https://docs.kernel.org/mm/index.html", "https://man7.org/linux/man-pages/man5/proc_pid_maps.5.html"] },
  { title: "HTTP, TLS and the Modern Web Request", slug: "http-tls-modern-web-request", category: "Networking", difficulty: "intermediate", sources: ["https://www.rfc-editor.org/rfc/rfc9110", "https://www.rfc-editor.org/rfc/rfc8446"] },
  { title: "Git Internals: Objects, References and History", slug: "git-internals-objects-references-history", category: "Development", difficulty: "intermediate", sources: ["https://git-scm.com/book/en/v2/Git-Internals-Git-Objects", "https://git-scm.com/docs/gitrepository-layout"] },
  { title: "SQLite Internals and Durable Transactions", slug: "sqlite-internals-durable-transactions", category: "Databases", difficulty: "intermediate", sources: ["https://www.sqlite.org/fileformat.html", "https://www.sqlite.org/wal.html"] },
  { title: "PostgreSQL MVCC and Transaction Isolation", slug: "postgresql-mvcc-transaction-isolation", category: "Databases", difficulty: "advanced", sources: ["https://www.postgresql.org/docs/current/mvcc.html", "https://www.postgresql.org/docs/current/transaction-iso.html"] },
  { title: "Containers: Namespaces, Cgroups and Isolation", slug: "containers-namespaces-cgroups-isolation", category: "Systems", difficulty: "advanced", sources: ["https://docs.kernel.org/admin-guide/cgroup-v2.html", "https://man7.org/linux/man-pages/man7/namespaces.7.html"] },
  { title: "DNS Resolution from Stub Resolver to Authoritative Server", slug: "dns-resolution-internals", category: "Networking", difficulty: "intermediate", sources: ["https://www.rfc-editor.org/rfc/rfc1034", "https://www.rfc-editor.org/rfc/rfc1035"] },
  { title: "ELF Binary Internals", slug: "elf-binary-internals", category: "Binary Analysis", difficulty: "advanced", sources: ["https://refspecs.linuxfoundation.org/elf/gabi4+/contents.html", "https://man7.org/linux/man-pages/man5/elf.5.html"] },
  { title: "Python Execution: Bytecode, Frames and the VM", slug: "python-bytecode-frames-vm", category: "Programming Languages", difficulty: "intermediate", sources: ["https://docs.python.org/3/library/dis.html", "https://docs.python.org/3/reference/executionmodel.html"] },
  { title: "Web Authentication: Sessions, Cookies and Tokens", slug: "web-auth-sessions-cookies-tokens", category: "Security", difficulty: "intermediate", sources: ["https://www.rfc-editor.org/rfc/rfc6265", "https://www.rfc-editor.org/rfc/rfc7519"] },
  { title: "Cryptographic Hashes, MACs and Digital Signatures", slug: "hashes-macs-digital-signatures", category: "Security", difficulty: "intermediate", sources: ["https://www.rfc-editor.org/rfc/rfc2104", "https://www.rfc-editor.org/rfc/rfc8032"] },
  { title: "TCP Reliability, Flow and Congestion Control", slug: "tcp-reliability-flow-congestion", category: "Networking", difficulty: "advanced", sources: ["https://www.rfc-editor.org/rfc/rfc9293", "https://www.rfc-editor.org/rfc/rfc5681"] },
  { title: "JavaScript Event Loop and Asynchronous Execution", slug: "javascript-event-loop-async-execution", category: "Programming Languages", difficulty: "intermediate", sources: ["https://html.spec.whatwg.org/multipage/webappapis.html#event-loops", "https://tc39.es/ecma262/"] },
  { title: "Operating System File Descriptors and I/O", slug: "file-descriptors-io-internals", category: "Systems", difficulty: "intermediate", sources: ["https://man7.org/linux/man-pages/man2/open.2.html", "https://man7.org/linux/man-pages/man2/read.2.html"] }
];

function textFromHtml(raw: string) {
  return raw.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim().slice(0, 12000);
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const day = Math.floor(Date.now() / 86400000);
  const topic = topics[day % topics.length];
  const existing = await rest(`academy_courses?slug=eq.${encodeURIComponent(topic.slug)}&select=id,status&limit=1`);
  if (existing[0]) return NextResponse.json({ ok: true, skipped: "course already exists", courseId: existing[0].id });

  const created = await rest("academy_courses", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({
    slug: topic.slug, title: topic.title, summary: `Evidence-grounded technical course on ${topic.title}.`, description: "Daily ZeroDriveX Academy course generated through research, course construction, and independent technical review.", category: topic.category, difficulty: topic.difficulty, canonical_language: "en", status: "draft", certificate_price_cents: 499, is_learning_free: true, current_version: 1, estimated_hours: 4, prerequisites: [], learning_objectives: [], metadata: { generated_daily: true, pipeline_state: "research" }
  }) });
  const course = created[0];

  for (const sourceUrl of topic.sources) {
    try {
      const res = await fetch(sourceUrl, { headers: { "User-Agent": "ZeroDriveX-Academy-Research/1.0" }, signal: AbortSignal.timeout(12000) });
      const raw = await res.text();
      const excerpt = textFromHtml(raw);
      await rest("academy_research_sources", { method: "POST", body: JSON.stringify({ course_id: course.id, url: sourceUrl, title: sourceUrl, source_type: "primary", publisher: new URL(sourceUrl).hostname, retrieved_at: new Date().toISOString(), content_excerpt: excerpt, notes: `Fetched by daily research pipeline; HTTP ${res.status}.`, metadata: { http_status: res.status } }) });
    } catch (error: any) {
      await rest("academy_research_sources", { method: "POST", body: JSON.stringify({ course_id: course.id, url: sourceUrl, title: sourceUrl, source_type: "primary", publisher: new URL(sourceUrl).hostname, retrieved_at: new Date().toISOString(), content_excerpt: "", notes: `Source fetch failed: ${String(error?.message || error).slice(0,300)}`, metadata: { fetch_failed: true } }) });
    }
  }

  const run = await academyWorkerRpc("academy_worker_enqueue", { p_course_id: course.id, p_agent_type: "research", p_input: { mode: "daily_course", autoPipeline: true, objective: "Build a rigorous free technical course from the supplied primary-source evidence. Include reproducible labs and assessments. Use dynamic assessment/lab design where variable instances improve learning integrity." } });
  return NextResponse.json({ ok: true, courseId: course.id, researchRun: run });
}
