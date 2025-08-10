import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Bem-vindo</h1>
        <p className="text-xl text-muted-foreground">Veja a página de demonstração do Fluxio.</p>
        <Button asChild variant="brand">
          <Link to="/fluxio">Abrir página Fluxio</Link>
        </Button>
      </div>
    </div>
  );
};

export default Index;
