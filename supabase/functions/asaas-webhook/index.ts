import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ASAAS-WEBHOOK] ${step}${detailsStr}`);
};

// Comparação em tempo constante para evitar timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Eventos que indicam pagamento confirmado/ativo
const ACTIVE_EVENTS = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
// Eventos que indicam perda de acesso
const INACTIVE_EVENTS = new Set([
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_REFUNDED",
  "PAYMENT_CHARGEBACK_REQUESTED",
  "SUBSCRIPTION_DELETED",
  "SUBSCRIPTION_INACTIVATED",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");

    // A Asaas envia o token configurado no header "asaas-access-token" em
    // TODA notificação. Sem essa checagem, qualquer requisição forjada
    // seria processada como um pagamento real.
    const webhookSecret = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    const receivedToken = req.headers.get("asaas-access-token");

    if (!webhookSecret) {
      logStep("ASAAS_WEBHOOK_TOKEN não configurado - rejeitando por segurança");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!receivedToken || !timingSafeEqual(receivedToken, webhookSecret)) {
      logStep("Token inválido ou ausente - requisição rejeitada");
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    logStep("Token validado com sucesso");

    const body = await req.json();
    const event = body.event as string;
    const payment = body.payment;

    logStep("Evento recebido", { event, paymentId: payment?.id, subscriptionId: payment?.subscription, externalReference: payment?.externalReference });

    if (!payment) {
      // Eventos que não são de cobrança (ex.: CHECKOUT_CREATED) - apenas confirma recebimento
      return new Response(JSON.stringify({ success: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // externalReference foi definido no create-checkout como "{user_id}:{plan}".
    // Em cobranças de assinatura (RECURRENT), o payment nem sempre carrega o
    // externalReference do checkout original - nesse caso, buscamos direto na
    // assinatura vinculada via API da Asaas.
    let externalReference: string | undefined = payment.externalReference;

    if ((!externalReference || !externalReference.includes(":")) && payment.subscription) {
      const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
      const asaasApiUrl = Deno.env.get("ASAAS_API_URL") ?? "https://api.asaas.com/v3";
      if (asaasApiKey) {
        try {
          const subResponse = await fetch(`${asaasApiUrl}/subscriptions/${payment.subscription}`, {
            headers: { "access_token": asaasApiKey },
          });
          if (subResponse.ok) {
            const subData = await subResponse.json();
            externalReference = subData.externalReference;
            logStep("externalReference recuperado via subscription", { subscriptionId: payment.subscription, externalReference });
          } else {
            logStep("Falha ao buscar subscription na Asaas", { status: subResponse.status });
          }
        } catch (fetchErr) {
          logStep("Erro ao buscar subscription na Asaas", { error: String(fetchErr) });
        }
      }
    }

    if (!externalReference || !externalReference.includes(":")) {
      logStep("externalReference ausente ou inválido, ignorando evento");
      return new Response(JSON.stringify({ success: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const [userId, rawPlan] = externalReference.split(":");
    const plan = rawPlan === "ultimate" ? "enterprise" : rawPlan;

    if (!userId || !["premium", "enterprise"].includes(plan)) {
      logStep("Plano ou usuário inválido no externalReference", { externalReference });
      return new Response(JSON.stringify({ error: "Invalid external reference" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    let status: string | null = null;
    if (ACTIVE_EVENTS.has(event)) {
      status = "active";
    } else if (INACTIVE_EVENTS.has(event)) {
      status = "cancelled";
    } else {
      logStep("Evento não mapeado, ignorando", { event });
      return new Response(JSON.stringify({ success: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { data: existingSub } = await supabaseClient
      .from("asaas_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingSub && existingSub.length > 0) {
      const { error: updateError } = await supabaseClient
        .from("asaas_subscriptions")
        .update({
          plan,
          status,
          asaas_subscription_id: payment.subscription ?? existingSub[0].asaas_subscription_id,
          asaas_payment_id: payment.id,
          asaas_customer_id: payment.customer ?? existingSub[0].asaas_customer_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSub[0].id);

      if (updateError) {
        logStep("Erro ao atualizar assinatura", { error: updateError.message });
        throw updateError;
      }
      logStep("Assinatura atualizada", { id: existingSub[0].id, status });
    } else {
      // Precisamos do e-mail para criar o registro; buscamos no auth via user_id
      const { data: userRecord, error: userLookupError } = await supabaseClient.auth.admin.getUserById(userId);
      if (userLookupError || !userRecord?.user?.email) {
        logStep("Usuário não encontrado para externalReference", { userId });
        throw new Error("User not found for externalReference");
      }

      const { error: insertError } = await supabaseClient
        .from("asaas_subscriptions")
        .insert({
          user_id: userId,
          email: userRecord.user.email,
          plan,
          status,
          asaas_subscription_id: payment.subscription ?? null,
          asaas_payment_id: payment.id,
          asaas_customer_id: payment.customer ?? null,
        });

      if (insertError) {
        logStep("Erro ao criar assinatura", { error: insertError.message });
        throw insertError;
      }
      logStep("Assinatura criada", { userId, status });
    }

    logStep("Webhook processado com sucesso");
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
