const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function getSupabaseUser(accessToken: string) {
  if (!url || !publishable) throw new Error("Supabase auth configuration missing");
  const response = await fetch(url + "/auth/v1/user", {
    headers: {
      apikey: publishable,
      Authorization: "Bearer " + accessToken
    },
    cache: "no-store"
  });
  if (!response.ok) return null;
  return response.json();
}

export async function userRpc(accessToken: string, fn: string, body: Record<string, unknown>) {
  if (!url || !publishable) throw new Error("Supabase RPC configuration missing");
  const response = await fetch(url + "/rest/v1/rpc/" + fn, {
    method: "POST",
    headers: {
      apikey: publishable,
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.hint || "Supabase RPC failed");
  return data;
}
