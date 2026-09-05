export default function AdminPage() {
  return (
    <main className="shell">
      <p className="eyebrow">ACADEMY OPERATIONS</p>
      <h1>Research, create, review, translate, publish.</h1>
      <div className="admin-grid">
        <article className="card"><h3>Research Agent</h3><p className="muted">Build source packets and evidence for new or revised courses.</p></article>
        <article className="card"><h3>Course Creation Agent</h3><p className="muted">Turn approved research into versioned modules, lessons, labs and assessments.</p></article>
        <article className="card"><h3>Review Queue</h3><p className="muted">Technical review remains separate from generation.</p></article>
        <article className="card"><h3>Translation Queue</h3><p className="muted">Generate language variants while tracking source lesson hashes.</p></article>
        <article className="card"><h3>Certificates</h3><p className="muted">Issue, verify, rotate signing keys and revoke credentials when necessary.</p></article>
        <article className="card"><h3>Analytics</h3><p className="muted">Connect learning, certification and acquisition metrics to the publication-intelligence database.</p></article>
      </div>
    </main>
  );
}
