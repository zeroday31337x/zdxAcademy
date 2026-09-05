"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../../../lib/supabase-browser";

export default function CapstonePage({ params }: { params: Promise<{ course: string }> }) {
  const sb = supabaseBrowser();
  const [course, setCourse] = useState("");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [sampleHash, setSampleHash] = useState("");
  const [report, setReport] = useState("");
  const [parserUrl, setParserUrl] = useState("");
  const [artifactHashes, setArtifactHashes] = useState("");
  const [limitations, setLimitations] = useState("");
  const [message, setMessage] = useState("");
  const [submission, setSubmission] = useState<any>(null);

  useEffect(() => {
    params.then(p => setCourse(p.course));
    sb.auth.getUser().then(({ data }: any) => setSignedIn(!!data.user));
  }, [params, sb]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage("Submitting for review…");

    const evidence = {
      sample_sha256: sampleHash.trim(),
      analysis_report_markdown: report.trim(),
      parser_or_code_url: parserUrl.trim() || null,
      artifact_hashes: artifactHashes.split(/\n+/).map(x => x.trim()).filter(Boolean),
      limitations: limitations.trim(),
      submitted_from: "academy_capstone_form"
    };

    const { data, error } = await sb.rpc("academy_submit_capstone", {
      p_course_slug: course,
      p_evidence: evidence
    });

    if (error) {
      setMessage(error.message);
      return;
    }
    setSubmission(data);
    setMessage("Submitted. The independent reviewer agent will analyze the evidence package; final credential approval remains separate.");
  }

  if (signedIn === false) {
    return <main className="shell"><h1>Capstone submission</h1><div className="notice"><Link href="/login">Sign in</Link> to submit your capstone.</div></main>;
  }

  return (
    <main className="shell">
      <p className="eyebrow">CAPSTONE EVIDENCE</p>
      <h1>Submit work another technical person can reproduce.</h1>
      <p className="lede">The capstone is not a checkbox. Your evidence package is reviewed independently before it can satisfy the credential requirement.</p>

      <form className="capstone-form" onSubmit={submit}>
        <label>Sample SHA-256</label>
        <input value={sampleHash} onChange={e => setSampleHash(e.target.value)} minLength={64} maxLength={64} required />

        <label>Analysis report</label>
        <textarea value={report} onChange={e => setReport(e.target.value)} rows={18} required placeholder="Include file identity, load commands, mappings, linking/signing/runtime observations, behavior hypotheses and the evidence supporting each one." />

        <label>Parser or code URL <span className="muted">(optional)</span></label>
        <input type="url" value={parserUrl} onChange={e => setParserUrl(e.target.value)} placeholder="https://…" />

        <label>Artifact hashes <span className="muted">(one per line)</span></label>
        <textarea value={artifactHashes} onChange={e => setArtifactHashes(e.target.value)} rows={5} />

        <label>What cannot be concluded from your evidence?</label>
        <textarea value={limitations} onChange={e => setLimitations(e.target.value)} rows={7} required />

        <button className="button" type="submit" disabled={!signedIn}>Submit capstone</button>
      </form>

      {message && <div className="notice">{message}</div>}
      {submission && <p className="muted">Submission ID: <code>{submission.id}</code></p>}
    </main>
  );
}
