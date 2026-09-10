// Helpers compartilhados para integração com a Pluggy (Open Finance Brasil)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const PLUGGY_API = "https://api.pluggy.ai";

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

/** Autentica na Pluggy e devolve a apiKey de curta duração. */
export async function getPluggyApiKey(): Promise<string> {
  const clientId = Deno.env.get("PLUGGY_CLIENT_ID");
  const clientSecret = Deno.env.get("PLUGGY_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("PLUGGY_CLIENT_ID/PLUGGY_CLIENT_SECRET não configurados");
  }

  const res = await fetch(`${PLUGGY_API}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.apiKey) {
    throw new Error(data?.message ?? "Falha ao autenticar na Pluggy");
  }
  return data.apiKey as string;
}

export async function pluggyGet(path: string, apiKey: string) {
  const res = await fetch(`${PLUGGY_API}${path}`, {
    headers: { "X-API-KEY": apiKey },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message ?? `Erro Pluggy em ${path}`);
  }
  return data;
}

export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
}

/** Valida o JWT do chamador e devolve o usuário. */
export async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Não autenticado");

  const anon = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) throw new Error("Não autenticado");
  return data.user;
}

/** A conexão bancária é exclusiva do plano Ultimate (enterprise). */
export async function requireUltimate(userId: string) {
  const admin = serviceClient();
  const { data } = await admin
    .from("asaas_subscriptions")
    .select("plan, status, expires_at")
    .eq("user_id", userId)
    .eq("status", "active");

  const isUltimate = (data ?? []).some((row) =>
    row.plan === "enterprise" &&
    (!row.expires_at || new Date(row.expires_at).getTime() > Date.now())
  );

  if (!isUltimate) {
    throw new Error("Recurso disponível apenas no plano Ultimate");
  }
}
