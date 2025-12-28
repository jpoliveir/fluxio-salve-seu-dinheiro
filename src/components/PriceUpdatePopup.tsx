import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, X, Check, AlertCircle } from "lucide-react";

interface PriceSuggestion {
  id: string;
  subscription_id: string;
  servico: string;
  nome_plano: string;
  current_price: number;
  suggested_price: number;
}

interface PriceUpdatePopupProps {
  onSubscriptionUpdated: () => void;
}

export function PriceUpdatePopup({ onSubscriptionUpdated }: PriceUpdatePopupProps) {
  const { user } = useAuth();
  const { plan } = useSubscription();
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<PriceSuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Only show for premium and ultimate users
  const isPremiumOrUltimate = plan === 'premium' || plan === 'enterprise';

  useEffect(() => {
    if (user && isPremiumOrUltimate) {
      fetchSuggestions();
    }
  }, [user, isPremiumOrUltimate]);

  const fetchSuggestions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('price_suggestions')
      .select('*')
      .eq('user_id', user.id)
      .eq('dismissed', false)
      .eq('applied', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching suggestions:', error);
      return;
    }

    if (data && data.length > 0) {
      setSuggestions(data);
      setOpen(true);
    }
  };

  const handleApply = async () => {
    if (!suggestions[currentIndex]) return;

    setLoading(true);
    const suggestion = suggestions[currentIndex];

    try {
      // Update the subscription price
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ price: suggestion.suggested_price })
        .eq('id', suggestion.subscription_id);

      if (updateError) throw updateError;

      // Mark suggestion as applied
      await supabase
        .from('price_suggestions')
        .update({ applied: true })
        .eq('id', suggestion.id);

      toast({
        title: "Preço atualizado!",
        description: `${suggestion.servico} atualizado para R$ ${suggestion.suggested_price.toFixed(2)}`
      });

      onSubscriptionUpdated();
      moveToNext();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o preço.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (!suggestions[currentIndex]) return;

    setLoading(true);
    const suggestion = suggestions[currentIndex];

    try {
      await supabase
        .from('price_suggestions')
        .update({ dismissed: true })
        .eq('id', suggestion.id);

      moveToNext();
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
    } finally {
      setLoading(false);
    }
  };

  const moveToNext = () => {
    if (currentIndex < suggestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setOpen(false);
      setSuggestions([]);
      setCurrentIndex(0);
    }
  };

  const currentSuggestion = suggestions[currentIndex];

  if (!isPremiumOrUltimate || !currentSuggestion) return null;

  const priceDiff = currentSuggestion.suggested_price - currentSuggestion.current_price;
  const isIncrease = priceDiff > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className={isIncrease ? "text-orange-500" : "text-green-500"} size={20} />
            Atualização de Preço Detectada
          </DialogTitle>
          <DialogDescription>
            {suggestions.length > 1 && `${currentIndex + 1} de ${suggestions.length} atualizações`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-center p-4 bg-muted rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold">{currentSuggestion.servico}</div>
              <div className="text-sm text-muted-foreground">{currentSuggestion.nome_plano}</div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Seu preço atual</div>
              <div className="text-xl font-bold">R$ {currentSuggestion.current_price.toFixed(2)}</div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                isIncrease 
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' 
                  : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              }`}>
                {isIncrease ? '+' : ''}{priceDiff.toFixed(2)}
              </div>
            </div>

            <div className="text-center">
              <div className="text-sm text-muted-foreground">Novo preço</div>
              <div className="text-xl font-bold text-brand">R$ {currentSuggestion.suggested_price.toFixed(2)}</div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
            <AlertCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
            <span className="text-blue-700 dark:text-blue-300">
              Este preço foi confirmado por 35%+ dos usuários do Fluxio. Deseja atualizar sua assinatura?
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleDismiss} 
            disabled={loading}
            className="flex-1"
          >
            <X size={16} className="mr-2" />
            Manter atual
          </Button>
          <Button 
            onClick={handleApply} 
            disabled={loading}
            className="flex-1"
          >
            <Check size={16} className="mr-2" />
            {loading ? "Atualizando..." : "Atualizar preço"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
