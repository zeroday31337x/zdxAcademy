import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { getLesson } from "../../../../lib/db";
import LessonProgress from "../../../../components/LessonProgress";

export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
  searchParams
}: {
  params: Promise<{ course: string; lesson: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { course, lesson } = await params;
  const { lang = "en" } = await searchParams;
  const data = await getLesson(course, lesson, lang);

  if (!data || !data.lesson) return <main className="shell"><h1>Lesson not found</h1></main>;

  const basePath = "/learn/" + data.course.slug + "/" + data.lesson.slug;

  return (
    <main className="shell">
      <p className="eyebrow">{data.course.title} · {data.module.title}</p>

      <div className="language-row">
        <span className="muted">Language:</span>
        <Link className={lang === "en" ? "lang-active" : ""} href={basePath}>English</Link>
        {(data.availableTranslations || []).map((t: any) => (
          <Link
            key={t.language_code}
            className={lang === t.language_code ? "lang-active" : ""}
            href={basePath + "?lang=" + encodeURIComponent(t.language_code)}
          >
            {t.language_code.toUpperCase()}
          </Link>
        ))}
      </div>

      <article className="prose">
        <h1>{data.lesson.title}</h1>
        {data.lesson.language_code && data.lesson.canonical_title && (
          <p className="muted">Canonical title: {data.lesson.canonical_title}</p>
        )}
        {data.lesson.safety_notes && <div className="notice">{data.lesson.safety_notes}</div>}
        <ReactMarkdown>{data.lesson.body_markdown}</ReactMarkdown>
      </article>

      {data.lesson.lesson_type === "exam" ? (
        <div className="actions">
          <Link className="button" href={"/assess/" + data.course.slug + "/" + data.lesson.slug}>Take final assessment</Link>
          <Link className="button secondary" href={"/courses/" + data.course.slug}>Course outline</Link>
        </div>
      ) : data.lesson.lesson_type === "capstone" ? (
        <div className="actions">
          <Link className="button" href={"/capstone/" + data.course.slug}>Submit capstone evidence</Link>
          <Link className="button secondary" href={"/courses/" + data.course.slug}>Course outline</Link>
        </div>
      ) : (
        <>
          <LessonProgress courseSlug={data.course.slug} lessonSlug={data.lesson.slug} />
          <div className="actions">
            <Link className="button secondary" href={"/courses/" + data.course.slug}>Course outline</Link>
          </div>
        </>
      )}
    </main>
  );
}
