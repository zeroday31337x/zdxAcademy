"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabaseBrowser } from "../../lib/supabase-browser";

export default function LoginPage() {
  const sb = supabaseBrowser();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "signup") setMode("signup");
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage("Working…");

    if (mode === "signup") {
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) return setMessage(error.message);
      if (data.session) window.location.href = "/dashboard";
      else setMessage("Account created. Check your email if confirmation is required.");
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) return setMessage(error.message);
      window.location.href = "/dashboard";
    }
  }

  return (
    <main className="shell">
      <p className="eyebrow">FREE LEARNER ACCOUNT</p>
      <h1>{mode === "login" ? "Continue learning." : "Create your free learner account."}</h1>
      <p className="lede">Registration and all Academy coursework are free. Payment is only required if you choose optional verified certification.</p>
      <div className="verify-box">
        <form onSubmit={submit}>
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />
          <button className="button" type="submit">{mode === "login" ? "Sign in" : "Create free account"}</button>
        </form>
        <button className="link-button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Need an account? Create one free." : "Already have an account? Sign in."}
        </button>
        {message && <p className="muted">{message}</p>}
      </div>
    </main>
  );
}
