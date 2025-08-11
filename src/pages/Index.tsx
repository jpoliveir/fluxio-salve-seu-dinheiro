import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header com seletor de tema */}
      <header className="absolute top-0 right-0 p-4">
        <ThemeToggle />
      </header>
      
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6 max-w-2xl mx-auto px-6">
          <div className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center mx-auto text-brand-foreground">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C8 3 4 4 4 8c0 3 2 5 4 6 2 1 2 1 4 1s2 0 4-1c2-1 4-3 4-6 0-4-4-5-8-5z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold">Bem-vindo ao Fluxio</h1>
          <p className="text-xl text-muted-foreground">
            Controle suas assinaturas, receba alertas de renovação e economize automaticamente com sugestões inteligentes.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button asChild size="lg" className="px-8">
              <Link to="/auth">Começar Grátis</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-8">
              <Link to="/auth">Entrar</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
