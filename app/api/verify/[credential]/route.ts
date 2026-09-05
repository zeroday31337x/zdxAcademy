import { NextResponse } from "next/server";
import { getCertificate } from "../../../../lib/db";
import { canonicalize, sha256Hex, verifyPayload } from "../../../../lib/certificates";

export async function GET(_req: Request, { params }: { params: Promise<{ credential: string }> }) {
  const { credential } = await params;
  const data = await getCertificate(credential);
  if (!data) return NextResponse.json({ valid: false, error: "not_found" }, { status: 404 });
  const hashMatches = sha256Hex(canonicalize(data.cert.payload_json)) === data.cert.payload_sha256;
  let signatureValid = false;
  try { signatureValid = !!data.key && verifyPayload(data.cert.payload_json, data.cert.signature_base64, data.key.public_key_pem); } catch {}
  const valid = hashMatches && signatureValid && !data.revocation;
  return NextResponse.json({
    valid,
    credentialId: data.cert.credential_id,
    learner: data.cert.display_name,
    course: data.course?.title,
    courseVersion: data.cert.course_version,
    issuedAt: data.cert.issued_at,
    score: data.cert.score,
    keyId: data.cert.key_id,
    payloadSha256: data.cert.payload_sha256,
    revoked: !!data.revocation
  });
}
