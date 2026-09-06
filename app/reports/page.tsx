"use client";

import { useEffect,useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../../lib/supabase-browser";

export default function ReportsPage(){
 const sb=supabaseBrowser(); const [reports,setReports]=useState<any[]>([]); const [ready,setReady]=useState(false);
 useEffect(()=>{sb.auth.getUser().then(async({data}:any)=>{if(!data.user){setReady(true);return;} const r=await sb.rpc("academy_my_reports"); setReports(Array.isArray(r.data)?r.data:[]); setReady(true);});},[sb]);
 if(ready&&!reports.length) return <main className="shell"><p className="eyebrow">PERFORMANCE REPORTS</p><h1>Your completed work will leave a record.</h1><p className="lede">After you complete a course, Academy automatically generates a persistent report with your grade, score, demonstrated strengths, evidence and areas to improve.</p><Link className="button" href="/courses">Start a free course</Link></main>;
 return <main className="shell"><p className="eyebrow">PERFORMANCE REPORTS</p><h1>Your learning record.</h1><p className="lede">Reports are generated from actual course evidence and retained so you can see your development over time.</p><div className="course-list">{reports.map((r:any)=><article className="course-card" key={r.id}><div className="report-heading"><div><span className="tag">Course version {r.course_version}</span><h2>Completion report</h2></div><div><strong className="report-grade">{r.grade}</strong><p className="muted">{r.final_score}% · {r.academy_points} points</p></div></div><h3>Areas for improvement</h3>{Array.isArray(r.areas_for_improvement)&&r.areas_for_improvement.length?<ul>{r.areas_for_improvement.map((x:any,i:number)=><li key={i}>{x.lesson||JSON.stringify(x)}</li>)}</ul>:<p className="status-ok">No low-scoring learning items recorded.</p>}<h3>Recommendations</h3>{(r.recommendations||[]).map((x:string,i:number)=><p className="muted" key={i}>{x}</p>)}<p className="muted">Generated {new Date(r.generated_at).toLocaleDateString()}</p></article>)}</div></main>;
}
