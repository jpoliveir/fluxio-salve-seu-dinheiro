import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface SubscriptionContextType {
  isSubscribed: boolean;
  plan: 'free' | 'basic' | 'premium' | 'enterprise';
  loading: boolean;
  checkSubscription: () => Promise<'free' | 'basic' | 'premium' | 'enterprise'>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isSubscribed: false,
  plan: 'free',
  loading: true,
  checkSubscription: async () => 'free',
});

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
};

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [plan, setPlan] = useState<'free' | 'basic' | 'premium' | 'enterprise'>('free');
  const [loading, setLoading] = useState(true);

  const checkSubscription = async () => {
    if (!user || !session) {
      setIsSubscribed(false);
      setPlan('free');
      setLoading(false);
      return 'free';
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      const newPlan = data.plan || 'free';
      const newIsSubscribed = data.subscribed || false;

      setIsSubscribed(newIsSubscribed);
      setPlan(newPlan);

      // Sincronizar assinatura do Fluxio na dashboard
      await syncFluxioSubscription(newPlan, newIsSubscribed);
      return newPlan;
    } catch (error) {
      console.error('Error checking subscription:', error);
      setIsSubscribed(false);
      setPlan('free');
      return 'free';
    } finally {
      setLoading(false);
    }
  };

  const syncFluxioSubscription = async (currentPlan: string, subscribed: boolean) => {
    if (!user) return;

    try {
      // Buscar TODAS as assinaturas do Fluxio do usuário
      const { data: allFluxioSubs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('name', 'Fluxio')
        .order('created_at', { ascending: false });

      // Se houver múltiplas, deletar todas exceto a primeira (mais recente)
      if (allFluxioSubs && allFluxioSubs.length > 1) {
        const idsToDelete = allFluxioSubs.slice(1).map(sub => sub.id);
        await supabase
          .from('subscriptions')
          .delete()
          .in('id', idsToDelete);
      }

      // Pegar a assinatura existente (a mais recente)
      const existingFluxio = allFluxioSubs && allFluxioSubs.length > 0 ? allFluxioSubs[0] : null;

      // Mapear planos para preços
      const planPrices: Record<string, number> = {
        'premium': 14.90,
        'enterprise': 29.90,
      };

      const price = planPrices[currentPlan];

      // Se tem plano pago ativo
      if (subscribed && price) {
        if (existingFluxio) {
          // Atualizar assinatura existente
          await supabase
            .from('subscriptions')
            .update({
              price: price,
              status: 'active',
              billing_cycle: 'monthly',
              category: 'outros',
            })
            .eq('id', existingFluxio.id);
        } else {
          // Criar nova assinatura do Fluxio
          await supabase
            .from('subscriptions')
            .insert({
              user_id: user.id,
              name: 'Fluxio',
              price: price,
              status: 'active',
              billing_cycle: 'monthly',
              category: 'outros',
              servico: 'Fluxio',
            });
        }
      } else if (existingFluxio && !subscribed) {
        // Se não tem mais plano ativo, marcar como cancelada
        await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
          })
          .eq('id', existingFluxio.id);
      }
    } catch (error) {
      console.error('Error syncing Fluxio subscription:', error);
    }
  };

  useEffect(() => {
    checkSubscription();
  }, [user, session]);

  // Verificação automática adicional quando há mudanças de rota (para capturar retornos do checkout de pagamento)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && session) {
        checkSubscription();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, session]);

  return (
    <SubscriptionContext.Provider value={{
      isSubscribed,
      plan,
      loading,
      checkSubscription
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}