import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Diagnóstico temporário: valida a ASAAS_API_KEY contra a API do Asaas.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("ASAAS_API_KEY");
  const apiUrl = Deno.env.get("ASAAS_API_URL") ?? "https://api.asaas.com/v3";

  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, reason: "ASAAS_API_KEY ausente" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  try {
    const res = await fetch(`${apiUrl}/myAccount`, {
      headers: { "access_token": apiKey, "Content-Type": "application/json" },
    });
    const data = await res.json().catch(() => null);
    return new Response(
      JSON.stringify({
        ok: res.ok,
        status: res.status,
        apiUrl,
        accountName: data?.name ?? null,
        email: data?.email ? "presente" : null,
        error: res.ok ? null : data?.errors?.[0]?.description ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, apiUrl, reason: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
