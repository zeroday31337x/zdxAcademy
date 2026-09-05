"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../../../../lib/supabase-browser";

type Question = {
  id: string;
  ordinal: number;
  prompt: string;
  question_type: string;
  options: string[];
  points: number;
};

export default function AssessmentPage({ params }: { params: Promise<{ course: string; lesson: string }> }) {
  const [course, setCourse] = useState("");
  const [lesson, setLesson] = useState("");
  const [assessment, setAssessment] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const sb = supabaseBrowser();

  useEffect(() => {
    params.then(async p => {
      setCourse(p.course);
      setLesson(p.lesson);
      const { data, error } = await sb.rpc("academy_get_assessment", {
        p_course_slug: p.course,
        p_lesson_slug: p.lesson
      });
      if (error) setError(error.message);
      else setAssessment(data);
      const user = await sb.auth.getUser();
      setSignedIn(!!user.data.user);
    });
  }, [params, sb]);

  async function submit() {
    if (!assessment?.lesson_id) return;
    setError("");
    const payload: Record<string, number> = {};
    for (const [id, value] of Object.entries(answers)) payload[id] = value;
    const { data, error } = await sb.rpc("academy_submit_assessment", {
      p_lesson_id: assessment.lesson_id,
      p_answers: payload
    });
    if (error) setError(error.message);
    else setResult(data);
  }

  if (error && !assessment) return <main className="shell"><h1>Assessment unavailable</h1><p>{error}</p></main>;
  if (!assessment) return <main className="shell"><p>Loading assessment…</p></main>;

  return (
    <main className="shell">
      <p className="eyebrow">FINAL ASSESSMENT</p>
      <h1>{assessment.title}</h1>
      <p className="lede">A score of 80% is required. The capstone remains a separate credential requirement.</p>

      {signedIn === false && <div className="notice"><Link href="/login">Sign in</Link> before submitting your assessment.</div>}

      <div className="assessment-list">
        {assessment.questions.map((q: Question) => (
          <section className="question-card" key={q.id}>
            <p className="eyebrow">QUESTION {q.ordinal}</p>
            <h3>{q.prompt}</h3>
            <div className="options">
              {q.options?.map((option, index) => (
                <label key={index} className="option">
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === index}
                    onChange={() => setAnswers({ ...answers, [q.id]: index })}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>

      <button
        className="button"
        onClick={submit}
        disabled={!signedIn || Object.keys(answers).length !== assessment.questions.length}
      >
        Submit assessment
      </button>

      {result && (
        <div className="verify-box result-box">
          <h2>{result.passed ? "Passed" : "Not passed yet"}</h2>
          <p className={result.passed ? "status-ok" : ""}><strong>Score:</strong> {result.score}%</p>
          <p>{result.correct_count} of {result.total_count} questions correct.</p>
          {!result.passed && <p className="muted">Review the course material and try again. Attempts are not artificially limited.</p>}
        </div>
      )}
      {error && <p className="notice">{error}</p>}
    </main>
  );
}
