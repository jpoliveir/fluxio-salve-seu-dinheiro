import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Bem-vindo ao Fluxio</h1>
        <p className="text-xl text-muted-foreground">
          {user ? "Continue gerenciando suas assinaturas" : "Comece a controlar suas assinaturas hoje"}
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild variant="brand">
            <Link to={user ? "/fluxio" : "/auth"}>
              {user ? "Ir para Dashboard" : "Começar Grátis"}
            </Link>
          </Button>
          {!user && (
            <Button asChild variant="outline">
              <Link to="/auth">Entrar</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
