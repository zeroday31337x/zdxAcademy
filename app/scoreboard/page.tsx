"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../../lib/supabase-browser";

export default function ScoreboardPage() {
  const sb = supabaseBrowser();
  const [me,setMe] = useState<any>(null);
  const [leaders,setLeaders] = useState<any[]>([]);
  const [signedIn,setSignedIn] = useState<boolean|null>(null);
  useEffect(() => { sb.auth.getUser().then(async ({data}:any) => {
    setSignedIn(!!data.user); if (!data.user) return;
    const [r,l] = await Promise.all([sb.rpc("academy_my_reputation"),sb.rpc("academy_leaderboard",{p_limit:50})]);
    setMe(r.data); setLeaders(Array.isArray(l.data)?l.data:[]);
  }); },[sb]);
  if (signedIn===false) return <main className="shell"><p className="eyebrow">ACADEMY SCOREBOARD</p><h1>Technical reputation should be earned.</h1><p className="lede">Scores reflect completed coursework and demonstrated performance, weighted by course difficulty.</p><Link className="button" href="/login?mode=signup">Create a free account</Link></main>;
  return <main className="shell"><p className="eyebrow">ACADEMY SCOREBOARD</p><h1>Demonstrated competence, measured.</h1><p className="lede">This is not a game score. Academy reputation summarizes completed technical work, performance, and difficulty.</p>
    {me && <div className="grid score-summary"><article className="card"><h3>Academy score</h3><p className="metric">{me.academy_score||0}</p></article><article className="card"><h3>Courses completed</h3><p className="metric">{me.courses_completed||0}</p></article><article className="card"><h3>Average score</h3><p className="metric">{me.average_grade||0}%</p></article></div>}
    <section className="section-inline"><h2>Leaderboard</h2><div className="scoreboard"><div className="score-row score-head"><span>Rank</span><span>Learner</span><span>Score</span><span>Courses</span><span>Average</span></div>{leaders.map((x:any)=><div className="score-row" key={`${x.rank}-${x.display_name}`}><strong>#{x.rank}</strong><span>{x.display_name}</span><strong>{x.academy_score}</strong><span>{x.courses_completed}</span><span>{x.average_score}%</span></div>)}</div></section>
    <p className="muted">Leaderboard participation uses a learner display name and can be disabled in the learner profile. Email addresses are never displayed.</p><Link href="/reports">View my course reports →</Link>
  </main>;
}
