import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACTIVE_PAYMENT_STATUSES = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);

async function recoverAsaasSubscription(
  supabaseClient: ReturnType<typeof createClient>,
  user: { id: string; email?: string },
) {
  const apiKey = Deno.env.get("ASAAS_API_KEY");
  const apiUrl = Deno.env.get("ASAAS_API_URL") ?? "https://api.asaas.com/v3";
  if (!apiKey || !user.email) return null;

  for (const plan of ["enterprise", "premium"]) {
    const externalReference = `${user.id}:${plan}`;
    const subscriptionsResponse = await fetch(
      `${apiUrl}/subscriptions?externalReference=${encodeURIComponent(externalReference)}&limit=10`,
      { headers: { "access_token": apiKey } },
    );
    if (!subscriptionsResponse.ok) continue;

    const subscriptionsData = await subscriptionsResponse.json();
    const remoteSubscription = subscriptionsData?.data?.find(
      (item: { status?: string }) => item.status === "ACTIVE",
    );
    if (!remoteSubscription?.id) continue;

    const paymentsResponse = await fetch(
      `${apiUrl}/payments?subscription=${encodeURIComponent(remoteSubscription.id)}&limit=10`,
      { headers: { "access_token": apiKey } },
    );
    if (!paymentsResponse.ok) continue;

    const paymentsData = await paymentsResponse.json();
    const paidPayment = paymentsData?.data?.find(
      (payment: { status?: string }) => payment.status && ACTIVE_PAYMENT_STATUSES.has(payment.status),
    );
    if (!paidPayment?.id) continue;

    const { error } = await supabaseClient.from("asaas_subscriptions").insert({
      user_id: user.id,
      email: user.email,
      plan,
      status: "active",
      asaas_subscription_id: remoteSubscription.id,
      asaas_payment_id: paidPayment.id,
      asaas_customer_id: remoteSubscription.customer ?? paidPayment.customer ?? null,
    });

    if (error) throw error;
    logStep("Recovered paid Asaas subscription", { userId: user.id, plan });
    return plan;
  }

  return null;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
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
    logStep("Function started");
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Buscar assinatura ativa na Asaas
    const { data: asaasSub, error: asaasError } = await supabaseClient
      .from('asaas_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (asaasError) {
      logStep("Error fetching Asaas subscription", { error: asaasError.message });
      throw asaasError;
    }

    if (asaasSub && asaasSub.length > 0) {
      const subscription = asaasSub[0];
      const plan = subscription.plan === 'ultimate' ? 'enterprise' : subscription.plan;
      
      logStep("Active Asaas subscription found", { 
        id: subscription.id, 
        plan: subscription.plan,
        mappedPlan: plan
      });
      
      return new Response(JSON.stringify({ 
        subscribed: true, 
        plan: plan 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const recoveredPlan = await recoverAsaasSubscription(supabaseClient, user);
    if (recoveredPlan) {
      return new Response(JSON.stringify({ subscribed: true, plan: recoveredPlan }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("No active subscription found, returning free plan");
    return new Response(JSON.stringify({ 
      subscribed: false, 
      plan: 'free' 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
