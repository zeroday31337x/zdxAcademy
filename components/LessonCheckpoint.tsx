"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "../lib/supabase-browser";

type Question = {
  id: string;
  ordinal: number;
  prompt: string;
  question_type: string;
  options: string[];
  points: number;
};

export default function LessonCheckpoint({
  courseSlug,
  lessonSlug,
  lessonType
}: {
  courseSlug: string;
  lessonSlug: string;
  lessonType: string;
}) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [assessment, setAssessment] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let canceled = false;
    sb.rpc("academy_get_assessment", {
      p_course_slug: courseSlug,
      p_lesson_slug: lessonSlug
    }).then(({ data, error }: any) => {
      if (canceled) return;
      if (error) setError(error.message);
      else setAssessment(data);
    });
    return () => { canceled = true; };
  }, [sb, courseSlug, lessonSlug]);

  async function submit() {
    if (!assessment?.lesson_id || submitting) return;
    setSubmitting(true);
    setError("");
    const { data, error } = await sb.rpc("academy_submit_assessment", {
      p_lesson_id: assessment.lesson_id,
      p_answers: answers
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setResult(data);
  }

  if (error && !assessment) {
    return <section className="checkpoint-card"><div className="notice">{error}</div></section>;
  }
  if (!assessment) {
    return <section className="checkpoint-card"><p className="muted">Loading checkpoint…</p></section>;
  }

  const questions: Question[] = Array.isArray(assessment.questions) ? assessment.questions : [];
  if (!questions.length) {
    return (
      <section className="checkpoint-card">
        <p className="eyebrow">LESSON CHECKPOINT</p>
        <h2>Checkpoint generation pending</h2>
        <p className="muted">This legacy lesson has not been upgraded with required questions yet.</p>
      </section>
    );
  }

  return (
    <section className="checkpoint-card">
      <p className="eyebrow">REQUIRED CHECKPOINT</p>
      <h2>Prove the lesson landed.</h2>
      <p className="muted">Score 80% or higher. Attempts are unlimited; the next lesson remains locked until you pass.</p>

      <div className="assessment-list compact">
        {questions.map((q) => (
          <article className="question-card" key={q.id}>
            <p className="eyebrow">QUESTION {q.ordinal}</p>
            <h3>{q.prompt}</h3>
            <div className="options">
              {(q.options || []).map((option, index) => (
                <label className="option" key={index}>
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === index}
                    onChange={() => setAnswers((current) => ({ ...current, [q.id]: index }))}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>

      <button
        className="button"
        onClick={submit}
        disabled={submitting || Object.keys(answers).length !== questions.length}
      >
        {submitting ? "Checking…" : "Submit checkpoint"}
      </button>

      {result && (
        <div className="verify-box result-box">
          <h3>{result.passed ? "Checkpoint passed" : "Review and try again"}</h3>
          <p className={result.passed ? "status-ok" : ""}><strong>Score:</strong> {result.score}%</p>
          <p>{result.correct_count} of {result.total_count} correct.</p>
          {result.passed && lessonType === "lab" && !result.lesson_completed && (
            <p className="muted">Checkpoint complete. The lab still has to pass server-side verification.</p>
          )}
          {result.passed && result.lesson_completed && (
            <p className="status-ok">Lesson complete. The next lesson is now unlocked.</p>
          )}
          {result.passed && <Link href={"/courses/" + courseSlug}>Open course map →</Link>}
        </div>
      )}
      {error && <div className="notice">{error}</div>}
    </section>
  );
}
