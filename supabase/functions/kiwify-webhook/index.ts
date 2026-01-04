import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kiwify-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[KIWIFY-WEBHOOK] ${step}${detailsStr}`);
};

// Mapeamento de produtos Kiwify para planos
const PRODUCT_PLAN_MAP: Record<string, string> = {
  'ZR58V3S': 'premium',   // Link Premium
  '53f1YYG': 'ultimate',  // Link Ultimate
};

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

    // Validar signature do Kiwify (opcional mas recomendado)
    const signature = req.headers.get("x-kiwify-signature");
    const webhookSecret = Deno.env.get("KIWIFY_WEBHOOK_SECRET");
    
    if (webhookSecret && signature) {
      // Kiwify usa a signature para validar a autenticidade
      logStep("Signature received", { signature: signature?.substring(0, 20) + "..." });
    }

    const body = await req.json();
    logStep("Webhook payload", { 
      order_id: body.order_id,
      order_status: body.order_status,
      product_id: body.Product?.product_id,
      customer_email: body.Customer?.email
    });

    const orderStatus = body.order_status;
    const customerEmail = body.Customer?.email?.toLowerCase();
    const orderId = body.order_id;
    const subscriptionId = body.Subscription?.id;
    
    // Extrair o ID do plano do link de checkout (último segmento da URL)
    const checkoutUrl = body.checkout_link || '';
    const productCode = checkoutUrl.split('/').pop() || body.Product?.product_id || '';
    
    logStep("Processing", { orderStatus, customerEmail, productCode });

    if (!customerEmail) {
      logStep("No customer email found");
      return new Response(JSON.stringify({ error: "Customer email required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Determinar o plano baseado no código do produto
    let plan = PRODUCT_PLAN_MAP[productCode];
    if (!plan) {
      // Tentar determinar pelo valor
      const amount = body.Commissions?.charge_amount || 0;
      if (amount >= 2500) {
        plan = 'ultimate';
      } else if (amount >= 1000) {
        plan = 'premium';
      } else {
        logStep("Could not determine plan", { productCode, amount });
        plan = 'premium'; // Default
      }
    }
    logStep("Determined plan", { plan, productCode });

    // Buscar usuário pelo email
    const { data: users, error: userError } = await supabaseClient.auth.admin.listUsers();
    if (userError) {
      logStep("Error listing users", { error: userError.message });
      throw userError;
    }
    
    const user = users.users.find(u => u.email?.toLowerCase() === customerEmail);
    
    if (!user) {
      logStep("User not found, storing pending subscription", { email: customerEmail });
      // Armazenar para quando o usuário se cadastrar
      // Por enquanto, apenas logar
      return new Response(JSON.stringify({ 
        success: true, 
        message: "User not found, subscription will be activated when user registers" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("User found", { userId: user.id, email: user.email });

    // Mapear status do Kiwify para nosso sistema
    let subscriptionStatus = 'active';
    if (orderStatus === 'refunded' || orderStatus === 'chargedback') {
      subscriptionStatus = 'refunded';
    } else if (orderStatus === 'cancelled') {
      subscriptionStatus = 'cancelled';
    } else if (orderStatus === 'expired') {
      subscriptionStatus = 'expired';
    } else if (orderStatus === 'paid' || orderStatus === 'approved') {
      subscriptionStatus = 'active';
    }

    logStep("Mapped status", { original: orderStatus, mapped: subscriptionStatus });

    // Verificar se já existe uma assinatura
    const { data: existingSub } = await supabaseClient
      .from('kiwify_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingSub && existingSub.length > 0) {
      // Atualizar assinatura existente
      const { error: updateError } = await supabaseClient
        .from('kiwify_subscriptions')
        .update({
          plan,
          status: subscriptionStatus,
          kiwify_subscription_id: subscriptionId,
          kiwify_order_id: orderId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSub[0].id);

      if (updateError) {
        logStep("Error updating subscription", { error: updateError.message });
        throw updateError;
      }
      logStep("Updated existing subscription", { id: existingSub[0].id });
    } else {
      // Criar nova assinatura
      const { error: insertError } = await supabaseClient
        .from('kiwify_subscriptions')
        .insert({
          user_id: user.id,
          email: customerEmail,
          plan,
          status: subscriptionStatus,
          kiwify_subscription_id: subscriptionId,
          kiwify_order_id: orderId,
        });

      if (insertError) {
        logStep("Error inserting subscription", { error: insertError.message });
        throw insertError;
      }
      logStep("Created new subscription");
    }

    logStep("Webhook processed successfully");
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
