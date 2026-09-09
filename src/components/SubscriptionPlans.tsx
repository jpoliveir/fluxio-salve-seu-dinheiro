import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Crown, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const plans = [
  {
    name: "Free",
    price: "R$ 0",
    period: "/mês",
    planId: null,
    features: [
      "Controle básico de assinaturas",
      "Até 5 assinaturas",
      "Relatórios simples"
    ]
  },
  {
    name: "Premium",
    price: "R$ 14,90",
    period: "/mês",
    planId: "premium",
    features: [
      "Assinaturas ilimitadas",
      "Análise de economia potencial",
      "Relatórios avançados",
      "Categorização inteligente",
      "Alertas de cobrança"
    ]
  },
  {
    name: "Ultimate",
    price: "R$ 29,90",
    period: "/mês",
    planId: "enterprise",
    features: [
      "Todos os recursos Premium",
      "Múltiplos usuários",
      "Integração com bancos",
      "API personalizada",
      "Suporte prioritário"
    ]
  }
];

export function SubscriptionPlans() {
  const { session, user } = useAuth();
  const { plan, checkSubscription } = useSubscription();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planName: string, planId: string) => {
    if (!session || !user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para assinar um plano.",
        variant: "destructive",
      });
      return;
    }

    setLoading(planName);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan: planId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error || !data?.url) {
        throw new Error(error?.message || "Não foi possível gerar o link de pagamento.");
      }

      // Abrir checkout da Asaas em nova aba
      window.open(data.url, '_blank');

      toast({
        title: "Redirecionando para pagamento",
        description: "Complete o pagamento na Asaas. Sua assinatura será ativada automaticamente.",
      });

      // Verificar status da assinatura periodicamente
      const checkInterval = setInterval(() => {
        checkSubscription();
      }, 10000); // Verifica a cada 10 segundos

      // Parar de verificar após 5 minutos
      setTimeout(() => {
        clearInterval(checkInterval);
      }, 300000);
    } catch (err) {
      toast({
        title: "Erro ao iniciar pagamento",
        description: err instanceof Error ? err.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {plans.map((planData) => {
        const isCurrentPlan = planData.name.toLowerCase() === plan;
        const isFree = planData.name === "Free";
        
        return (
          <Card key={planData.name} className={`relative ${isCurrentPlan ? 'ring-2 ring-brand' : ''}`}>
            {isCurrentPlan && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-brand text-brand-foreground px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                  <Crown size={14} />
                  Seu Plano
                </div>
              </div>
            )}
            
            <CardHeader className="text-center">
              <CardTitle className="text-xl">{planData.name}</CardTitle>
              <div className="text-3xl font-bold">
                {planData.price}
                <span className="text-sm text-muted-foreground">{planData.period}</span>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {planData.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check size={16} className="text-green-600" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              {!isFree && (
                <Button 
                  className="w-full gap-2"
                  onClick={() => handleSubscribe(planData.name, planData.planId!)}
                  disabled={isCurrentPlan || loading === planData.name}
                  variant={isCurrentPlan ? "outline" : "default"}
                >
                  {loading === planData.name 
                    ? "Processando..." 
                    : isCurrentPlan 
                      ? "Plano Atual" 
                      : (
                        <>
                          Assinar {planData.name}
                          <ExternalLink size={14} />
                        </>
                      )
                  }
                </Button>
              )}
              
              {isFree && !isCurrentPlan && (
                <Button variant="outline" className="w-full" disabled>
                  Plano Gratuito
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}