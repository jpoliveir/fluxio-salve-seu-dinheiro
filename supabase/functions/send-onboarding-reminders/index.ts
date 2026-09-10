import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Esta função só deve ser chamada pelo agendador (cron), nunca por
  // requisições públicas - sem isso, qualquer pessoa podia disparar
  // e-mails reais para todos os usuários e sobrecarregar o banco.
  const cronSecret = Deno.env.get("CRON_SECRET");
  const receivedSecret = req.headers.get("x-cron-secret");
  if (!cronSecret || receivedSecret !== cronSecret) {
    console.log("Chamada rejeitada: x-cron-secret ausente ou inválido");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }

  try {
    console.log("Starting onboarding reminders job");

    // Get current date and date 3 days ago
    const today = new Date();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(today.getDate() - 3);

    const todayStr = today.toISOString().split('T')[0];
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

    console.log(`Checking users without subscriptions since ${threeDaysAgoStr}`);

    // Get all auth users first
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("Error fetching auth users:", authError);
      throw authError;
    }

    console.log(`Found ${authUsers.users.length} total users`);

    // Get users that:
    // 1. Have no subscriptions
    // 2. Haven't received an onboarding reminder today
    // 3. Either never received a reminder or last reminder was 3+ days ago
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, last_onboarding_reminder_sent')
      .or(`last_onboarding_reminder_sent.is.null,last_onboarding_reminder_sent.lte.${threeDaysAgoStr}`);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} profiles eligible for reminders`);

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users eligible for onboarding reminders" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check which of these users have no subscriptions
    const { data: usersWithSubscriptions, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .in('user_id', profiles.map(p => p.id));

    if (subscriptionsError) {
      console.error("Error fetching subscriptions:", subscriptionsError);
      throw subscriptionsError;
    }

    const userIdsWithSubscriptions = new Set(usersWithSubscriptions?.map(s => s.user_id) || []);
    const usersWithoutSubscriptions = profiles.filter(profile => !userIdsWithSubscriptions.has(profile.id));

    console.log(`Found ${usersWithoutSubscriptions.length} users without subscriptions`);

    if (usersWithoutSubscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users without subscriptions found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create email map from auth users
    const userEmailMap = new Map();
    authUsers.users.forEach(user => {
      userEmailMap.set(user.id, user.email);
    });

    const emailPromises = usersWithoutSubscriptions.map(async (profile) => {
      const userEmail = userEmailMap.get(profile.id);
      if (!userEmail) {
        console.log(`No email found for user ${profile.id}`);
        return null;
      }

      const userName = profile.display_name || "Usuário";
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin: 0;">Fluxio</h1>
            <p style="color: #666; margin: 5px 0;">Controle suas assinaturas</p>
          </div>
          
          <h2 style="color: #333;">Olá ${userName}! 👋</h2>
          
          <p style="color: #444; line-height: 1.6;">
            Notamos que você se cadastrou no <strong>Fluxio</strong> mas ainda não adicionou suas assinaturas. 
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Por que adicionar suas assinaturas?</h3>
            <ul style="color: #444; line-height: 1.8;">
              <li><strong>Economize dinheiro:</strong> Descubra planos mais baratos</li>
              <li><strong>Controle total:</strong> Veja todas suas assinaturas em um lugar</li>
              <li><strong>Alertas inteligentes:</strong> Receba lembretes antes das renovações</li>
              <li><strong>Análise de gastos:</strong> Entenda como seu dinheiro está sendo usado</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://66046a85-4e5f-45a7-b7b9-c37c5594d7ef.sandbox.lovable.dev/dashboard" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Adicionar Minhas Assinaturas
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Leva apenas alguns minutos para cadastrar suas assinaturas e você pode começar a economizar imediatamente!
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="color: #666; font-size: 12px; text-align: center;">
            Abraços,<br>
            <strong>Equipe Fluxio</strong>
          </p>
          
          <p style="color: #999; font-size: 11px; text-align: center; margin-top: 20px;">
            Você recebeu este email porque se cadastrou no Fluxio. Se não deseja mais receber esses lembretes, entre na plataforma e gerencie suas preferências.
          </p>
        </div>
      `;

      try {
        const emailResponse = await resend.emails.send({
          from: "Fluxio <onboarding@resend.dev>",
          to: [userEmail],
          subject: "🚀 Comece a economizar com suas assinaturas no Fluxio!",
          html: emailHtml,
        });

        console.log(`Onboarding email sent to ${userEmail} for user ${profile.id}`);

        // Update last reminder sent date
        await supabase
          .from('profiles')
          .update({ last_onboarding_reminder_sent: todayStr })
          .eq('id', profile.id);

        return {
          user_id: profile.id,
          email: userEmail,
          success: true,
          email_id: emailResponse.data?.id
        };
      } catch (emailError) {
        console.error(`Failed to send onboarding email to ${userEmail}:`, emailError);
        return {
          user_id: profile.id,
          email: userEmail,
          success: false,
          error: emailError.message
        };
      }
    });

    const results = await Promise.allSettled(emailPromises);
    const emailResults = results
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => (result as PromiseFulfilledResult<any>).value);

    const successCount = emailResults.filter(result => result.success).length;
    const failureCount = emailResults.filter(result => !result.success).length;

    console.log(`Sent ${successCount} onboarding emails successfully, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        message: "Onboarding reminders processed",
        total_processed: emailResults.length,
        successful_sends: successCount,
        failed_sends: failureCount,
        results: emailResults
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error("Error in send-onboarding-reminders function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
};

serve(handler);