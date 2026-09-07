create or replace function public.academy_worker_create_daily_course(
  p_token text,
  p_course jsonb,
  p_research_input jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
declare
  v_course public.academy_courses%rowtype;
  v_run public.academy_agent_runs%rowtype;
  v_slug text := trim(coalesce(p_course->>'slug',''));
  v_title text := trim(coalesce(p_course->>'title',''));
  v_summary text := trim(coalesce(p_course->>'summary',''));
begin
  if not public.academy_worker_authorized(p_token) then
    raise exception 'unauthorized';
  end if;

  if v_slug = '' or length(v_slug) > 180 then raise exception 'invalid course slug'; end if;
  if v_title = '' or length(v_title) > 300 then raise exception 'invalid course title'; end if;
  if v_summary = '' then raise exception 'course summary is required'; end if;

  select * into v_course from public.academy_courses where slug = v_slug;
  if found then
    return jsonb_build_object(
      'ok', true,
      'skipped', 'course already exists',
      'course', to_jsonb(v_course),
      'researchRun', null
    );
  end if;

  insert into public.academy_courses(
    slug,title,summary,description,category,difficulty,canonical_language,status,
    certificate_price_cents,is_learning_free,current_version,estimated_hours,
    prerequisites,learning_objectives,metadata
  ) values (
    v_slug,
    v_title,
    v_summary,
    nullif(p_course->>'description',''),
    nullif(p_course->>'category',''),
    nullif(p_course->>'difficulty',''),
    coalesce(nullif(p_course->>'canonical_language',''),'en'),
    'draft',
    coalesce(nullif(p_course->>'certificate_price_cents','')::integer,499),
    coalesce((p_course->>'is_learning_free')::boolean,true),
    coalesce(nullif(p_course->>'current_version','')::integer,1),
    nullif(p_course->>'estimated_hours','')::numeric,
    case
      when jsonb_typeof(p_course->'prerequisites')='array'
      then array(select jsonb_array_elements_text(p_course->'prerequisites'))
      else '{}'::text[]
    end,
    case
      when jsonb_typeof(p_course->'learning_objectives')='array'
      then p_course->'learning_objectives'
      else '[]'::jsonb
    end,
    coalesce(p_course->'metadata','{}'::jsonb)
  )
  returning * into v_course;

  insert into public.academy_agent_runs(course_id,agent_type,status,input)
  values(v_course.id,'research','queued',coalesce(p_research_input,'{}'::jsonb))
  returning * into v_run;

  return jsonb_build_object(
    'ok', true,
    'course', to_jsonb(v_course),
    'researchRun', to_jsonb(v_run)
  );
exception
  when unique_violation then
    select * into v_course from public.academy_courses where slug=v_slug;
    return jsonb_build_object(
      'ok', true,
      'skipped', 'course already exists',
      'course', to_jsonb(v_course),
      'researchRun', null
    );
end;
$function$;

revoke all on function public.academy_worker_create_daily_course(text,jsonb,jsonb) from public;
grant execute on function public.academy_worker_create_daily_course(text,jsonb,jsonb) to anon, authenticated;
