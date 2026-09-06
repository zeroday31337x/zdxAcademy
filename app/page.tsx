import Link from "next/link";
import { getCourses } from "../lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const courses = await getCourses();

  return (
    <main>
      <section className="academy-hero">
        <div className="academy-hero-overlay" />
        <div className="shell academy-hero-content">
          <p className="eyebrow">100% FREE TECHNICAL EDUCATION</p>
          <h1>Learn the real system, not a watered-down imitation.</h1>
          <p className="lede">ZeroDriveX Academy teaches real mechanisms, real tooling and reproducible analysis. Every course is free to learn. We only charge for optional verified certification for employers or schools.</p>
          <div className="actions academy-primary-actions">
            <Link className="button" href="/login?mode=signup">Create free account</Link>
            <Link className="button secondary" href="#courses">View free courses</Link>
          </div>
          <p className="hero-free-note">No tuition. No course fee. Learn for free.</p>
        </div>
      </section>

      <section className="section landing-courses" id="courses">
        <div className="shell">
          <p className="eyebrow">FREE COURSES</p>
          <h2>Start learning now.</h2>
          <p className="lede">The coursework is free. Certification is optional and is the only paid part of the Academy.</p>
          <div className="course-list landing-course-list">
            {courses.map((c: any) => (
              <article className="course-card" key={c.id}>
                <Link href={"/courses/" + c.slug}><h3>{c.title}</h3></Link>
                <p className="muted">{c.summary}</p>
                <div className="course-meta">
                  <span className="tag free">FREE COURSE</span>
                  <span className="tag">{c.difficulty}</span>
                  <span className="tag">{c.estimated_hours} hours</span>
                </div>
                <Link className="course-start-link" href={"/courses/" + c.slug}>View course →</Link>
              </article>
            ))}
          </div>
          <div className="actions">
            <Link className="button" href="/login?mode=signup">Register free</Link>
            <Link className="button secondary" href="/courses">See all courses</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <p className="eyebrow">ACADEMY STANDARD</p>
          <div className="grid">
            <article className="card"><span>01</span><h3>Technical integrity</h3><p className="muted">We teach the real architecture and real mechanisms. We do not replace missing detail with fake information.</p></article>
            <article className="card"><span>02</span><h3>Evidence over theater</h3><p className="muted">Labs produce parsers, reports, traces, code and other artifacts that demonstrate understanding.</p></article>
            <article className="card"><span>03</span><h3>Translation without distortion</h3><p className="muted">Translations preserve technical meaning, terminology, code, citations and assessment intent.</p></article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <p className="eyebrow">OPTIONAL VERIFIED CERTIFICATION</p>
          <h2>Learning is free. Verification is what we charge for.</h2>
          <p className="lede">Learners can complete Academy coursework without paying. Optional credentials are cryptographically verifiable so employers and schools can confirm the certificate, course version and revocation status instead of trusting a screenshot.</p>
          <div className="actions">
            <Link className="button secondary" href="/verify">Verify a certificate</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
