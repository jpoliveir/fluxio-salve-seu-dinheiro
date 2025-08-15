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
          
          {/* Seção de características */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 text-left">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand">
                  <path d="M9 12l2 2 4-4"/>
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Controle Total</h3>
              <p className="text-muted-foreground">Gerencie todas as suas assinaturas em um só lugar com alertas inteligentes.</p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Economia Inteligente</h3>
              <p className="text-muted-foreground">Receba sugestões personalizadas para otimizar seus gastos mensais.</p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand">
                  <path d="M3 13l4 4L22 2"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Nunca Mais Esqueça</h3>
              <p className="text-muted-foreground">Alertas automáticos antes das renovações para evitar cobranças inesperadas.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
