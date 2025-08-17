import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface DuplicateGroup {
  ids: string[];
  reason: string;
  confidence: number;
}

interface DuplicatesResult {
  duplicates: DuplicateGroup[];
}

export function useDuplicateDetection() {
  const { user } = useAuth();
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const detectDuplicates = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-duplicates', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;
      
      const result = data as DuplicatesResult;
      setDuplicates(result.duplicates || []);
    } catch (error) {
      console.error('Erro ao detectar duplicatas:', error);
      setDuplicates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    detectDuplicates();
  }, [user]);

  const isDuplicate = (subscriptionId: string) => {
    return duplicates.some(group => group.ids.includes(subscriptionId));
  };

  const getDuplicateInfo = (subscriptionId: string) => {
    return duplicates.find(group => group.ids.includes(subscriptionId));
  };

  return { 
    duplicates, 
    loading, 
    detectDuplicates, 
    isDuplicate, 
    getDuplicateInfo 
  };
}