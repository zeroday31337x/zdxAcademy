import { getCertificate } from "../../../lib/db";
import { canonicalize, sha256Hex, verifyPayload } from "../../../lib/certificates";

export const dynamic = "force-dynamic";

export default async function CredentialPage({ params }: { params: Promise<{ credential: string }> }) {
  const { credential } = await params;
  const data = await getCertificate(credential);
  if (!data) return <main className="shell"><h1>Credential not found</h1><p className="muted">No certificate with that credential ID exists.</p></main>;

  const hashMatches = sha256Hex(canonicalize(data.cert.payload_json)) === data.cert.payload_sha256;
  let signatureValid = false;
  try {
    signatureValid = !!data.key && verifyPayload(data.cert.payload_json, data.cert.signature_base64, data.key.public_key_pem);
  } catch {}
  const valid = hashMatches && signatureValid && !data.revocation;

  return (
    <main className="shell">
      <p className="eyebrow">CREDENTIAL {data.cert.credential_id}</p>
      <h1>{valid ? "Verified" : "Verification failed"}</h1>
      <div className="verify-box">
        <p className={valid ? "status-ok" : ""}>{valid ? "Cryptographic signature valid" : "Credential is not currently valid"}</p>
        <p><strong>Learner:</strong> {data.cert.display_name}</p>
        <p><strong>Course:</strong> {data.course?.title}</p>
        <p><strong>Course version:</strong> {data.cert.course_version}</p>
        <p><strong>Issued:</strong> {new Date(data.cert.issued_at).toLocaleString()}</p>
        {data.cert.score != null && <p><strong>Score:</strong> {data.cert.score}</p>}
        <p><strong>Signing key:</strong> {data.cert.key_id}</p>
        <p><strong>Payload SHA-256:</strong> <code>{data.cert.payload_sha256}</code></p>
        {data.revocation && <p><strong>Revoked:</strong> {data.revocation.reason}</p>}
      </div>
    </main>
  );
}
