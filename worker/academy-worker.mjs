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
  const res = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + fn, { method:"POST", headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+SUPABASE_KEY,"Content-Type":"application/json"}, body:JSON.stringify(body) });
  const text=await res.text(); let data=null; try{data=text?JSON.parse(text):null}catch{data=text}
  if(!res.ok) throw new Error(fn+" failed "+res.status+": "+JSON.stringify(data)); return data;
}
async function db(path, options={}) {
  const res=await fetch(SUPABASE_URL+"/rest/v1/"+path,{...options,headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+SUPABASE_KEY,"Content-Type":"application/json",...(options.headers||{})}});
  const text=await res.text(); let data=null; try{data=text?JSON.parse(text):null}catch{data=text}
  if(!res.ok) throw new Error("db failed "+res.status+": "+JSON.stringify(data)); return data;
}
function textFromHtml(raw){return String(raw).replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim().slice(0,14000)}
async function gatherDurableSources(run){
  if(run.agent_type!=="research"||run.input?.mode!=="daily_course"||run.input?.durable!==true)return;
  const existing=await db(`academy_research_sources?course_id=eq.${run.course_id}&select=id&limit=1`); if(existing?.length)return;
  const discovery=await llm("You are a technical research planner. Return ONLY JSON with key source_urls containing 3-5 authoritative primary-source documentation or standards URLs for the supplied course topic. Prefer official documentation, standards bodies, language/runtime projects, and specifications. No blogs or aggregators.",JSON.stringify({title:run.input?.title,category:run.input?.category,difficulty:run.input?.difficulty}));
  for(const sourceUrl of (discovery?.source_urls||[]).slice(0,5)) try{
    const u=new URL(sourceUrl); const res=await fetch(sourceUrl,{headers:{"User-Agent":"ZeroDriveX-Academy-Research/1.0"},signal:AbortSignal.timeout(20000)}); const excerpt=textFromHtml(await res.text());
    await db("academy_research_sources",{method:"POST",body:JSON.stringify({course_id:run.course_id,url:sourceUrl,title:sourceUrl,source_type:"primary",publisher:u.hostname,retrieved_at:new Date().toISOString(),content_excerpt:excerpt,notes:`Fetched by durable VPS research worker; HTTP ${res.status}.`,metadata:{http_status:res.status,durable_worker:true}})});
  }catch(e){console.error("source fetch failed",sourceUrl,e?.message||e)}
}

function jsonFromModel(text) {
  if (!text) throw new Error("empty model response");
  let s = text.trim(); const fence=s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i); if(fence)s=fence[1];
  try{return JSON.parse(s)}catch{} const a=s.indexOf("{"),b=s.lastIndexOf("}"); if(a>=0&&b>a)return JSON.parse(s.slice(a,b+1));
  return {structured:false,raw_text:s,parse_warning:"model returned non-JSON output"};
}
let lastModelUsed=GROQ_MODEL;
async function llm(system,user){
  const models=[...new Set([GROQ_MODEL,"openai/gpt-oss-20b"])]; let lastError=null;
  for(const model of models)for(let attempt=0;attempt<3;attempt++){
    const res=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{Authorization:"Bearer "+GROQ_KEY,"Content-Type":"application/json"},body:JSON.stringify({model,messages:[{role:"system",content:system},{role:"user",content:user}],temperature:.15,response_format:{type:"json_object"}})}); const text=await res.text();
    if(res.ok){const payload=JSON.parse(text);lastModelUsed=model;return jsonFromModel(payload.choices?.[0]?.message?.content)}
    lastError=new Error("Groq "+res.status+" ("+model+"): "+text.slice(0,500)); if(res.status===429){await sleep(Math.min(Number(res.headers.get("retry-after")||0)*1000||2500*(attempt+1),10000));continue} if(res.status===413)break; if(res.status===400&&text.includes("json_validate_failed")){await sleep(500);continue} throw lastError;
  } throw lastError||new Error("all Groq model attempts failed");
}

const principles=["Teach real technical mechanisms and preserve factual truth.","Never invent a fake technical explanation to replace omitted procedural detail.","Prefer primary sources and reproducible evidence.","Separate observations, evidence, inference, and uncertainty.","Never invent API names, load-command constants, structure names, or signing slots.","Labs should produce useful artifacts rather than only trivia.","Canonical course material must be translation-ready without technical distortion."].join("\n- ");
function sourceGuard(output,sources){const rendered=JSON.stringify(output);const identifiers=[...new Set(rendered.match(/\b(?:LC|MH|FAT|CSMAGIC|CSSLOT)_[A-Z0-9_]+\b/g)||[])];const sourceText=JSON.stringify((sources||[]).map(s=>({title:s.title,url:s.url,excerpt:s.content_excerpt,notes:s.notes})));return{identifiers_found:identifiers,unverified_identifiers:identifiers.filter(id=>!sourceText.includes(id)),rule:"Unverified means the supplied source packet did not establish the identifier; it must be checked before publication."}}
function translationInvariantGuard(original,translated){const collect=text=>{const s=String(text||"");return[...new Set([...[...s.matchAll(/`([^`\n]+)`/g)].map(m=>m[1]),...(s.match(/https?:\/\/[^\s)]+/g)||[])])].sort()};const expected=collect(original),actual=collect(translated);return{expected,actual,missing:expected.filter(x=>!actual.includes(x)),unexpected:actual.filter(x=>!expected.includes(x))}}

async function doResearch(run,ctx){const system=`You are the ZeroDriveX Academy Research Agent. Strengthen a serious technical course from evidence.\nRules:\n- ${principles}\n- Treat supplied excerpts as evidence; URLs alone are not proof.\n- Identify uncertainty explicitly.\nReturn ONLY JSON with keys: summary, source_assessment, verified_points, corrections, gaps, recommended_course_changes, research_questions.`;const sources=(ctx?.sources||[]).slice(0,12);return llm(system,JSON.stringify({run_input:run.input,course:ctx?.course,sources,current_course_content:(ctx?.current_lessons||[]).slice(0,20)}))}
async function doCourseCreate(run,ctx){const research=(ctx?.recent_runs||[]).filter(x=>x.agent_type==="research"&&x.status==="completed").slice(0,4);const system=`You are the ZeroDriveX Academy Course Creation Agent. Create technically rigorous educational material from approved research.\nRules:\n- ${principles}\n- Do not publish directly.\n- Include labs with deliverables and verification criteria.\n- Include assessments that test reasoning.\nReturn ONLY JSON with keys: course_summary, proposed_changes, modules, labs, assessments, translation_notes, unresolved_questions.`;return llm(system,JSON.stringify({run_input:run.input,course:ctx?.course,sources:(ctx?.sources||[]).slice(0,12),research_output:research.map(x=>x.output)}))}
async function doReview(run,ctx){
  if(run.input?.mode==="capstone")return llm("You are the independent ZeroDriveX Academy Capstone Reviewer. Return ONLY JSON with keys: verdict, score, demonstrated_competencies, evidence_gaps, reproducibility_issues, overclaims, required_revisions, reviewer_summary. verdict is approve_recommended or revision_recommended.",JSON.stringify({course:ctx?.course,evidence:run.input.evidence}));
  if(run.input?.mode==="translation")return llm("You are the independent ZeroDriveX Academy Technical Translation Reviewer. Return ONLY JSON with keys verdict, corrected_title, corrected_body_markdown, issues. verdict is approve or revise.",JSON.stringify(run.input));
  const created=(ctx?.recent_runs||[]).find(x=>x.agent_type==="course_creator"&&x.status==="completed");return llm(`You are the independent ZeroDriveX Academy Technical Reviewer. Try to find what is wrong. Review factual accuracy, source grounding, lab reproducibility, assessment correctness, and false confidence. Return ONLY JSON with keys: verdict, score, blocking_issues, nonblocking_issues, source_gaps, required_revisions, strengths. verdict must be approve or revise.`,JSON.stringify({course:ctx?.course,sources:(ctx?.sources||[]).slice(0,12),course_creator_output:created?.output||null}));
}
async function doTranslate(run,ctx){return llm("You are the ZeroDriveX Academy Translation Agent. Preserve technical meaning, code, identifiers, constants, URLs and citations. Return ONLY JSON with keys: language_code, title, body_markdown, terminology_notes, confidence.",JSON.stringify({run_input:run.input,course:ctx?.course}))}

async function handle(run){
  await gatherDurableSources(run);
  const ctx=await rpc("academy_worker_course_context",{p_token:TOKEN,p_course_id:run.course_id}); let output;
  if(run.agent_type==="research")output=await doResearch(run,ctx);else if(run.agent_type==="course_creator")output=await doCourseCreate(run,ctx);else if(run.agent_type==="reviewer")output=await doReview(run,ctx);else if(run.agent_type==="translator")output=await doTranslate(run,ctx);else throw new Error("unsupported agent type "+run.agent_type);
  if(run.agent_type!=="translator")output=Array.isArray(output)?{payload:output,source_guard:sourceGuard(output,ctx?.sources||[])}:{...output,source_guard:sourceGuard(output,ctx?.sources||[])};
  await rpc("academy_worker_complete",{p_token:TOKEN,p_run_id:run.id,p_status:"completed",p_output:output,p_error:null,p_provider:"groq",p_model:lastModelUsed});
  const auto=run.input?.autoPipeline!==false;
  if(auto&&run.agent_type==="research")await rpc("academy_worker_enqueue",{p_token:TOKEN,p_course_id:run.course_id,p_agent_type:"course_creator",p_input:{researchRunIds:[run.id],autoPipeline:true,durable:true,executionPlane:"vps"}});
  else if(auto&&run.agent_type==="course_creator")await rpc("academy_worker_enqueue",{p_token:TOKEN,p_course_id:run.course_id,p_agent_type:"reviewer",p_input:{courseCreatorRunId:run.id,autoPipeline:false,durable:true,executionPlane:"vps"}});
}
console.log("academy worker started");
while(true){try{const run=await rpc("academy_worker_claim",{p_token:TOKEN});if(!run){await sleep(POLL_MS);continue}console.log(new Date().toISOString(),"claimed",run.id,run.agent_type);try{await handle(run);console.log(new Date().toISOString(),"completed",run.id,run.agent_type)}catch(err){console.error(new Date().toISOString(),"run failed",run.id,err?.message||err);try{await rpc("academy_worker_complete",{p_token:TOKEN,p_run_id:run.id,p_status:"failed",p_output:null,p_error:String(err?.message||err).slice(0,4000),p_provider:"groq",p_model:lastModelUsed})}catch(e){console.error("failed to persist failure",e?.message||e)}}}catch(err){console.error(new Date().toISOString(),"worker loop error",err?.message||err);await sleep(Math.max(POLL_MS,10000))}}
