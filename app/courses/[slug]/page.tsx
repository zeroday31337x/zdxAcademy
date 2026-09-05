import Link from "next/link";
import { getCourseStructure } from "../../../lib/db";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getCourseStructure(slug);
  if (!data) return <main className="shell"><h1>Course not found</h1></main>;
  const { course, modules } = data;
  return (
    <main className="shell">
      <p className="eyebrow">{course.category} · {course.difficulty}</p>
      <h1>{course.title}</h1>
      <p className="lede">{course.description}</p>
      <div className="course-meta">
        <span className="tag free">All learning material free</span>
        <span className="tag">{"$" + (course.certificate_price_cents / 100).toFixed(2)} verified credential</span>
        <span className="tag">Version {course.current_version}</span>
      </div>
      <div className="notice">The credential is optional. You do not need to pay to access the course material.</div>
      {modules.map((m: any) => (
        <section className="module" key={m.id}>
          <p className="eyebrow">MODULE {m.ordinal}</p>
          <h2>{m.title}</h2>
          <p className="muted">{m.summary}</p>
          {m.lessons.map((l: any) => (
            <Link className="lesson-link" key={l.id} href={"/learn/" + course.slug + "/" + l.slug}>
              <span>{l.title}</span><span>{l.lesson_type} · {l.estimated_minutes || "—"} min</span>
            </Link>
          ))}
        </section>
      ))}
    </main>
  );
}
