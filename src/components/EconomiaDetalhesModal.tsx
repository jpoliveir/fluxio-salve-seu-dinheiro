import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Crown, Lock, Check } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  subscriptionId?: string;
}

interface EconomiaDetalhesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detalhes: EconomiaDetalhes[];
  onUpgrade: () => void;
  onRefresh?: () => void;
}

export function EconomiaDetalhesModal({ 
  open, 
  onOpenChange, 
  detalhes, 
  onUpgrade,
  onRefresh
}: EconomiaDetalhesModalProps) {
  const { plan } = useSubscription();
  const { toast } = useToast();
  const { user } = useAuth();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };


  const getDetalhesDisponiveis = () => {
    if (plan === 'free') return [];
    if (plan === 'premium') return detalhes.slice(0, 5);
    return detalhes; // ultimate tem acesso completo
  };

  const handleConfirmEconomy = async (item: EconomiaDetalhes) => {
    if (!user || !item.subscriptionId) return;

    try {
      // Atualizar o valor da assinatura para o valor mais barato sugerido
      const { error } = await supabase
        .from('subscriptions')
        .update({
          price: item.planoMaisBarato.valor,
          name: item.planoMaisBarato.nome
        })
        .eq('id', item.subscriptionId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Economia confirmada!",
        description: `Parabéns! Você economizou ${formatCurrency(item.economiaPotencial)} por mês com ${item.servico}.`,
      });

      // Fechar o modal e atualizar os dados
      onOpenChange(false);
      if (onRefresh) onRefresh();
      
    } catch (error) {
      console.error('Erro ao confirmar economia:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a assinatura. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const detalhesParaMostrar = getDetalhesDisponiveis();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhes da Economia Potencial
            <Crown size={20} className="text-yellow-500" />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {plan === 'free' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Lock size={24} className="text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">Detalhes Premium</h3>
              <p className="text-muted-foreground mb-4">
                Detalhes de economia disponíveis apenas no Premium
              </p>
              <Button onClick={onUpgrade}>
                Desbloquear Agora
              </Button>
            </div>
          ) : (
            <>
              {detalhesParaMostrar.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Nenhuma assinatura encontrada com serviços cadastrados para análise de economia.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Adicione o campo "serviço" nas suas assinaturas para ver as oportunidades de economia.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Accordion type="multiple" className="space-y-2">
                    {detalhesParaMostrar.map((item, index) => (
                      <AccordionItem key={index} value={`item-${index}`} className={`border rounded-lg ${item.estimativa ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20' : ''}`}>
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex items-center justify-between w-full mr-4">
                            <div className="flex items-center gap-3">
                              <h4 className="font-semibold text-lg text-left">{item.servico || "Serviço não especificado"}</h4>
                              {item.estimativa && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                  Estimativa
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-600">
                                -{formatCurrency(item.economiaPotencial)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {item.estimativa ? 'estimativa mensal' : 'economia mensal'}
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        
                        <AccordionContent className="px-4 pb-4">
                          <div className="space-y-4">
                            <div className="text-xs text-muted-foreground mb-3">
                              * Informações baseadas em dados públicos e análises de mercado
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">Plano Atual</div>
                                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                                  <div className="font-medium">{item.planoAtual.nome}</div>
                                  <div className="text-lg font-bold">
                                    {formatCurrency(item.planoAtual.valor)}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">Plano Mais Barato</div>
                                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                                  <div className="font-medium">{item.planoMaisBarato.nome}</div>
                                  <div className="text-lg font-bold">
                                    {formatCurrency(item.planoMaisBarato.valor)}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="pt-3 border-t">
                              <Button 
                                onClick={() => handleConfirmEconomy(item)}
                                className="w-full"
                                variant="default"
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Já fiz essa economia!
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  
                  {plan === 'premium' && detalhes.length > 5 && (
                    <div className="text-center py-4 border rounded-lg bg-muted/50">
                      <Lock size={20} className="mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {detalhes.length - 5} assinaturas adicionais disponíveis no Ultimate
                      </p>
                      <Button size="sm" variant="outline" onClick={onUpgrade} className="mt-2">
                        Upgrade para Ultimate
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}