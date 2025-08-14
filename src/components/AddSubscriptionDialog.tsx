import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscriptionAdded: () => void;
}

export function AddSubscriptionDialog({ 
  open, 
  onOpenChange, 
  onSubscriptionAdded 
}: AddSubscriptionDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    subscriptionStatus: 'essencial',
    nextChargeDate: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await supabase
        .from('subscriptions')
        .insert([{
          user_id: user.id,
          name: formData.name,
          price: parseFloat(formData.price),
          category: formData.category as 'alimentacao' | 'musica' | 'streaming' | 'outros',
          subscription_status: formData.subscriptionStatus as 'essencial' | 'nao_essencial' | 'otimizavel',
          next_charge_date: formData.nextChargeDate || null,
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Assinatura adicionada com sucesso.",
      });

      onSubscriptionAdded();
      onOpenChange(false);
      setFormData({ name: '', price: '', category: '', subscriptionStatus: 'essencial', nextChargeDate: '' });
    } catch (error) {
      console.error('Erro ao adicionar assinatura:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar assinatura. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (value: string) => {
    // Remove tudo que não é número ou vírgula/ponto
    const cleanValue = value.replace(/[^\d,\.]/g, '');
    // Substitui vírgula por ponto para cálculos
    const numericValue = cleanValue.replace(',', '.');
    setFormData(prev => ({ ...prev, price: numericValue }));
  };

  const formatPriceDisplay = (value: string) => {
    if (!value) return '';
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(numericValue);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Assinatura</DialogTitle>
          <DialogDescription>
            Preencha os dados da nova assinatura para adicionar ao seu controle.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Assinatura</Label>
            <Input
              id="name"
              placeholder="ex: Netflix, Spotify, Gym..."
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Valor Mensal</Label>
            <div className="relative">
              <Input
                id="price"
                placeholder="0,00"
                value={formData.price}
                onChange={(e) => handlePriceChange(e.target.value)}
                required
              />
              {formData.price && (
                <div className="absolute right-2 top-2 text-sm text-muted-foreground">
                  {formatPriceDisplay(formData.price)}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alimentacao">Alimentação</SelectItem>
                <SelectItem value="musica">Música</SelectItem>
                <SelectItem value="streaming">Streaming</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subscriptionStatus">Status da Assinatura</Label>
            <Select 
              value={formData.subscriptionStatus} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, subscriptionStatus: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="essencial">Essencial</SelectItem>
                <SelectItem value="nao_essencial">Não Essencial</SelectItem>
                <SelectItem value="otimizavel">Otimizável</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextChargeDate">Próxima Cobrança (opcional)</Label>
            <Input
              id="nextChargeDate"
              type="date"
              value={formData.nextChargeDate}
              onChange={(e) => setFormData(prev => ({ ...prev, nextChargeDate: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={loading}
            >
              {loading ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}