import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface PlanoDetalhes {
  nome: string;
  valor: number;
}

interface EconomiaDetalhes {
  servico: string;
  planoAtual: PlanoDetalhes;
  planoMaisBarato: PlanoDetalhes;
  economiaPotencial: number;
  estimativa?: boolean;
}

interface EconomiaData {
  economia_total: number;
  detalhes: EconomiaDetalhes[];
}

export function useEconomiaAssinaturas() {
  const { user } = useAuth();
  const [economiaData, setEconomiaData] = useState<EconomiaData | null>(null);
  const [loading, setLoading] = useState(false);

  const calcularEconomia = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('calcular_economia_assinaturas', {
        user_id_param: user.id
      });

      if (error) throw error;
      setEconomiaData(data as unknown as EconomiaData);
    } catch (error) {
      console.error('Erro ao calcular economia:', error);
      setEconomiaData({ economia_total: 0, detalhes: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calcularEconomia();
  }, [user]);

  return { economiaData, loading, recalcular: calcularEconomia };
}