import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PriceSuggestionBanner {
  servico: string;
  suggested_price: number;
  current_price: number;
}

export function PriceSuggestionBanner() {
  const { user } = useAuth();
  const [suggestion, setSuggestion] = useState<PriceSuggestionBanner | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (user) {
      checkForSuggestions();
    }
  }, [user]);

  const checkForSuggestions = async () => {
    if (!user) return;

    // Check if user has any pending suggestions
    const { data } = await supabase
      .from('price_suggestions')
      .select('servico, suggested_price, current_price')
      .eq('user_id', user.id)
      .eq('dismissed', false)
      .eq('applied', false)
      .limit(1)
      .maybeSingle();

    if (data) {
      setSuggestion(data);
    }
  };

  if (!suggestion || dismissed) return null;

  const priceDiff = suggestion.suggested_price - suggestion.current_price;
  const isIncrease = priceDiff > 0;

  return (
    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-full">
          <TrendingUp size={16} className={isIncrease ? "text-orange-600" : "text-green-600"} />
        </div>
        <div>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            O preço do {suggestion.servico} pode ter sido atualizado
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Novo valor: R$ {suggestion.suggested_price.toFixed(2)} 
            <span className={isIncrease ? "text-orange-600" : "text-green-600"}>
              {" "}({isIncrease ? '+' : ''}{priceDiff.toFixed(2)})
            </span>
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-amber-700 hover:text-amber-900 hover:bg-amber-100"
        onClick={() => setDismissed(true)}
      >
        <X size={16} />
      </Button>
    </div>
  );
}
