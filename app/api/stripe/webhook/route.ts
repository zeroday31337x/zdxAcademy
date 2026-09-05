import { NextResponse } from "next/server";
import crypto from "node:crypto";
import Stripe from "stripe";
import { getCourseById } from "../../../../lib/db";
import { academyWorkerRpc } from "../../../../lib/worker-rpc";
import { signPayload } from "../../../../lib/certificates";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const paymentLinkId =
  process.env.STRIPE_ACADEMY_CERTIFICATE_PAYMENT_LINK_ID ||
  "plink_1UCSgJK8c2WLLqdxRY269RU7";
const privateKey = process.env.CERT_SIGNING_PRIVATE_KEY;
const keyId = process.env.CERT_SIGNING_KEY_ID;

function webhookStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "unused_for_webhook_verification");
}

function belongsToAcademy(session: Stripe.Checkout.Session) {
  const link = typeof session.payment_link === "string" ? session.payment_link : session.payment_link?.id;
  return link === paymentLinkId;
}

async function settlePaidSession(session: Stripe.Checkout.Session) {
  if (!belongsToAcademy(session)) return;
  if (session.payment_status !== "paid") return;

  const referenceId = session.client_reference_id;
  if (!referenceId) {
    console.error("academy payment link session missing client_reference_id", session.id);
    return;
  }

  const payment = await academyWorkerRpc("academy_worker_settle_payment_link", {
    p_reference_id: referenceId,
    p_checkout_session_id: session.id,
    p_payment_intent_id:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || null,
    p_amount_cents: session.amount_total ?? null,
    p_currency: session.currency || null,
    p_customer_email: session.customer_details?.email || session.customer_email || null
  });

  if (payment?.certificate_id) return;

  const course = await getCourseById(payment.course_id);
  if (!course || course.current_version !== payment.course_version) {
    throw new Error("certificate course/version mismatch");
  }
  if (!privateKey || !keyId) throw new Error("certificate signing key not configured");

  const credentialId = "ZDXA-" + crypto.randomBytes(8).toString("hex").toUpperCase();
  const issuedAt = new Date().toISOString();
  const payload = {
    credentialId,
    learnerId: payment.user_id,
    displayName: payment.display_name,
    courseSlug: course.slug,
    courseTitle: course.title,
    courseVersion: course.current_version,
    issuedAt
  };
  const signed = signPayload(payload, privateKey);

  await academyWorkerRpc("academy_worker_store_paid_certificate", {
    p_checkout_session_id: session.id,
    p_certificate: {
      credential_id: credentialId,
      user_id: payment.user_id,
      course_id: course.id,
      course_version: course.current_version,
      display_name: payment.display_name,
      issued_at: issuedAt,
      expires_at: null,
      score: null,
      key_id: keyId,
      payload_json: payload,
      payload_sha256: signed.sha256,
      signature_base64: signed.signature,
      signature_algorithm: "Ed25519",
      visibility: "public",
      metadata: {
        issuer: "ZeroDriveX Academy",
        stripe_checkout_session_id: session.id,
        stripe_payment_link_id: paymentLinkId,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id || null
      }
    }
  });
}

export async function POST(req: Request) {
  if (!webhookSecret) {
    return NextResponse.json({ error: "stripe_webhook_not_configured" }, { status: 503 });
  }

  const stripe = webhookStripe();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    const raw = await req.text();
    event = stripe.webhooks.constructEvent(raw, signature, webhookSecret);
  } catch (error: any) {
    console.error("stripe webhook signature error", error?.message || error);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await settlePaidSession(event.data.object as Stripe.Checkout.Session);
    } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (belongsToAcademy(session) && session.client_reference_id) {
        await academyWorkerRpc("academy_worker_mark_reference_status", {
          p_reference_id: session.client_reference_id,
          p_checkout_session_id: session.id,
          p_status: event.type === "checkout.session.expired" ? "expired" : "failed"
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("stripe webhook processing error", event.id, error);
    return NextResponse.json({ error: error?.message || "webhook_processing_failed" }, { status: 500 });
  }
}
