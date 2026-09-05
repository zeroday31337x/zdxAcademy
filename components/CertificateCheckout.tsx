"use client";

import { useState } from "react";
import { supabaseBrowser } from "../lib/supabase-browser";

export default function CertificateCheckout({ courseSlug }: { courseSlug: string }) {
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function checkout() {
    const name = displayName.replace(/\s+/g, " ").trim();
    if (name.length < 2) {
      setMessage("Enter the name you want shown on the certificate.");
      return;
    }

    setBusy(true);
    setMessage("");

    const sb = supabaseBrowser();
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const res = await fetch("/api/certificates/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ courseSlug, displayName: name })
    });

    const body = await res.json();
    if (!res.ok) {
      if (body.verifyUrl) {
        window.location.href = body.verifyUrl;
        return;
      }
      setMessage(body.error || "Checkout could not be started.");
      setBusy(false);
      return;
    }

    window.location.href = body.checkoutUrl;
  }

  return (
    <div className="certificate-checkout">
      <label htmlFor="certificate-name">Name on certificate</label>
      <input
        id="certificate-name"
        value={displayName}
        onChange={e => setDisplayName(e.target.value)}
        placeholder="Your name"
        maxLength={100}
      />
      <button className="button" onClick={checkout} disabled={busy}>
        {busy ? "Starting checkout…" : "Buy verified certificate — $4.99"}
      </button>
      {message && <p className="muted">{message}</p>}
    </div>
  );
}
