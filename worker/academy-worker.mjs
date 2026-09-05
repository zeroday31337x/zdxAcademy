import crypto from "node:crypto";
const sleep = ms => new Promise(r => setTimeout(r, ms));

const SUPABASE_URL = process.env.ACADEMY_SUPABASE_URL;
const SUPABASE_KEY = process.env.ACADEMY_SUPABASE_PUBLISHABLE_KEY;
const TOKEN = process.env.ACADEMY_WORKER_TOKEN;
const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.ACADEMY_AI_MODEL || "openai/gpt-oss-120b";
const POLL_MS = Number(process.env.ACADEMY_WORKER_POLL_MS || 5000);

if (!SUPABASE_URL || !SUPABASE_KEY || !TOKEN) throw new Error("academy worker database configuration missing");
if (!GROQ_KEY) throw new Error("GROQ_API_KEY missing");

async function rpc(fn, body) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + fn, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(fn + " failed " + res.status + ": " + JSON.stringify(data));
  return data;
}

function jsonFromModel(text) {
  if (!text) throw new Error("empty model response");
  let s = text.trim();
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) s = fence[1];
  try { return JSON.parse(s); } catch {}
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a >= 0 && b > a) return JSON.parse(s.slice(a,b+1));
  return { structured: false, raw_text: s, parse_warning: "model returned non-JSON output" };
}

let lastModelUsed = GROQ_MODEL;

async function llm(system, user) {
  const models = [...new Set([GROQ_MODEL, "openai/gpt-oss-20b"])];
  let lastError = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + GROQ_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          temperature: 0.15,
          max_completion_tokens: 2800,
          ...(attempt === 0 ? { response_format: { type: "json_object" } } : {}),
          messages: [
            { role: "system", content: system },
            { role: "user", content: user }
          ]
        })
      });

      const text = await res.text();
      if (res.ok) {
        const data = JSON.parse(text);
        lastModelUsed = model;
        return jsonFromModel(data.choices?.[0]?.message?.content || "");
      }

      lastError = new Error("Groq " + res.status + " (" + model + "): " + text.slice(0,500));

      if (res.status === 429) {
        const retryHeader = Number(res.headers.get("retry-after") || 0);
        const waitMs = retryHeader > 0 ? retryHeader * 1000 : 2500 * (attempt + 1);
        await sleep(Math.min(waitMs, 10000));
        continue;
      }

      if (res.status === 413) break;
      if (res.status === 400 && text.includes("json_validate_failed")) {
        await sleep(500);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error("all Groq model attempts failed");
}

const principles = [
  "Teach real technical mechanisms and preserve factual truth.",
  "Never invent a fake technical explanation to replace omitted procedural detail.",
  "Prefer primary sources and reproducible evidence.",
  "Separate observations, evidence, inference, and uncertainty.",
  "Never invent API names, load-command constants, structure names, or signing slots.",
  "For this Mach-O course: do not claim LC_ENTITLEMENTS or LC_RELOC exists unless a supplied primary-source excerpt explicitly defines it.",
  "Labs should produce useful artifacts rather than only trivia.",
  "Canonical course material must be translation-ready without technical distortion."
].join("\n- ");

function sourceGuard(output, sources) {
  const rendered = JSON.stringify(output);
  const identifiers = [...new Set(rendered.match(/\b(?:LC|MH|FAT|CSMAGIC|CSSLOT)_[A-Z0-9_]+\b/g) || [])];
  const sourceText = JSON.stringify((sources || []).map(s => ({
    title: s.title,
    url: s.url,
    excerpt: s.content_excerpt,
    notes: s.notes
  })));
  const unverified = identifiers.filter(id => !sourceText.includes(id));
  return {
    identifiers_found: identifiers,
    unverified_identifiers: unverified,
    rule: "Unverified means the supplied source packet did not establish the identifier; it must be checked before publication."
  };
}

function translationInvariantGuard(original, translated) {
  const collect = text => {
    const s = String(text || "");
    const code = [...s.matchAll(/`([^`\n]+)`/g)].map(m => m[1]);
    const urls = s.match(/https?:\/\/[^\s)]+/g) || [];
    return [...new Set([...code, ...urls])].sort();
  };
  const expected = collect(original);
  const actual = collect(translated);
  return {
    expected,
    actual,
    missing: expected.filter(x => !actual.includes(x)),
    unexpected: actual.filter(x => !expected.includes(x))
  };
}

async function doResearch(run, ctx) {
  const system = `You are the ZeroDriveX Academy Research Agent.
Your job is to strengthen a serious technical course from evidence.
Rules:
- ${principles}
- Do not claim you visited or verified a URL unless source metadata or supplied excerpts establish it.
- Identify uncertainty explicitly.
- Treat content_excerpt in each source as the evidence actually supplied to you; a URL alone does not prove a claim.
- If a proposed identifier or constant is not in a supplied excerpt, mark it unverified instead of asserting it.
- Audit only the supplied current_course_content when saying the course contains or omits something. Do not treat prior agent proposals as published course content.
Return ONLY JSON with keys:
summary, source_assessment, verified_points, corrections, gaps, recommended_course_changes, research_questions.
Each verified_points item must include claim, source_urls, confidence.`;

  const course = {
    slug: ctx?.course?.slug,
    title: ctx?.course?.title,
    summary: ctx?.course?.summary,
    description: ctx?.course?.description,
    learning_objectives: ctx?.course?.learning_objectives
  };
  const sources = (ctx?.sources || []).slice(0, 12).map(s => ({
    title: s.title,
    url: s.url,
    publisher: s.publisher,
    source_type: s.source_type,
    notes: s.notes,
    content_excerpt: s.content_excerpt
  }));
  const currentCourseContent = (ctx?.current_lessons || []).slice(0, 20).map(l => ({
    module_ordinal: l.module_ordinal,
    module_title: l.module_title,
    lesson_ordinal: l.lesson_ordinal,
    slug: l.slug,
    title: l.title,
    lesson_type: l.lesson_type,
    body_excerpt: String(l.body_markdown || "").slice(0, 1100),
    learning_objectives: l.learning_objectives
  }));
  return llm(system, JSON.stringify({
    run_input: run.input,
    course,
    sources,
    current_course_content: currentCourseContent
  }));
}

async function doCourseCreate(run, ctx) {
  const research = (ctx?.recent_runs || []).filter(x => x.agent_type === "research" && x.status === "completed").slice(0,4);
  const system = `You are the ZeroDriveX Academy Course Creation Agent.
Create technically rigorous educational material from approved research.
Rules:
- ${principles}
- Do not publish directly.
- Treat source excerpts as evidence; source URLs without excerpts are pointers, not proof.
- Do not carry forward an identifier or constant that the research source_guard marks unverified.
- Keep canonical English technically precise and easy to translate.
- State prerequisites.
- Include labs with deliverables and verification criteria.
- Include assessment questions that test reasoning, not memorized slogans.
Return ONLY JSON with keys:
course_summary, proposed_changes, modules, labs, assessments, translation_notes, unresolved_questions.
Each module has title, objectives, lessons. Each lesson has title, summary, key_points, evidence_urls.`;

  const sources = (ctx?.sources || []).slice(0, 12).map(s => ({
    title:s.title, url:s.url, publisher:s.publisher, notes:s.notes, content_excerpt:s.content_excerpt
  }));
  const researchText = JSON.stringify(research.map(x => x.output)).slice(0, 14000);
  return llm(system, JSON.stringify({
    run_input: run.input,
    course: {
      slug: ctx?.course?.slug,
      title: ctx?.course?.title,
      summary: ctx?.course?.summary,
      learning_objectives: ctx?.course?.learning_objectives
    },
    sources,
    research_output_excerpt: researchText
  }));
}

async function doReview(run, ctx) {
  if (run.input?.mode === "translation") {
    const system = `You are the independent ZeroDriveX Academy Technical Translation Reviewer.
Compare the canonical lesson with the proposed translation.
Requirements:
- Technical meaning must remain equivalent.
- Preserve code spans, constants, byte sequences, URLs, and identifiers exactly.
- Do not translate a technical mechanism into an ordinary-language word that changes its meaning. For example, dyld rebasing concerns address relocation/fixup work, not lowering something.
- Keep Mach-O, dyld, CodeDirectory, load-command names, and source identifiers technically precise.
- You may improve awkward prose.
Return ONLY JSON with keys:
verdict, corrected_title, corrected_body_markdown, terminology_notes, issues_remaining.
verdict is "approve" only when the corrected output is technically equivalent; otherwise "needs_human_review".`;

    return llm(system, JSON.stringify({
      language_code: run.input.languageCode,
      canonical_title: run.input.originalTitle,
      canonical_body_markdown: run.input.originalBodyMarkdown,
      translated_title: run.input.translatedTitle,
      translated_body_markdown: run.input.translatedBodyMarkdown
    }));
  }

  if (run.input?.mode === "capstone") {
    const system = `You are the independent ZeroDriveX Academy Capstone Reviewer.
Review the learner evidence package for technical quality, reproducibility, and evidentiary discipline.
Rules:
- Do not infer that a claim is true merely because the learner wrote it.
- Separate what the evidence demonstrates from what still needs verification.
- Check that the learner states limitations and does not overclaim.
- Do not require disclosure of private or proprietary binaries.
- This is advisory review only; a human/admin makes the final credential approval.
Return ONLY JSON with keys:
verdict, score, demonstrated_competencies, evidence_gaps, reproducibility_issues, overclaims, required_revisions, reviewer_summary.
verdict must be "approve_recommended" or "revision_recommended".`;

    return llm(system, JSON.stringify({
      course: {
        slug: ctx?.course?.slug,
        title: ctx?.course?.title,
        learning_objectives: ctx?.course?.learning_objectives
      },
      submission_id: run.input.submissionId,
      evidence: run.input.evidence
    }));
  }

  const created = (ctx?.recent_runs || []).find(x => x.agent_type === "course_creator" && x.status === "completed");
  const system = `You are the independent ZeroDriveX Academy Technical Reviewer.
You are not the author. Try to find what is wrong.
Review for:
- factual accuracy,
- any source_guard unverified identifiers (these require correction or explicit verification),
- unsupported claims,
- primary-source grounding,
- lab reproducibility,
- assessment correctness,
- translation hazards,
- false confidence,
- accidental watering-down or fabricated substitutes.
Return ONLY JSON with keys:
verdict, score, blocking_issues, nonblocking_issues, source_gaps, required_revisions, strengths.
verdict must be "approve" or "revise".`;

  const creatorText = JSON.stringify(created?.output || null).slice(0, 14000);
  const sources = (ctx?.sources || []).slice(0, 8).map(s => ({ title:s.title, url:s.url, publisher:s.publisher, notes:s.notes, content_excerpt:s.content_excerpt }));
  return llm(system, JSON.stringify({
    run_input: run.input,
    course: {
      slug: ctx?.course?.slug,
      title: ctx?.course?.title,
      summary: ctx?.course?.summary,
      description: ctx?.course?.description,
      learning_objectives: ctx?.course?.learning_objectives
    },
    sources,
    course_creator_output_excerpt: creatorText
  }));
}

async function doTranslate(run, ctx) {
  const system = `You are the ZeroDriveX Academy Translation Agent.
Translate technical education without changing technical meaning.
Preserve code, identifiers, offsets, constants, URLs, citations, and security-relevant distinctions.
If a technical term should remain in English, retain it and explain it in the target language.
Return ONLY JSON with keys: language_code, title, body_markdown, terminology_notes, confidence.`;
  return llm(system, JSON.stringify({ run_input: run.input, course: ctx?.course }));
}

async function handle(run) {
  const ctx = await rpc("academy_worker_course_context", { p_token: TOKEN, p_course_id: run.course_id });
  let output;
  if (run.agent_type === "research") output = await doResearch(run, ctx);
  else if (run.agent_type === "course_creator") output = await doCourseCreate(run, ctx);
  else if (run.agent_type === "reviewer") output = await doReview(run, ctx);
  else if (run.agent_type === "translator") output = await doTranslate(run, ctx);
  else throw new Error("unsupported agent type " + run.agent_type);

  if (run.agent_type !== "translator") {
    if (run.agent_type === "reviewer" && run.input?.mode === "translation" && run.input?.lessonId) {
      const correctedTitle = output?.corrected_title || run.input.translatedTitle;
      const correctedBody = output?.corrected_body_markdown || run.input.translatedBodyMarkdown;
      const invariant = translationInvariantGuard(run.input.originalBodyMarkdown, correctedBody);
      const finalStatus = output?.verdict === "approve" && invariant.missing.length === 0 && invariant.unexpected.length === 0
        ? "approved"
        : "human_review";
      output = { ...output, invariant_guard: invariant, final_status: finalStatus };
      await rpc("academy_worker_finalize_translation", {
        p_token: TOKEN,
        p_lesson_id: run.input.lessonId,
        p_language_code: run.input.languageCode,
        p_title: correctedTitle,
        p_body_markdown: correctedBody,
        p_status: finalStatus,
        p_reviewer_result: output
      });
    }

    const guard = sourceGuard(output, ctx?.sources || []);
    if (Array.isArray(output)) output = { payload: output, source_guard: guard };
    else output = { ...output, source_guard: guard };

    if (run.agent_type === "reviewer" && run.input?.mode === "capstone" && run.input?.submissionId) {
      await rpc("academy_worker_attach_capstone_review", {
        p_token: TOKEN,
        p_submission_id: run.input.submissionId,
        p_result: output
      });
    }
  } else if (run.input?.lessonId && run.input?.languageCode && output?.body_markdown) {
    const sourceHash = run.input.sourceLessonHash || crypto.createHash("sha256").update(String(run.input.bodyMarkdown || "")).digest("hex");
    await rpc("academy_worker_store_translation", {
      p_token: TOKEN,
      p_lesson_id: run.input.lessonId,
      p_language_code: run.input.languageCode,
      p_title: output.title || run.input.title,
      p_body_markdown: output.body_markdown,
      p_source_lesson_hash: sourceHash,
      p_status: "machine_review"
    });
    await rpc("academy_worker_enqueue", {
      p_token: TOKEN,
      p_course_id: run.course_id,
      p_agent_type: "reviewer",
      p_input: {
        mode: "translation",
        lessonId: run.input.lessonId,
        languageCode: run.input.languageCode,
        originalTitle: run.input.title,
        originalBodyMarkdown: run.input.bodyMarkdown,
        translatedTitle: output.title || run.input.title,
        translatedBodyMarkdown: output.body_markdown,
        autoPipeline: false
      }
    });
  }

  await rpc("academy_worker_complete", {
    p_token: TOKEN,
    p_run_id: run.id,
    p_status: "completed",
    p_output: output,
    p_error: null,
    p_provider: "groq",
    p_model: lastModelUsed
  });

  const auto = run.input?.autoPipeline !== false;
  if (auto && run.agent_type === "research") {
    await rpc("academy_worker_enqueue", {
      p_token: TOKEN,
      p_course_id: run.course_id,
      p_agent_type: "course_creator",
      p_input: { researchRunIds: [run.id], autoPipeline: true }
    });
  } else if (auto && run.agent_type === "course_creator") {
    await rpc("academy_worker_enqueue", {
      p_token: TOKEN,
      p_course_id: run.course_id,
      p_agent_type: "reviewer",
      p_input: { courseCreatorRunId: run.id, autoPipeline: false }
    });
  }
}

console.log("academy worker started");
while (true) {
  try {
    const run = await rpc("academy_worker_claim", { p_token: TOKEN });
    if (!run) {
      await sleep(POLL_MS);
      continue;
    }
    console.log(new Date().toISOString(), "claimed", run.id, run.agent_type);
    try {
      await handle(run);
      console.log(new Date().toISOString(), "completed", run.id, run.agent_type);
    } catch (err) {
      console.error(new Date().toISOString(), "run failed", run.id, err?.message || err);
      try {
        await rpc("academy_worker_complete", {
          p_token: TOKEN,
          p_run_id: run.id,
          p_status: "failed",
          p_output: null,
          p_error: String(err?.message || err).slice(0,4000),
          p_provider: "groq",
          p_model: lastModelUsed
        });
      } catch (e) {
        console.error("failed to persist failure", e?.message || e);
      }
    }
  } catch (err) {
    console.error(new Date().toISOString(), "worker loop error", err?.message || err);
    await sleep(Math.max(POLL_MS, 10000));
  }
}
