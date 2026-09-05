"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../../lib/supabase-browser";
import CertificateCheckout from "../../components/CertificateCheckout";

const courseSlug = "understanding-apple-mach-o-binary-internals";

export default function DashboardPage() {
  const sb = supabaseBrowser();
  const [user, setUser] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [eligibility, setEligibility] = useState<any>(null);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [checkoutState, setCheckoutState] = useState<any>(null);
  const [paymentMessage, setPaymentMessage] = useState("");

  async function refreshForUser() {
    const [p, e, c, s] = await Promise.all([
      sb.rpc("academy_my_course_progress", { p_course_slug: courseSlug }),
      sb.rpc("academy_certificate_eligibility", { p_course_slug: courseSlug }),
      sb.rpc("academy_my_certificates"),
      sb.rpc("academy_certificate_checkout_status", { p_course_slug: courseSlug })
    ]);
    setProgress(p.data);
    setEligibility(e.data);
    setCertificates(Array.isArray(c.data) ? c.data : []);
    setCheckoutState(s.data);
    return { certificates: Array.isArray(c.data) ? c.data : [], checkoutState: s.data };
  }

  useEffect(() => {
    let canceled = false;

    sb.auth.getUser().then(async ({ data }: any) => {
      if (canceled) return;
      setUser(data.user || null);
      if (!data.user) return;

      const state = await refreshForUser();
      const params = new URLSearchParams(window.location.search);
      const payment = params.get("certificate_payment");

      if (payment === "canceled") {
        setPaymentMessage("Certificate checkout was canceled. No charge was made.");
        return;
      }

      if (payment === "success") {
        if (state.certificates.length > 0) {
          setPaymentMessage("Payment confirmed. Your verified credential has been issued.");
          return;
        }

        setPaymentMessage("Payment returned successfully. Confirming payment and issuing your credential…");
        for (let i = 0; i < 8; i++) {
          await new Promise(r => setTimeout(r, 1500));
          const latest = await refreshForUser();
          if (latest.certificates.length > 0) {
            setPaymentMessage("Payment confirmed. Your verified credential has been issued.");
            break;
          }
          if (latest.checkoutState?.payment?.status === "failed") {
            setPaymentMessage("Stripe reported that the payment did not complete.");
            break;
          }
        }
      }
    });

    return () => { canceled = true; };
  }, [sb]);

  if (!user) {
    return (
      <main className="shell">
        <p className="eyebrow">LEARNER DASHBOARD</p>
        <h1>Save progress and earn verifiable credentials.</h1>
        <Link className="button" href="/login">Sign in or create an account</Link>
      </main>
    );
  }

  const pct = progress?.total_lessons
    ? Math.round((progress.completed_lessons / progress.total_lessons) * 100)
    : 0;
  const certificate = certificates[0] || null;
  const payment = checkoutState?.payment || null;

  return (
    <main className="shell">
      <p className="eyebrow">LEARNER DASHBOARD</p>
      <h1>Your learning should leave evidence.</h1>
      <p className="muted">{user.email}</p>

      {paymentMessage && <div className="notice">{paymentMessage}</div>}

      <div className="grid">
        <article className="card">
          <h3>Mach-O Internals</h3>
          <p className="metric">{pct}%</p>
          <p className="muted">{progress?.completed_lessons || 0} / {progress?.total_lessons || 0} learning items completed</p>
          <Link href={"/courses/" + courseSlug}>Continue course →</Link>
        </article>

        <article className="card">
          <h3>Final assessment</h3>
          <p className={eligibility?.exam_passed ? "status-ok" : "muted"}>
            {eligibility?.exam_passed ? "Passed" : "Not yet passed"}
          </p>
          <Link href={"/assess/" + courseSlug + "/final-assessment"}>Open assessment →</Link>
        </article>

        <article className="card">
          <h3>Capstone</h3>
          <p className={eligibility?.capstone_approved ? "status-ok" : "muted"}>
            {eligibility?.capstone_approved ? "Approved" : "Not yet approved"}
          </p>
          <Link href={"/capstone/" + courseSlug}>Open capstone →</Link>
        </article>

        <article className="card">
          <h3>Verified credential</h3>
          {certificate ? (
            <>
              <p className="status-ok">Issued</p>
              <p className="muted">{certificate.credential_id}</p>
              <Link href={"/verify/" + certificate.credential_id}>View public verification →</Link>
            </>
          ) : eligibility?.eligible ? (
            <>
              {payment?.status === "paid" && <p className="status-ok">Payment received · issuing credential</p>}
              {payment?.status === "open" && <p className="muted">An earlier checkout is still open.</p>}
              <p className="muted">One-time verified certificate: $4.99</p>
              <CertificateCheckout courseSlug={courseSlug} />
            </>
          ) : (
            <>
              <p className="muted">Requirements incomplete</p>
              <p className="muted">Finish the learning material, pass the assessment, and have the capstone approved first.</p>
            </>
          )}
        </article>
      </div>
    </main>
  );
}
