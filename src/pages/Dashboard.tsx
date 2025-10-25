import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Eye, EyeOff, LogOut, User, Crown, Menu, RefreshCw, Edit, AlertTriangle, Zap, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SubscriptionPlans } from "@/components/SubscriptionPlans";
import { supabase } from "@/integrations/supabase/client";
import { AddSubscriptionDialog } from "@/components/AddSubscriptionDialog";
import { useToast } from "@/hooks/use-toast";
import { useEconomiaAssinaturas } from "@/hooks/useEconomiaAssinaturas";
import { useDuplicateDetection } from "@/hooks/useDuplicateDetection";
import { EconomiaDetalhesModal } from "@/components/EconomiaDetalhesModal";
import { EditSubscriptionDialog } from "@/components/EditSubscriptionDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Subscription {
  id: string;
  name: string;
  price: number;
  category: string;
  subscription_status: string;
  next_charge_date: string | null;
  billing_cycle: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { plan, checkSubscription, loading: subscriptionLoading } = useSubscription();
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [userProfile, setUserProfile] = useState<{ display_name: string | null }>({ display_name: null });
  const [loading, setLoading] = useState(true);
  const [showEconomy, setShowEconomy] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [showEconomiaDetalhes, setShowEconomiaDetalhes] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  
  const { economiaData, loading: economiaLoading, recalcular } = useEconomiaAssinaturas();
  const { isDuplicate, getDuplicateInfo, detectDuplicates } = useDuplicateDetection();

  useEffect(() => {
    fetchSubscriptions();
    fetchUserProfile();
    // Verificação automática da assinatura ao acessar o dashboard
    checkSubscription();
  }, []);

  const handleRefreshSubscription = async () => {
    try {
      await checkSubscription();
      toast({
        title: "Status Atualizado",
        description: "Status da assinatura verificado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao verificar status da assinatura.",
        variant: "destructive",
      });
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setUserProfile(data || { display_name: null });
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data as Subscription[] || []);
      // Recalcular economia e detectar duplicatas sempre que as assinaturas mudarem
      recalcular();
      detectDuplicates();
    } catch (error) {
      console.error('Erro ao buscar assinaturas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar assinaturas. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleDeleteAllSubscriptions = async () => {
    try {
      // Deletar todas as assinaturas EXCETO a do Fluxio
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('user_id', user?.id)
        .neq('name', 'Fluxio');

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Todas as assinaturas foram removidas (mantendo apenas Fluxio).",
      });

      setShowDeleteAllDialog(false);
      await fetchSubscriptions();
    } catch (error) {
      console.error('Erro ao deletar assinaturas:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover assinaturas. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getUserDisplayName = () => {
    return userProfile.display_name || user?.email?.split('@')[0] || 'Usuário';
  };

  // Função para obter limite de assinaturas por plano
  const getSubscriptionLimit = () => {
    switch (plan) {
      case 'free': return 3;
      case 'premium': return 10;
      case 'enterprise': return 20;
      default: return 3;
    }
  };

  const subscriptionLimit = getSubscriptionLimit();
  const totalMonthly = subscriptions.reduce((sum, sub) => sum + Number(sub.price), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Não definida';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short'
    }).format(new Date(dateString));
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      alimentacao: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      musica: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      streaming: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      outros: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return colors[category as keyof typeof colors] || colors.outros;
  };

  const handleEditSubscription = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setShowEditDialog(true);
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    setEditingSubscription(null);
    fetchSubscriptions();
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Dashboard — Fluxio</title>
        <meta name="description" content="Gerencie suas assinaturas e controle seus gastos mensais" />
      </Helmet>

      {/* Header Otimizado para Mobile */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-brand-foreground">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3C8 3 4 4 4 8c0 3 2 5 4 6 2 1 2 1 4 1s2 0 4-1c2-1 4-3 4-6 0-4-4-5-8-5z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold">Fluxio</div>
                <div className="text-xs text-muted-foreground">Dashboard</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={userProfile.display_name ? undefined : undefined} alt={getUserDisplayName()} />
                      <AvatarFallback className="bg-brand text-brand-foreground">
                        {getUserDisplayName().charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {(plan === 'premium' || plan === 'enterprise') && (
                      <Crown size={12} className="absolute -top-1 -right-1 text-yellow-500 bg-background rounded-full p-0.5" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-brand text-brand-foreground">
                            <User size={24} />
                          </AvatarFallback>
                        </Avatar>
                        {(plan === 'premium' || plan === 'enterprise') && (
                          <Crown size={16} className="absolute -top-1 -right-1 text-yellow-500 bg-background rounded-full p-0.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{getUserDisplayName()}</p>
                        <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Plano Atual</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium capitalize">{plan === 'free' ? 'Gratuito' : plan === 'premium' ? 'Premium' : 'Enterprise'}</span>
                          {(plan === 'premium' || plan === 'enterprise') && (
                            <Crown size={14} className="text-yellow-500" />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Assinaturas</span>
                        <span className="font-medium">{subscriptions.length} de {getSubscriptionLimit()}</span>
                      </div>
                    </div>
                    
                    {plan !== 'enterprise' && (
                      <>
                        <Separator />
                        <Button 
                          className="w-full" 
                          onClick={() => setShowPlans(true)}
                          variant="default"
                        >
                          <Zap size={16} />
                          Fazer Upgrade
                        </Button>
                      </>
                    )}
                    
                    <Separator />
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleRefreshSubscription}
                        disabled={subscriptionLoading}
                        className="flex-1"
                      >
                        <RefreshCw size={16} className={subscriptionLoading ? "animate-spin" : ""} />
                        Atualizar
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleSignOut} className="flex-1">
                        <LogOut size={16} />
                        Sair
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center text-brand-foreground">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3C8 3 4 4 4 8c0 3 2 5 4 6 2 1 2 1 4 1s2 0 4-1c2-1 4-3 4-6 0-4-4-5-8-5z" />
                </svg>
              </div>
              <div className="font-semibold text-sm">Fluxio</div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground">{getUserDisplayName()}</div>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu size={16} />
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-3 pt-3 border-t flex flex-col gap-2">
              <div className="flex justify-center">
                <ThemeToggle />
              </div>
              <Button size="sm" variant="outline" onClick={handleSignOut} className="mx-auto w-fit">
                <LogOut size={16} />
                Sair
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Cards principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Gasto Total do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-brand">
                {formatCurrency(totalMonthly)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {subscriptions.length} assinatura{subscriptions.length !== 1 ? 's' : ''} ativa{subscriptions.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Economia Potencial</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEconomy(!showEconomy)}
                  className="p-2"
                >
                  {showEconomy ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
                {economiaData && economiaData.detalhes.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowEconomiaDetalhes(true)}
                  >
                    Ver Detalhes
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {economiaLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-muted rounded w-24 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-32"></div>
                </div>
              ) : (
                <>
                  {showEconomy ? (
                    <div className="text-3xl font-bold text-green-600">
                      {formatCurrency(economiaData?.economia_total || 0)}
                    </div>
                  ) : (
                    <div className="text-3xl font-bold text-muted-foreground">
                      ••••••
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Crown size={14} className="text-yellow-500" />
                    {economiaData && economiaData.detalhes.length > 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {economiaData.detalhes.length} oportunidade{economiaData.detalhes.length !== 1 ? 's' : ''} de economia
                      </p>
                    ) : subscriptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Adicione suas assinaturas para ver quanto poderia economizar
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Adicione o serviço nas assinaturas para análise
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lista de Assinaturas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Minhas Assinaturas</CardTitle>
              {subscriptions.length >= subscriptionLimit ? (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-amber-600 dark:text-amber-500 font-medium">
                    Limite máximo atingido
                  </p>
                  {plan !== 'enterprise' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowPlans(true)}
                      className="h-6 text-xs"
                    >
                      <Zap size={12} />
                      Upgrade
                    </Button>
                  )}
                </div>
              ) : subscriptions.length === subscriptionLimit - 1 && (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-amber-600 dark:text-amber-500">
                    Falta 1 assinatura para o limite
                  </p>
                  {plan !== 'enterprise' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowPlans(true)}
                      className="h-6 text-xs"
                    >
                      <Zap size={12} />
                      Upgrade
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowPlans(true)}
              >
                Ver Planos
              </Button>
              {subscriptions.filter(sub => sub.name !== 'Fluxio').length > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowDeleteAllDialog(true)}
                >
                  <Trash2 size={16} />
                  Limpar Tudo
                </Button>
              )}
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus size={16} />
                Adicionar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
                <p className="text-muted-foreground mt-2">Carregando...</p>
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Plus size={24} className="text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-2">Nenhuma assinatura encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  Adicione sua primeira assinatura para começar a controlar seus gastos
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus size={16} />
                  Adicionar assinatura
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {subscriptions.map((subscription) => (
                  <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-brand/10 flex items-center justify-center text-brand font-semibold">
                        {subscription.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          {subscription.name}
                          {isDuplicate(subscription.id) && (
                            <div className="group relative">
                              <AlertTriangle 
                                size={16} 
                                className="text-amber-500" 
                              />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border shadow-sm">
                                Possível duplicata: {getDuplicateInfo(subscription.id)?.reason}
                              </div>
                            </div>
                          )}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(subscription.category)}`}>
                            {subscription.category.charAt(0).toUpperCase() + subscription.category.slice(1)}
                          </span>
                          {isDuplicate(subscription.id) && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                              Duplicata
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatCurrency(Number(subscription.price))}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Próxima: {formatDate(subscription.next_charge_date)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditSubscription(subscription)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <AddSubscriptionDialog 
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubscriptionAdded={fetchSubscriptions}
        currentCount={subscriptions.length}
        onUpgrade={() => {
          setShowAddDialog(false);
          setShowPlans(true);
        }}
      />

      <EconomiaDetalhesModal
        open={showEconomiaDetalhes}
        onOpenChange={setShowEconomiaDetalhes}
        detalhes={(economiaData?.detalhes || []).map(item => ({
          ...item,
          subscriptionId: subscriptions.find(sub => sub.name === item.planoAtual.nome)?.id
        }))}
        onUpgrade={() => {
          setShowEconomiaDetalhes(false);
          setShowPlans(true);
        }}
        onRefresh={() => {
          fetchSubscriptions();
          recalcular();
        }}
      />

      <EditSubscriptionDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        subscription={editingSubscription}
        onSuccess={handleEditSuccess}
      />

      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá deletar permanentemente todas as suas assinaturas, exceto a assinatura do Fluxio que será mantida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllSubscriptions}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, deletar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Modal de Planos */}
      {showPlans && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Escolha seu Plano</h2>
                <Button variant="ghost" onClick={() => setShowPlans(false)}>
                  ✕
                </Button>
              </div>
              <SubscriptionPlans />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}