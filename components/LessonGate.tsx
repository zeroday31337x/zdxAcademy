"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../lib/supabase-browser";

export default function LessonGate({
  courseSlug,
  lessonSlug,
  children
}: {
  courseSlug: string;
  lessonSlug: string;
  children: ReactNode;
}) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [state, setState] = useState<"loading" | "signed_out" | "locked" | "allowed">("loading");
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    let canceled = false;
    (async () => {
      const { data: authData } = await sb.auth.getUser();
      if (canceled) return;
      if (!authData.user) {
        setState("signed_out");
        return;
      }
      const { data, error } = await sb.rpc("academy_lesson_access", {
        p_course_slug: courseSlug,
        p_lesson_slug: lessonSlug
      });
      if (canceled) return;
      if (error) {
        setDetail(error.message);
        setState("locked");
        return;
      }
      setDetail(data);
      setState(data?.allowed ? "allowed" : "locked");
    })();
    return () => { canceled = true; };
  }, [sb, courseSlug, lessonSlug]);

  if (state === "loading") {
    return <main className="shell"><div className="notice">Checking lesson progression…</div></main>;
  }
  if (state === "signed_out") {
    return (
      <main className="shell">
        <p className="eyebrow">LEARNER SESSION REQUIRED</p>
        <h1>Sign in to start this course.</h1>
        <p className="lede">Academy tracks checkpoints, lab verification, and lesson unlocks so the course progresses in order.</p>
        <Link className="button" href="/login">Sign in or create an account</Link>
      </main>
    );
  }
  if (state === "locked") {
    return (
      <main className="shell">
        <p className="eyebrow">LESSON LOCKED</p>
        <h1>Complete the previous learning requirement first.</h1>
        <p className="lede">
          Lessons unlock sequentially. Pass the previous checkpoint and complete its lab if one is required.
        </p>
        {detail?.completed_regular !== undefined && (
          <p className="muted">{detail.completed_regular} / {detail.total_regular} instructional lessons completed.</p>
        )}
        <Link className="button" href={"/courses/" + courseSlug}>Return to course map</Link>
      </main>
    );
  }

  return <>{children}</>;
}
