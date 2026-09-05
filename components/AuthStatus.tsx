"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "../lib/supabase-browser";

export default function AuthStatus() {
  const [email, setEmail] = useState<string | null>(null);
  const sb = supabaseBrowser();

  useEffect(() => {
    sb.auth.getUser().then(({ data }: any) => setEmail(data.user?.email || null));
    const { data: sub } = sb.auth.onAuthStateChange((_event: any, session: any) => {
      setEmail(session?.user?.email || null);
    });
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  async function logout() {
    await sb.auth.signOut();
    window.location.href = "/";
  }

  if (!email) return <Link href="/login">Sign in</Link>;
  return <button className="nav-button" onClick={logout}>Sign out</button>;
}
