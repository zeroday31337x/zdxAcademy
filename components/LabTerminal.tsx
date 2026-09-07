"use client";

import { FormEvent, useMemo, useState } from "react";
import { supabaseBrowser } from "../lib/supabase-browser";
import LessonMarkdown from "./LessonMarkdown";

type Entry = { command: string; stdout: string; stderr: string; exitCode: number };

export default function LabTerminal({
  courseSlug,
  lessonSlug
}: {
  courseSlug: string;
  lessonSlug: string;
}) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [sessionId, setSessionId] = useState("");
  const [lab, setLab] = useState<any>(null);
  const [command, setCommand] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [verification, setVerification] = useState<any>(null);

  async function accessToken() {
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Sign in before starting a lab.");
    return token;
  }

  async function api(path: string, body: any) {
    const token = await accessToken();
    const response = await fetch(path, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
    return data;
  }

  async function start() {
    setBusy(true);
    setMessage("Creating isolated lab container…");
    try {
      const data = await api("/api/labs/session", { courseSlug, lessonSlug });
      setSessionId(data.sessionId);
      setLab(data.lab);
      setMessage("Lab ready. Network is disabled and the workspace is temporary.");
      const hello = await api("/api/labs/exec", {
        sessionId: data.sessionId,
        command: "printf 'ZeroDriveX isolated lab\\n'; pwd; python3 --version; printf '\\nWorkspace:\\n'; ls -la"
      });
      setEntries([{ command: "session bootstrap", ...hello }]);
    } catch (e: any) {
      setMessage(e?.message || "Unable to start lab");
    } finally {
      setBusy(false);
    }
  }

  async function run(e?: FormEvent) {
    e?.preventDefault();
    if (!sessionId || !command.trim() || busy) return;
    const current = command;
    setCommand("");
    setBusy(true);
    try {
      const result = await api("/api/labs/exec", { sessionId, command: current });
      setEntries((items) => [...items, { command: current, ...result }].slice(-80));
    } catch (e: any) {
      setEntries((items) => [...items, {
        command: current,
        exitCode: 1,
        stdout: "",
        stderr: e?.message || "Command failed"
      }].slice(-80));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!sessionId || busy) return;
    setBusy(true);
    setMessage("Verifying required artifacts…");
    try {
      const result = await api("/api/labs/verify", { sessionId });
      setVerification(result);
      setMessage(result.passed
        ? (result.progress?.completed
            ? "Lab verified and checkpoint satisfied. Lesson complete."
            : "Lab verified. Pass the lesson checkpoint to unlock the next lesson.")
        : "Verification failed. Inspect the checks below and keep working.");
    } catch (e: any) {
      setMessage(e?.message || "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="lab-panel">
      <div className="lab-heading">
        <div>
          <p className="eyebrow">ISOLATED LAB</p>
          <h2>{lab?.title || "Hands-on workspace"}</h2>
        </div>
        <div className="lab-isolation-badges">
          <span className="tag">No network</span>
          <span className="tag">512 MB RAM</span>
          <span className="tag">1 CPU</span>
          <span className="tag">128 PIDs</span>
          <span className="tag">No host mounts</span>
        </div>
      </div>

      {!sessionId ? (
        <>
          <p className="muted">A disposable non-root container is created only when you start the lab. It is destroyed after 30 minutes of inactivity.</p>
          <button className="button" onClick={start} disabled={busy}>
            {busy ? "Starting…" : "Start isolated lab"}
          </button>
        </>
      ) : (
        <>
          {lab?.instructionsMarkdown && (
            <div className="lab-instructions">
              <LessonMarkdown markdown={lab.instructionsMarkdown} />
            </div>
          )}
          <p className="muted"><strong>Environment:</strong> {lab?.environment || "Linux / Python"}</p>
          {!!lab?.expectedArtifacts?.length && (
            <p className="muted">
              <strong>Required artifacts:</strong>{" "}
              {lab.expectedArtifacts.map((x: any) => x.name).filter(Boolean).join(", ")}
            </p>
          )}

          <div className="terminal">
            <div className="terminal-title">zdx-academy-lab · {sessionId.slice(0, 8)}</div>
            <div className="terminal-output">
              {entries.map((entry, index) => (
                <div className="terminal-entry" key={index}>
                  <div className="terminal-command"><span>$</span> {entry.command}</div>
                  {entry.stdout && <pre>{entry.stdout}</pre>}
                  {entry.stderr && <pre className="terminal-error">{entry.stderr}</pre>}
                  {entry.exitCode !== 0 && <div className="terminal-exit">exit {entry.exitCode}</div>}
                </div>
              ))}
            </div>
            <form className="terminal-input-row" onSubmit={run}>
              <span>$</span>
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Enter a shell command"
                autoComplete="off"
                spellCheck={false}
                disabled={busy}
              />
              <button type="submit" disabled={busy || !command.trim()}>Run</button>
            </form>
          </div>

          <div className="actions">
            <button className="button" onClick={verify} disabled={busy}>Verify lab artifacts</button>
            <button className="button secondary" onClick={() => setCommand("ls -la")}>List workspace</button>
          </div>
        </>
      )}

      {message && <div className="notice">{message}</div>}
      {verification && (
        <div className="verify-box">
          <h3>{verification.passed ? "Lab verification passed" : "Lab verification incomplete"}</h3>
          {(verification.checks || []).map((check: any, index: number) => (
            <pre className="lab-check" key={index}>{JSON.stringify(check, null, 2)}</pre>
          ))}
        </div>
      )}
    </section>
  );
}
