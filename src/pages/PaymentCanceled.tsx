import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, ArrowLeft, CreditCard } from "lucide-react";

export default function PaymentCanceled() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Helmet>
        <title>Pagamento Cancelado — Fluxio</title>
        <meta name="description" content="Pagamento cancelado pelo usuário" />
      </Helmet>

      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl">Pagamento Cancelado</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">
            Não se preocupe! Você pode tentar novamente a qualquer momento. 
            Seus dados estão seguros e nenhuma cobrança foi realizada.
          </p>

          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="w-full"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>Precisa de ajuda?</p>
            <p>Entre em contato conosco se tiver alguma dúvida sobre os planos ou pagamento.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}