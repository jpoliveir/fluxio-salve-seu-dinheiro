import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[DETECT-DUPLICATES] Function started');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error('Not authenticated');
    }

    console.log('[DETECT-DUPLICATES] User authenticated:', user.id);

    // Buscar todas as assinaturas do usuário
    const { data: subscriptions, error } = await supabaseClient
      .from('subscriptions')
      .select('id, name, servico, price')
      .eq('user_id', user.id);

    if (error) {
      console.error('[DETECT-DUPLICATES] Error fetching subscriptions:', error);
      throw error;
    }

    console.log('[DETECT-DUPLICATES] Found subscriptions:', subscriptions.length);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Preparar dados para análise de IA
    const subscriptionsData = subscriptions.map(sub => ({
      id: sub.id,
      name: sub.name,
      service: sub.servico,
      price: sub.price
    }));

    console.log('[DETECT-DUPLICATES] Analyzing duplicates with AI');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-nano-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente especializado em detectar assinaturas duplicadas. 
            Analise a lista de assinaturas e identifique quais podem ser duplicadas baseado em:
            1. Nomes similares (mesmo serviço com nomes parecidos)
            2. Mesmo serviço mas preços diferentes
            3. Variações do mesmo produto/empresa
            
            Retorne APENAS um JSON válido no formato:
            {
              "duplicates": [
                {
                  "ids": ["id1", "id2"],
                  "reason": "motivo da duplicação",
                  "confidence": 0.85
                }
              ]
            }
            
            Seja conservador - só marque como duplicado se tiver alta confiança (>0.7).`
          },
          {
            role: 'user',
            content: `Analise estas assinaturas: ${JSON.stringify(subscriptionsData)}`
          }
        ],
        max_completion_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DETECT-DUPLICATES] OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0].message.content;
    
    console.log('[DETECT-DUPLICATES] AI response:', content);

    try {
      const duplicatesResult = JSON.parse(content);
      
      return new Response(JSON.stringify(duplicatesResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('[DETECT-DUPLICATES] Failed to parse AI response:', parseError);
      return new Response(JSON.stringify({ duplicates: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('[DETECT-DUPLICATES] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});