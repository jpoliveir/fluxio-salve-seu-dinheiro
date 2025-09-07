import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { Crown } from "lucide-react";

interface AddSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscriptionAdded: () => void;
  currentCount: number;
  onUpgrade: () => void;
}

export function AddSubscriptionDialog({ 
  open, 
  onOpenChange, 
  onSubscriptionAdded, 
  currentCount,
  onUpgrade 
}: AddSubscriptionDialogProps) {
  const { user } = useAuth();
  const { plan } = useSubscription();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [servicosDisponiveis, setServicosDisponiveis] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    servico: "",
    next_charge_date: "",
    billing_cycle: "monthly"
  });

  // Função para buscar serviços disponíveis
  const fetchServicos = async () => {
    try {
      const { data, error } = await supabase
        .from('servicos_planos')
        .select('servico')
        .order('servico');

      if (error) throw error;
      
      const servicosUnicos = [...new Set(data.map(item => item.servico))];
      setServicosDisponiveis(servicosUnicos);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchServicos();
    }
  }, [open]);

  // Verificar limite por plano
  const getSubscriptionLimit = () => {
    switch (plan) {
      case 'free': return 3;
      case 'premium': return 10;
      case 'enterprise': return 20;
      default: return 3;
    }
  };

  const subscriptionLimit = getSubscriptionLimit();
  const canAddSubscription = currentCount < subscriptionLimit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!canAddSubscription) {
      toast({
        title: "Limite atingido",
        description: `Você atingiu o limite de ${subscriptionLimit} assinaturas do plano ${plan}. Faça upgrade para adicionar mais assinaturas.`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          name: formData.name,
          price: parseFloat(formData.price),
          category: formData.category as any,
          servico: formData.servico === "none" ? null : formData.servico,
          next_charge_date: formData.next_charge_date || null,
          billing_cycle: formData.billing_cycle,
          user_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Assinatura adicionada com sucesso!"
      });

      setFormData({
        name: "",
        price: "",
        category: "",
        servico: "none",
        next_charge_date: "",
        billing_cycle: "monthly"
      });
      
      onSubscriptionAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao adicionar assinatura:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar assinatura. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Adicionar Nova Assinatura
            {!canAddSubscription && <Crown size={16} className="text-yellow-500" />}
          </DialogTitle>
        </DialogHeader>

        {!canAddSubscription ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Crown size={24} className="text-yellow-500" />
            </div>
            <h3 className="font-medium mb-2">Limite Atingido</h3>
            <p className="text-muted-foreground mb-4">
              Você atingiu o limite de {subscriptionLimit} assinaturas do plano {plan}.
            </p>
            <Button onClick={onUpgrade}>
              Fazer Upgrade
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              {currentCount} de {subscriptionLimit} assinaturas cadastradas
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome da Assinatura</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Netflix"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preço Mensal (R$)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="Ex: 39.90"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="servico">Serviço (opcional)</Label>
              <Select
                value={formData.servico}
                onValueChange={(value) => setFormData({ ...formData, servico: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um serviço para análise de economia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {servicosDisponiveis.map((servico) => (
                    <SelectItem key={servico} value={servico}>
                      {servico}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="streaming">Streaming</SelectItem>
                  <SelectItem value="musica">Música</SelectItem>
                  <SelectItem value="alimentacao">Alimentação</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="next_charge_date">Próxima Cobrança</Label>
              <Input
                id="next_charge_date"
                type="date"
                value={formData.next_charge_date}
                onChange={(e) => setFormData({ ...formData, next_charge_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing_cycle">Ciclo de Cobrança</Label>
              <Select
                value={formData.billing_cycle}
                onValueChange={(value) => setFormData({ ...formData, billing_cycle: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}