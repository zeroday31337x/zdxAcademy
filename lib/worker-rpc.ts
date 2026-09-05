const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const token = process.env.ACADEMY_WORKER_TOKEN;

export async function academyWorkerRpc(fn: string, body: Record<string, unknown>) {
  if (!url || !key || !token) throw new Error("Academy worker RPC configuration missing");
  const response = await fetch(url + "/rest/v1/rpc/" + fn, {
    method: "POST",
    cache: "no-store",
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ p_token: token, ...body })
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.hint || "Academy RPC failed");
  return data;
}
