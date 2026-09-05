import crypto from "node:crypto";

export function canonicalize(value: any): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + canonicalize(value[k])).join(",") + "}";
}

export function sha256Hex(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export function verifyPayload(payload: any, signatureBase64: string, publicKeyPem: string) {
  const canonical = canonicalize(payload);
  return crypto.verify(null, Buffer.from(canonical), publicKeyPem, Buffer.from(signatureBase64, "base64"));
}

export function signPayload(payload: any, privateKeyPem: string) {
  const canonical = canonicalize(payload);
  return {
    canonical,
    sha256: sha256Hex(canonical),
    signature: crypto.sign(null, Buffer.from(canonical), privateKeyPem).toString("base64")
  };
}
