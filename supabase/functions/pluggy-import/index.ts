import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  corsHeaders,
  jsonResponse,
  requireUltimate,
  requireUser,
  serviceClient,
} from "../_shared/pluggy.ts";

const CATEGORIES = ["alimentacao", "musica", "streaming", "outros"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await requireUser(req);
    await requireUltimate(user.id);

    const body = await req.json().catch(() => ({}));
    const connectionId = body?.connectionId;
    const items = Array.isArray(body?.items) ? body.items : null;

    if (typeof connectionId !== "string" || !items || items.length === 0) {
      return jsonResponse({ error: "Dados de importação inválidos" }, 400);
    }
    if (items.length > 50) {
      return jsonResponse({ error: "Muitos itens para importar de uma vez" }, 400);
    }

    const admin = serviceClient();

    const { data: connection } = await admin
      .from("bank_connections")
      .select("id")
      .eq("id", connectionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!connection) {
      return jsonResponse({ error: "Conexão bancária não encontrada" }, 404);
    }

    const rows = [];
    const txMap: Array<{ ids: string[]; index: number }> = [];

    for (const [index, item] of items.entries()) {
      const name = String(item?.name ?? "").trim().slice(0, 100);
      const price = Number(item?.price);
      if (!name || !Number.isFinite(price) || price < 0 || price > 1000000) {
        return jsonResponse({ error: `Item inválido: ${name || "sem nome"}` }, 400);
      }
      const category = CATEGORIES.includes(item?.category) ? item.category : "outros";
      const billingCycle = item?.billingCycle === "yearly" ? "yearly" : "monthly";

      rows.push({
        user_id: user.id,
        name,
        price,
        billing_cycle: billingCycle,
        next_charge_date: typeof item?.nextChargeDate === "string" ? item.nextChargeDate : null,
        status: "active",
        category,
        servico: typeof item?.servico === "string" ? item.servico : null,
        source: "open_finance",
        bank_connection_id: connection.id,
      });

      txMap.push({
        ids: Array.isArray(item?.transactionIds) ? item.transactionIds.map(String) : [],
        index,
      });
    }

    const { data: inserted, error } = await admin
      .from("subscriptions")
      .insert(rows)
      .select("id, name");

    if (error) throw new Error(error.message);

    // Marcar as transações como já importadas para não sugerir de novo
    for (const map of txMap) {
      const subscriptionId = inserted?.[map.index]?.id;
      if (!subscriptionId || map.ids.length === 0) continue;
      await admin
        .from("bank_transactions_cache")
        .update({ imported_subscription_id: subscriptionId })
        .eq("user_id", user.id)
        .in("pluggy_transaction_id", map.ids);
    }

    return jsonResponse({ imported: inserted?.length ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[PLUGGY-IMPORT]", message);
    const status = message.includes("autenticado") ? 401 : message.includes("Ultimate") ? 403 : 500;
    return jsonResponse({ error: message }, status);
  }
});
