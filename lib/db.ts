const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;

function keyFor(method?: string) {
  const write = method && method.toUpperCase() !== "GET";
  if (write) {
    if (!secret) throw new Error("Supabase server secret is required for writes");
    return secret;
  }
  const key = secret || publishable;
  if (!key) throw new Error("Supabase API key is missing");
  return key;
}

export async function rest(path: string, init: RequestInit = {}) {
  if (!url) throw new Error("Supabase URL is missing");
  const key = keyFor(init.method);
  const response = await fetch(url + "/rest/v1/" + path, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(body?.message || body?.hint || "Supabase request failed");
  return body;
}

export async function getCourses() {
  return rest("academy_courses?status=eq.published&select=*&order=created_at.asc");
}

export async function getCourse(slug: string) {
  const rows = await rest("academy_courses?slug=eq." + encodeURIComponent(slug) + "&select=*&limit=1");
  return rows[0] || null;
}

export async function getCourseById(id: string) {
  const rows = await rest("academy_courses?id=eq." + encodeURIComponent(id) + "&select=*&limit=1");
  return rows[0] || null;
}

export async function getCourseStructure(slug: string) {
  const course = await getCourse(slug);
  if (!course) return null;
  const versions = await rest("academy_course_versions?course_id=eq." + course.id + "&version=eq." + course.current_version + "&select=*&limit=1");
  const version = versions[0];
  if (!version) return { course, version: null, modules: [] };
  const modules = await rest("academy_modules?course_version_id=eq." + version.id + "&select=*&order=ordinal.asc");
  for (const mod of modules) {
    mod.lessons = await rest("academy_lessons?module_id=eq." + mod.id + "&select=id,ordinal,slug,title,lesson_type,estimated_minutes&order=ordinal.asc");
  }
  return { course, version, modules };
}

export async function getLesson(courseSlug: string, lessonSlug: string, languageCode = "en") {
  const structure = await getCourseStructure(courseSlug);
  if (!structure) return null;
  for (const mod of structure.modules) {
    const match = mod.lessons.find((x: any) => x.slug === lessonSlug);
    if (match) {
      const rows = await rest("academy_lessons?id=eq." + match.id + "&select=*&limit=1");
      const canonical = rows[0] || null;
      if (!canonical) return { course: structure.course, module: mod, lesson: null, availableTranslations: [] };

      const availableTranslations = await rest(
        "academy_translations?lesson_id=eq." + match.id +
        "&translation_status=eq.approved&select=language_code,title&order=language_code.asc"
      );

      let lesson = canonical;
      if (languageCode && languageCode !== "en") {
        const translated = await rest(
          "academy_translations?lesson_id=eq." + match.id +
          "&language_code=eq." + encodeURIComponent(languageCode.toLowerCase()) +
          "&translation_status=eq.approved&select=language_code,title,body_markdown&limit=1"
        );
        if (translated[0]) {
          lesson = {
            ...canonical,
            title: translated[0].title,
            body_markdown: translated[0].body_markdown,
            language_code: translated[0].language_code,
            canonical_title: canonical.title
          };
        }
      }

      return { course: structure.course, module: mod, lesson, availableTranslations };
    }
  }
  return null;
}

export async function getCertificate(credentialId: string) {
  const rows = await rest("academy_certificates?credential_id=eq." + encodeURIComponent(credentialId) + "&select=*&limit=1");
  if (!rows[0]) return null;
  const cert = rows[0];
  const courses = await rest("academy_courses?id=eq." + cert.course_id + "&select=title,slug&limit=1");
  const keys = await rest("academy_certificate_keys?key_id=eq." + encodeURIComponent(cert.key_id) + "&select=*&limit=1");
  const revoked = await rest("academy_certificate_revocations?certificate_id=eq." + cert.id + "&select=reason,revoked_at&limit=1");
  return { cert, course: courses[0] || null, key: keys[0] || null, revocation: revoked[0] || null };
}
