import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface SubscriptionContextType {
  isSubscribed: boolean;
  plan: 'free' | 'basic' | 'premium' | 'enterprise';
  loading: boolean;
  checkSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isSubscribed: false,
  plan: 'free',
  loading: true,
  checkSubscription: async () => {},
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
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setIsSubscribed(data.subscribed || false);
      setPlan(data.plan || 'free');
    } catch (error) {
      console.error('Error checking subscription:', error);
      setIsSubscribed(false);
      setPlan('free');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
  }, [user, session]);

  // Verificação automática adicional quando há mudanças de rota (para capturar retornos do Stripe)
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