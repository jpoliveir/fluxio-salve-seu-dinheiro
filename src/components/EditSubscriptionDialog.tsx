import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";
import { subscriptionSchema } from "@/lib/validations";
import { currencyInputToNumber, formatCurrencyInput, numberToCurrencyInput } from "@/lib/utils";

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
  const [searchTerm, setSearchTerm] = useState('');
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [originalData, setOriginalData] = useState({
    name: '',
    price: '',
    category: '',
    servico: '',
    next_charge_date: '',
    billing_cycle: '',
    status: ''
  });
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
      const data = {
        name: subscription.name,
        price: numberToCurrencyInput(subscription.price),
        category: subscription.category,
        servico: subscription.servico || 'none',
        next_charge_date: subscription.next_charge_date || '',
        billing_cycle: subscription.billing_cycle,
        status: subscription.status
      };
      setFormData(data);
      setOriginalData(data);
    }
  }, [subscription]);

  useEffect(() => {
    fetchServices();
  }, []);

  // Detectar serviço baseado no nome da assinatura
  useEffect(() => {
    if (formData.name) {
      const servicoDetectado = detectarServico(formData.name);
      // Atualiza sempre que detectar um serviço diferente do atual
      if (servicoDetectado !== formData.servico) {
        setFormData(prev => ({ ...prev, servico: servicoDetectado }));
      }
    } else {
      // Se limpar o nome, volta para 'outros'
      if (formData.servico !== 'outros') {
        setFormData(prev => ({ ...prev, servico: 'outros' }));
      }
    }
  }, [formData.name]);

  const detectarServico = (nomeAssinatura: string): string => {
    const nome = nomeAssinatura.toLowerCase();
    
    // Netflix
    if (nome.includes('netflix')) return 'Netflix';
    // Spotify
    if (nome.includes('spotify')) return 'Spotify';
    // YouTube
    if (nome.includes('youtube') || nome.includes('yt')) return 'YouTube Premium';
    // Apple Music
    if (nome.includes('apple') && nome.includes('music')) return 'Apple Music';
    // Disney+
    if (nome.includes('disney')) return 'Disney+';
    // HBO Max
    if (nome.includes('hbo')) return 'HBO Max';
    // Amazon Prime
    if ((nome.includes('amazon') && nome.includes('prime')) || nome.includes('prime')) return 'Amazon Prime';
    // Globoplay
    if (nome.includes('globo')) return 'Globoplay';
    // Paramount+
    if (nome.includes('paramount')) return 'Paramount+';
    // Crunchyroll
    if (nome.includes('crunchyroll')) return 'Crunchyroll';
    // Star+
    if (nome.includes('star')) return 'Star+';
    // Discovery+
    if (nome.includes('discovery')) return 'Discovery+';
    // Microsoft 365
    if (nome.includes('microsoft') || nome.includes('office')) return 'Microsoft 365';
    // Google One
    if (nome.includes('google') && nome.includes('one')) return 'Google One';
    // Adobe
    if (nome.includes('adobe')) return 'Adobe Creative Cloud';
    // Canva
    if (nome.includes('canva')) return 'Canva Pro';
    // Notion
    if (nome.includes('notion')) return 'Notion';
    // iFood
    if (nome.includes('ifood')) return 'iFood Pro';
    // Uber
    if (nome.includes('uber')) return 'Uber One';
    // PlayStation
    if (nome.includes('playstation') || nome.includes('ps')) return 'PlayStation Plus';
    // Xbox
    if (nome.includes('xbox') || nome.includes('game pass')) return 'Xbox Game Pass';
    // Nintendo
    if (nome.includes('nintendo')) return 'Nintendo Switch Online';
    // Gympass
    if (nome.includes('gympass')) return 'Gympass';
    // Nike
    if (nome.includes('nike')) return 'Nike Training Club';
    
    return 'outros';
  };

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
      // Falha silenciosa - não afeta funcionalidade principal
      setServices([]);
    }
  };

  // Check if form has unsaved changes
  const hasUnsavedChanges = () => {
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  };

  // Handle dialog close with unsaved changes check
  const handleClose = (newOpen: boolean) => {
    if (!newOpen && hasUnsavedChanges()) {
      setShowUnsavedChangesDialog(true);
    } else {
      onOpenChange(newOpen);
    }
  };

  // Confirm close without saving
  const confirmCloseWithoutSaving = () => {
    setShowUnsavedChangesDialog(false);
    onOpenChange(false);
    // Reset form to original data
    if (subscription) {
      const data = {
        name: subscription.name,
        price: numberToCurrencyInput(subscription.price),
        category: subscription.category,
        servico: subscription.servico || 'none',
        next_charge_date: subscription.next_charge_date || '',
        billing_cycle: subscription.billing_cycle,
        status: subscription.status
      };
      setFormData(data);
      setOriginalData(data);
    }
  };

  const filteredServices = services.filter(service =>
    service.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscription) return;

    setLoading(true);
    try {
      // Validate input data using Zod schema
      const validatedData = subscriptionSchema.parse({
        name: formData.name,
        price: currencyInputToNumber(formData.price),
        category: formData.category,
        billing_cycle: formData.billing_cycle,
        next_charge_date: formData.next_charge_date || undefined,
        servico: formData.servico === "none" || formData.servico === "outros" ? undefined : formData.servico,
      });

      const { error } = await supabase
        .from('subscriptions')
        .update({
          name: validatedData.name,
          price: validatedData.price,
          category: validatedData.category as any,
          servico: validatedData.servico || null,
          next_charge_date: validatedData.next_charge_date || null,
          billing_cycle: validatedData.billing_cycle,
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
    } catch (error: any) {
      // Handle Zod validation errors
      if (error.issues) {
        const errorMessage = error.issues.map((issue: any) => issue.message).join(", ");
        toast({
          title: "Dados inválidos",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao atualizar assinatura. Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Assinatura</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Serviço/Assinatura</Label>
            <div className="relative">
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Netflix Premium"
                required
              />
              {formData.name && formData.servico !== 'outros' && formData.servico !== 'none' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-background px-2 py-1 rounded border">
                  {formData.servico}
                </div>
              )}
            </div>
            {formData.name && formData.servico !== 'outros' && formData.servico !== 'none' && (
              <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 p-2 rounded border cursor-pointer hover:bg-muted/50 transition-colors">
                <span>Serviço detectado: {formData.servico}</span>
                <Select value={formData.servico} onValueChange={(value) => setFormData({ ...formData, servico: value })}>
                  <SelectTrigger className="h-6 w-20 text-xs border-none hover:bg-muted">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-md">
                    <div className="flex items-center border-b px-3 pb-2 mb-2">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <Input
                        placeholder="Buscar serviços..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="border-0 p-0 focus-visible:ring-0 text-sm"
                      />
                    </div>
                    <SelectItem value="outros">Outros</SelectItem>
                    {filteredServices.map((service) => (
                      <SelectItem key={service} value={service}>
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Preço Mensal (R$)</Label>
            <Input
              id="price"
                type="text"
                inputMode="numeric"
                autoComplete="off"
              value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: formatCurrencyInput(e.target.value) })}
                placeholder="0,00"
                aria-label="Preço mensal em reais"
              required
            />
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
            <Button type="button" variant="outline" onClick={() => handleClose(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Unsaved Changes Dialog */}
    <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
          <AlertDialogDescription>
            Você tem alterações não salvas. Tem certeza que deseja sair sem salvar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continuar editando</AlertDialogCancel>
          <AlertDialogAction onClick={confirmCloseWithoutSaving}>
            Sair sem salvar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}