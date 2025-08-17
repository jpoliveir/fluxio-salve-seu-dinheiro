import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Subscription {
  id: string;
  name: string;
  price: number;
  category: string;
  servico?: string;
  next_charge_date?: string;
  billing_cycle: string;
  status: string;
}

interface EditSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription | null;
  onSuccess: () => void;
}

export function EditSubscriptionDialog({ 
  open, 
  onOpenChange, 
  subscription, 
  onSuccess 
}: EditSubscriptionDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    servico: '',
    next_charge_date: '',
    billing_cycle: '',
    status: ''
  });

  useEffect(() => {
    if (subscription) {
      setFormData({
        name: subscription.name,
        price: subscription.price.toString(),
        category: subscription.category,
        servico: subscription.servico || '',
        next_charge_date: subscription.next_charge_date || '',
        billing_cycle: subscription.billing_cycle,
        status: subscription.status
      });
    }
  }, [subscription]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('servicos_planos')
        .select('servico')
        .order('servico');
      
      if (error) throw error;
      
      const uniqueServices = [...new Set(data.map(item => item.servico))];
      setServices(uniqueServices);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscription) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          name: formData.name,
          price: parseFloat(formData.price),
          category: formData.category as any,
          servico: formData.servico || null,
          next_charge_date: formData.next_charge_date || null,
          billing_cycle: formData.billing_cycle,
          status: formData.status
        })
        .eq('id', subscription.id);

      if (error) throw error;

      toast({
        title: "Assinatura atualizada",
        description: "As informações da assinatura foram atualizadas com sucesso.",
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar assinatura. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Assinatura</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Assinatura</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Netflix Premium"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Preço Mensal (R$)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="29.90"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="servico">Serviço</Label>
            <Select value={formData.servico} onValueChange={(value) => setFormData({ ...formData, servico: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o serviço" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service} value={service}>
                    {service}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="streaming">Streaming</SelectItem>
                <SelectItem value="software">Software</SelectItem>
                <SelectItem value="jogos">Jogos</SelectItem>
                <SelectItem value="educacao">Educação</SelectItem>
                <SelectItem value="produtividade">Produtividade</SelectItem>
                <SelectItem value="saude">Saúde</SelectItem>
                <SelectItem value="financas">Finanças</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="next_charge_date">Data da Próxima Cobrança</Label>
            <Input
              id="next_charge_date"
              type="date"
              value={formData.next_charge_date}
              onChange={(e) => setFormData({ ...formData, next_charge_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing_cycle">Ciclo de Cobrança</Label>
            <Select value={formData.billing_cycle} onValueChange={(value) => setFormData({ ...formData, billing_cycle: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="biannual">Semestral</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}