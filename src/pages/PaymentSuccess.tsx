import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Crown, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { plan, checkSubscription } = useSubscription();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationComplete, setVerificationComplete] = useState(false);

  useEffect(() => {
    const verifySubscription = async () => {
      try {
        // Aguarda um pouco para o Stripe processar
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Força verificação da assinatura
        await checkSubscription();
        
        setVerificationComplete(true);
        
        toast({
          title: "Assinatura Ativada!",
          description: "Sua assinatura foi ativada com sucesso. Aproveite todos os recursos premium!",
        });
      } catch (error) {
        console.error('Erro ao verificar assinatura:', error);
        toast({
          title: "Verificação em andamento",
          description: "Sua assinatura está sendo processada. Pode levar alguns minutos para aparecer.",
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifySubscription();
  }, [checkSubscription, toast]);

  const getPlanName = (planType: string) => {
    switch (planType) {
      case 'premium': return 'Premium';
      case 'enterprise': return 'Ultimate';
      default: return 'Free';
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Helmet>
        <title>Pagamento Realizado — Fluxio</title>
        <meta name="description" content="Seu pagamento foi processado com sucesso" />
      </Helmet>

      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Pagamento Realizado!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {isVerifying ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-muted-foreground">Verificando sua assinatura...</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Aguarde enquanto confirmamos sua assinatura no sistema.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {verificationComplete && (plan === 'premium' || plan === 'enterprise') ? (
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    <span className="font-semibold text-green-800 dark:text-green-200">
                      Plano {getPlanName(plan)} Ativo
                    </span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Agora você tem acesso a todos os recursos premium!
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Sua assinatura está sendo processada. Pode levar alguns minutos para aparecer no sistema.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/dashboard')} 
                  className="w-full"
                >
                  Ir para o Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  onClick={checkSubscription}
                  className="w-full"
                >
                  Verificar Status Novamente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}