import Link from "next/link";

export default function Home() {
  return (
    <main>
      <section className="shell hero">
        <p className="eyebrow">SERIOUS TECHNICAL EDUCATION</p>
        <h1>Learn the real system, not a watered-down imitation.</h1>
        <p className="lede">ZeroDriveX Academy teaches real mechanisms, real tooling and reproducible analysis. Learning is free. Verified credentials are inexpensive and cryptographically verifiable.</p>
        <div className="actions">
          <Link className="button" href="/courses">Explore courses</Link>
          <Link className="button secondary" href="/verify">Verify a certificate</Link>
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
          <p className="eyebrow">VERIFIABLE CREDENTIALS</p>
          <h2>Employers should be able to verify a certificate without trusting a screenshot.</h2>
          <p className="lede">Each verified credential is tied to a course version and cryptographic signature, with a public verification route and revocation status.</p>
        </div>
      </section>
    </main>
  );
}
