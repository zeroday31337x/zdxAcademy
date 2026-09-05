import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getCourse } from "../../../../lib/db";
import { academyWorkerRpc } from "../../../../lib/worker-rpc";
import { getSupabaseUser, userRpc } from "../../../../lib/supabase-auth";

const paymentLinkUrl =
  process.env.STRIPE_ACADEMY_CERTIFICATE_PAYMENT_LINK ||
  "https://buy.stripe.com/3cIbJ28Rh5pQ9YU5VF6Ri04";

function bearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
}

function cleanName(value: unknown) {
  const s = String(value || "").replace(/\s+/g, " ").trim();
  if (s.length < 2 || s.length > 100) return null;
  return s;
}

export async function POST(req: Request) {
  try {
    const token = bearer(req);
    if (!token) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

    const user = await getSupabaseUser(token);
    if (!user?.id || !user?.email) return NextResponse.json({ error: "invalid_session" }, { status: 401 });

    const body = await req.json();
    const courseSlug = String(body.courseSlug || "");
    const displayName = cleanName(body.displayName);
    if (!displayName) return NextResponse.json({ error: "valid_display_name_required" }, { status: 400 });

    const course = await getCourse(courseSlug);
    if (!course) return NextResponse.json({ error: "course_not_found" }, { status: 404 });

    const eligibility = await userRpc(token, "academy_certificate_eligibility", { p_course_slug: courseSlug });
    if (!eligibility?.eligible) {
      return NextResponse.json({ error: "certificate_requirements_incomplete", eligibility }, { status: 409 });
    }

    const state = await userRpc(token, "academy_certificate_checkout_status", { p_course_slug: courseSlug });
    if (state?.certificate?.credential_id) {
      return NextResponse.json({
        error: "certificate_already_issued",
        credentialId: state.certificate.credential_id,
        verifyUrl: "/verify/" + state.certificate.credential_id
      }, { status: 409 });
    }

    const referenceId = "acp_" + crypto.randomBytes(16).toString("hex");

    await academyWorkerRpc("academy_worker_create_payment_reference", {
      p_reference_id: referenceId,
      p_user_id: user.id,
      p_course_id: course.id,
      p_course_version: course.current_version,
      p_amount_cents: 499,
      p_currency: "usd",
      p_display_name: displayName,
      p_customer_email: user.email,
      p_metadata: {
        stripe_payment_link_id: "plink_1UCSgJK8c2WLLqdxRY269RU7",
        course_slug: course.slug
      }
    });

    const url = new URL(paymentLinkUrl);
    url.searchParams.set("client_reference_id", referenceId);
    url.searchParams.set("locked_prefilled_email", user.email);

    return NextResponse.json({
      checkoutUrl: url.toString(),
      referenceId
    });
  } catch (error: any) {
    console.error("certificate checkout error", error);
    return NextResponse.json({ error: error?.message || "checkout_failed" }, { status: 500 });
  }
}
