import Link from "next/link";
import { getCourses } from "../../lib/db";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const courses = await getCourses();
  return (
    <main className="shell">
      <p className="eyebrow">COURSES</p>
      <h1>Learn by understanding the machinery.</h1>
      <div className="course-list">
        {courses.map((c: any) => (
          <article className="course-card" key={c.id}>
            <Link href={"/courses/" + c.slug}><h2>{c.title}</h2></Link>
            <p className="muted">{c.summary}</p>
            <div className="course-meta">
              <span className="tag">{c.difficulty}</span>
              <span className="tag">{c.estimated_hours} hours</span>
              {c.is_learning_free && <span className="tag free">Learning free</span>}
              <span className="tag">{"$" + (c.certificate_price_cents / 100).toFixed(2)} verified certificate</span>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
