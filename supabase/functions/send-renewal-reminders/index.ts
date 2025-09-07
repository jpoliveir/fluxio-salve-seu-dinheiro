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

interface ReminderData {
  user_email: string;
  user_name: string;
  service_name: string;
  renewal_date: string;
  price: number;
  subscription_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting renewal reminders job");

    // Get current date and date 3 days from now
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);

    const todayStr = today.toISOString().split('T')[0];
    const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];

    console.log(`Checking renewals between ${todayStr} and ${threeDaysStr}`);

    // Query subscriptions with renewals in the next 3 days
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select(`
        id,
        name,
        price,
        next_charge_date,
        last_reminder_sent,
        user_id,
        profiles!inner(
          display_name,
          id
        )
      `)
      .gte('next_charge_date', todayStr)
      .lte('next_charge_date', threeDaysStr)
      .eq('status', 'active')
      .not('last_reminder_sent', 'eq', todayStr); // Don't send if already sent today

    if (error) {
      console.error("Error fetching subscriptions:", error);
      throw error;
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions requiring reminders`);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No reminders to send" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get user emails from auth.users
    const userIds = subscriptions.map(sub => sub.user_id);
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("Error fetching auth users:", authError);
      throw authError;
    }

    const userEmailMap = new Map();
    authUsers.users.forEach(user => {
      if (userIds.includes(user.id)) {
        userEmailMap.set(user.id, user.email);
      }
    });

    const emailPromises = subscriptions.map(async (subscription) => {
      const userEmail = userEmailMap.get(subscription.user_id);
      if (!userEmail) {
        console.log(`No email found for user ${subscription.user_id}`);
        return null;
      }

      const userName = subscription.profiles?.display_name || "Usuário";
      const renewalDate = new Date(subscription.next_charge_date).toLocaleDateString('pt-BR');
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">🚨 Sua assinatura está prestes a renovar</h2>
          
          <p>Olá <strong>${userName}</strong>,</p>
          
          <p>Notamos que sua assinatura do <strong>${subscription.name}</strong> será renovada em <strong>${renewalDate}</strong>.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Valor da renovação:</strong> R$ ${subscription.price.toFixed(2)}</p>
          </div>
          
          <p>💡 <strong>Dica do Fluxio:</strong> Confira se ainda deseja manter esse serviço. O Fluxio pode te ajudar a economizar analisando planos mais baratos!</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="color: #666;">
            Abraços,<br>
            <strong>Equipe Fluxio</strong>
          </p>
        </div>
      `;

      try {
        const emailResponse = await resend.emails.send({
          from: "Fluxio <onboarding@resend.dev>",
          to: [userEmail],
          subject: `🚨 Sua assinatura do ${subscription.name} está prestes a renovar`,
          html: emailHtml,
        });

        console.log(`Email sent to ${userEmail} for subscription ${subscription.id}`);

        // Update last_reminder_sent to avoid duplicates
        await supabase
          .from('subscriptions')
          .update({ last_reminder_sent: todayStr })
          .eq('id', subscription.id);

        return {
          subscription_id: subscription.id,
          email: userEmail,
          success: true,
          email_id: emailResponse.data?.id
        };
      } catch (emailError) {
        console.error(`Failed to send email to ${userEmail}:`, emailError);
        return {
          subscription_id: subscription.id,
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

    console.log(`Sent ${successCount} emails successfully, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        message: "Renewal reminders processed",
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
    console.error("Error in send-renewal-reminders function:", error);
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