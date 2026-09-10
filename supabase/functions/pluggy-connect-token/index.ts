import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  corsHeaders,
  getPluggyApiKey,
  jsonResponse,
  PLUGGY_API,
  requireUltimate,
  requireUser,
} from "../_shared/pluggy.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await requireUser(req);
    await requireUltimate(user.id);

    const apiKey = await getPluggyApiKey();

    // itemId opcional: permite reabrir o widget para atualizar uma conexão existente
    let itemId: string | undefined;
    try {
      const body = await req.json();
      if (typeof body?.itemId === "string") itemId = body.itemId;
    } catch (_) {
      // sem corpo
    }

    const res = await fetch(`${PLUGGY_API}/connect_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
      body: JSON.stringify({
        clientUserId: user.id,
        ...(itemId ? { itemId } : {}),
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.accessToken) {
      return jsonResponse({ error: data?.message ?? "Falha ao gerar token da Pluggy" }, 502);
    }

    return jsonResponse({ connectToken: data.accessToken });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[PLUGGY-CONNECT-TOKEN]", message);
    const status = message.includes("autenticado") ? 401 : message.includes("Ultimate") ? 403 : 500;
    return jsonResponse({ error: message }, status);
  }
});
