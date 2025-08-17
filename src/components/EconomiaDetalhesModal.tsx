import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Lock } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

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

interface EconomiaDetalhesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detalhes: EconomiaDetalhes[];
  onUpgrade: () => void;
}

export function EconomiaDetalhesModal({ 
  open, 
  onOpenChange, 
  detalhes, 
  onUpgrade 
}: EconomiaDetalhesModalProps) {
  const { plan } = useSubscription();

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

  const detalhesParaMostrar = getDetalhesDisponiveis();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            💰 Detalhes da Economia Potencial
            <Crown size={20} className="text-yellow-500" />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {plan === 'free' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Lock size={24} className="text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">🔒 Detalhes Premium</h3>
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
                  {detalhesParaMostrar.map((item, index) => (
                    <div key={index} className={`border rounded-lg p-4 space-y-3 ${item.estimativa ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-lg">{item.servico}</h4>
                          {item.estimativa && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 mt-1">
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
                    </div>
                  ))}
                  
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