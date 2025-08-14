import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Eye, EyeOff, LogOut, User, Crown, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SubscriptionPlans } from "@/components/SubscriptionPlans";
import { supabase } from "@/integrations/supabase/client";
import { AddSubscriptionDialog } from "@/components/AddSubscriptionDialog";
import { useToast } from "@/hooks/use-toast";

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
  const { plan } = useSubscription();
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [userProfile, setUserProfile] = useState<{ display_name: string | null }>({ display_name: null });
  const [loading, setLoading] = useState(true);
  const [showEconomy, setShowEconomy] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
    fetchUserProfile();
  }, []);

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

  const getUserDisplayName = () => {
    return userProfile.display_name || user?.email?.split('@')[0] || 'Usuário';
  };

  const totalMonthly = subscriptions.reduce((sum, sub) => sum + Number(sub.price), 0);
  
  // Calcular economia potencial baseada nas assinaturas não essenciais e otimizáveis
  const optimizableSubscriptions = subscriptions.filter(sub => 
    sub.subscription_status === 'nao_essencial' || sub.subscription_status === 'otimizavel'
  );
  const potentialSavings = optimizableSubscriptions.reduce((sum, sub) => sum + Number(sub.price), 0);

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
              <div className="flex items-center gap-2 text-sm">
                <User size={16} />
                <span className="text-muted-foreground">{getUserDisplayName()}</span>
              </div>
              <Button size="sm" variant="outline" onClick={handleSignOut}>
                <LogOut size={16} />
                Sair
              </Button>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEconomy(!showEconomy)}
                className="p-2"
              >
                {showEconomy ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </CardHeader>
            <CardContent>
              {plan === 'premium' || plan === 'enterprise' ? (
                showEconomy ? (
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(potentialSavings)}
                  </div>
                ) : (
                  <div className="text-3xl font-bold text-muted-foreground">
                    ••••••
                  </div>
                )
              ) : (
                <div className="text-3xl font-bold text-muted-foreground">
                  ••••••
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Crown size={14} className="text-yellow-500" />
                {plan === 'premium' || plan === 'enterprise' ? (
                  <p className="text-sm text-muted-foreground">
                    {optimizableSubscriptions.length} assinatura{optimizableSubscriptions.length !== 1 ? 's' : ''} otimizável{optimizableSubscriptions.length !== 1 ? 'is' : ''}
                  </p>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Recurso Premium</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowPlans(true)}
                      className="h-6 px-2 text-xs"
                    >
                      Upgrade
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Assinaturas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Minhas Assinaturas</CardTitle>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus size={16} />
              Adicionar
            </Button>
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
                        <h4 className="font-medium">{subscription.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(subscription.category)}`}>
                            {subscription.category.charAt(0).toUpperCase() + subscription.category.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(Number(subscription.price))}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Próxima: {formatDate(subscription.next_charge_date)}
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
      />
      
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