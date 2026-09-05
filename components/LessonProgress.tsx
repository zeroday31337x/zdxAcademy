"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../lib/supabase-browser";

export default function LessonProgress({ courseSlug, lessonSlug }: { courseSlug: string; lessonSlug: string }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  const sb = supabaseBrowser();

  useEffect(() => {
    sb.auth.getUser().then(({ data }: any) => {
      setSignedIn(!!data.user);
      if (data.user) {
        sb.rpc("academy_my_course_progress", { p_course_slug: courseSlug }).then(({ data }: any) => {
          const row = data?.lessons?.find((x: any) => x.slug === lessonSlug);
          setDone(!!row?.completed);
        });
      }
    });
  }, [sb, courseSlug, lessonSlug]);

  async function markComplete() {
    setMessage("Saving…");
    const { error } = await sb.rpc("academy_mark_lesson_complete", {
      p_course_slug: courseSlug,
      p_lesson_slug: lessonSlug,
      p_evidence: { source: "lesson_page" }
    });
    if (error) setMessage(error.message);
    else {
      setDone(true);
      setMessage("Completed.");
    }
  }

  if (signedIn === null) return null;
  if (!signedIn) return <div className="notice"><Link href="/login">Sign in</Link> to save progress and earn a verified credential.</div>;
  return (
    <div className="progress-actions">
      <button className={done ? "button secondary" : "button"} onClick={markComplete} disabled={done}>
        {done ? "Completed" : "Mark lesson complete"}
      </button>
      {message && <span className="muted">{message}</span>}
    </div>
  );
}
