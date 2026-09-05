"use client";
import { FormEvent, useState } from "react";

export default function VerifyPage() {
  const [credential, setCredential] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    if (credential.trim()) window.location.href = "/verify/" + encodeURIComponent(credential.trim());
  }
  return (
    <main className="shell">
      <p className="eyebrow">PUBLIC CREDENTIAL VERIFICATION</p>
      <h1>Verify a ZeroDriveX Academy certificate.</h1>
      <div className="verify-box">
        <form onSubmit={submit}>
          <label htmlFor="credential">Credential ID</label>
          <input id="credential" value={credential} onChange={e => setCredential(e.target.value)} placeholder="ZDXA-..." />
          <button className="button" type="submit">Verify credential</button>
        </form>
        <p className="muted">No employer account is required.</p>
      </div>
    </main>
  );
}
