import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  corsHeaders,
  getPluggyApiKey,
  jsonResponse,
  pluggyGet,
  requireUltimate,
  requireUser,
  serviceClient,
} from "../_shared/pluggy.ts";

interface Tx {
  id: string;
  description: string;
  amount: number;
  date: string;
}

interface Candidate {
  description: string;
  amount: number;
  occurrences: number;
  lastDate: string;
  billingCycle: "monthly" | "yearly";
  nextChargeDate: string;
  servico: string | null;
  category: string;
  transactionIds: string[];
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\d{2,}/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\b(pagamento|compra|mensalidade|assinatura|parcela|cartao|credito|debito|br|ltda|sa)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const titleCase = (s: string) =>
  s.split(" ").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

const monthKey = (d: string) => d.slice(0, 7);

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function detectRecurring(txs: Tx[]): Candidate[] {
  const groups = new Map<string, Tx[]>();
  for (const tx of txs) {
    const key = normalize(tx.description);
    if (key.length < 3) continue;
    const list = groups.get(key) ?? [];
    list.push(tx);
    groups.set(key, list);
  }

  const candidates: Candidate[] = [];

  for (const [key, list] of groups) {
    const months = new Set(list.map((t) => monthKey(t.date)));
    if (list.length < 2 || months.size < 2) continue;

    const amounts = list.map((t) => Math.abs(t.amount));
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    if (avg <= 0) continue;
    const withinRange = amounts.every((a) => Math.abs(a - avg) / avg <= 0.1);
    if (!withinRange) continue;

    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const last = sorted[sorted.length - 1];
    const first = sorted[0];
    const spanMonths =
      (new Date(last.date).getFullYear() - new Date(first.date).getFullYear()) * 12 +
      (new Date(last.date).getMonth() - new Date(first.date).getMonth());
    const cycle: "monthly" | "yearly" = spanMonths >= 10 && list.length <= 2 ? "yearly" : "monthly";

    const next = addMonths(new Date(last.date), cycle === "yearly" ? 12 : 1);

    candidates.push({
      description: titleCase(key),
      amount: Math.round(avg * 100) / 100,
      occurrences: list.length,
      lastDate: last.date,
      billingCycle: cycle,
      nextChargeDate: next.toISOString().slice(0, 10),
      servico: null,
      category: "outros",
      transactionIds: sorted.map((t) => t.id),
    });
  }

  return candidates.sort((a, b) => b.amount - a.amount);
}

function categoryFor(servico: string): string {
  const s = servico.toLowerCase();
  if (/(netflix|disney|hbo|max|prime|globoplay|paramount|star|crunchyroll|discovery|youtube)/.test(s)) return "streaming";
  if (/(spotify|deezer|tidal|apple music)/.test(s)) return "musica";
  if (/(ifood|rappi|uber eats|zé delivery)/.test(s)) return "alimentacao";
  return "outros";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await requireUser(req);
    await requireUltimate(user.id);

    const body = await req.json().catch(() => ({}));
    const itemId = body?.itemId;
    if (typeof itemId !== "string" || itemId.length < 5) {
      return jsonResponse({ error: "itemId inválido" }, 400);
    }

    const admin = serviceClient();
    const apiKey = await getPluggyApiKey();

    const item = await pluggyGet(`/items/${itemId}`, apiKey);
    const institution = item?.connector?.name ?? "Banco";

    const { data: connection, error: connError } = await admin
      .from("bank_connections")
      .upsert(
        {
          user_id: user.id,
          pluggy_item_id: itemId,
          institution_name: institution,
          status: item?.status === "UPDATED" ? "active" : (item?.status ?? "active"),
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "user_id,pluggy_item_id" }
      )
      .select()
      .single();

    if (connError) throw new Error(connError.message);

    const accountsRes = await pluggyGet(`/accounts?itemId=${itemId}`, apiKey);
    const accounts: Array<{ id: string }> = accountsRes?.results ?? [];

    const from = new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10);
    const txs: Tx[] = [];

    for (const account of accounts) {
      const page = await pluggyGet(
        `/transactions?accountId=${account.id}&from=${from}&pageSize=500`,
        apiKey
      );
      for (const t of page?.results ?? []) {
        if (typeof t?.amount !== "number" || !t?.description || !t?.date) continue;
        // considerar apenas saídas (débitos)
        if (t.amount > 0 && t.type !== "DEBIT") continue;
        txs.push({
          id: String(t.id),
          description: String(t.description),
          amount: t.amount,
          date: String(t.date).slice(0, 10),
        });
      }
    }

    // Serviços conhecidos para casar nome e categoria
    const { data: planos } = await admin.from("servicos_planos").select("servico");
    const servicos = [...new Set((planos ?? []).map((p) => p.servico))];

    let candidates = detectRecurring(txs).map((c) => {
      const match = servicos.find(
        (s) => normalize(c.description).includes(normalize(s)) || normalize(s).includes(normalize(c.description))
      );
      const servico = match ?? null;
      return {
        ...c,
        servico,
        description: servico ?? c.description,
        category: categoryFor(servico ?? c.description),
      };
    });

    // Remover o que já foi importado antes (cache de transações)
    const { data: cached } = await admin
      .from("bank_transactions_cache")
      .select("pluggy_transaction_id, imported_subscription_id")
      .eq("user_id", user.id);

    const importedIds = new Set(
      (cached ?? []).filter((c) => c.imported_subscription_id).map((c) => c.pluggy_transaction_id)
    );
    candidates = candidates.filter((c) => !c.transactionIds.some((id) => importedIds.has(id)));

    // Remover o que já existe como assinatura ativa com o mesmo nome
    const { data: existing } = await admin
      .from("subscriptions")
      .select("name")
      .eq("user_id", user.id);
    const existingNames = new Set((existing ?? []).map((s) => normalize(s.name)));
    candidates = candidates.filter((c) => !existingNames.has(normalize(c.description)));

    // Guardar cache das transações lidas (sem marcar como importadas)
    const cacheRows = txs.map((t) => ({
      user_id: user.id,
      connection_id: connection.id,
      pluggy_transaction_id: t.id,
      description: t.description,
      amount: t.amount,
      date: t.date,
    }));
    if (cacheRows.length) {
      await admin
        .from("bank_transactions_cache")
        .upsert(cacheRows, { onConflict: "user_id,pluggy_transaction_id", ignoreDuplicates: true });
    }

    return jsonResponse({
      connection: {
        id: connection.id,
        institution_name: connection.institution_name,
        status: connection.status,
        last_synced_at: connection.last_synced_at,
      },
      transactionsAnalyzed: txs.length,
      candidates,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[PLUGGY-SYNC]", message);
    const status = message.includes("autenticado") ? 401 : message.includes("Ultimate") ? 403 : 500;
    return jsonResponse({ error: message }, status);
  }
});
