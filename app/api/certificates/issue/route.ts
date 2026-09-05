import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCourse } from "../../../../lib/db";
import { signPayload } from "../../../../lib/certificates";
import { academyWorkerRpc } from "../../../../lib/worker-rpc";

function allowed(req: Request) {
  const token = process.env.ACADEMY_ADMIN_TOKEN;
  return !!token && req.headers.get("authorization") === "Bearer " + token;
}

export async function POST(req: Request) {
  if (!allowed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const privateKey = process.env.CERT_SIGNING_PRIVATE_KEY;
  const keyId = process.env.CERT_SIGNING_KEY_ID;
  if (!privateKey || !keyId) return NextResponse.json({ error: "signing_key_not_configured" }, { status: 503 });

  const body = await req.json();
  const course = await getCourse(body.courseSlug);
  if (!course) return NextResponse.json({ error: "course_not_found" }, { status: 404 });

  const credentialId = "ZDXA-" + crypto.randomBytes(8).toString("hex").toUpperCase();
  const issuedAt = new Date().toISOString();
  const payload = {
    credentialId,
    learnerId: body.userId,
    displayName: body.displayName,
    courseSlug: course.slug,
    courseTitle: course.title,
    courseVersion: course.current_version,
    issuedAt,
    score: body.score ?? null
  };
  const signed = signPayload(payload, privateKey);

  const credential = await academyWorkerRpc("academy_worker_store_certificate", {
    p_certificate: {
      credential_id: credentialId,
      user_id: body.userId,
      course_id: course.id,
      course_version: course.current_version,
      display_name: body.displayName,
      issued_at: issuedAt,
      expires_at: null,
      score: body.score ?? null,
      key_id: keyId,
      payload_json: payload,
      payload_sha256: signed.sha256,
      signature_base64: signed.signature,
      signature_algorithm: "Ed25519",
      visibility: "public",
      metadata: { issuer: "ZeroDriveX Academy" }
    }
  });

  return NextResponse.json({ credential, verifyUrl: "/verify/" + credentialId }, { status: 201 });
}
