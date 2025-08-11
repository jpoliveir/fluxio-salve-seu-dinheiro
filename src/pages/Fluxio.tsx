import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, Check, Clock, Zap, LogOut, User } from "lucide-react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";

export default function Fluxio() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted text-foreground antialiased">
      <Helmet>
        <title>Fluxio — Controle de Assinaturas</title>
        <meta name="description" content="Controle suas assinaturas, receba alertas de renovação e economize automaticamente com sugestões inteligentes — feito para o Brasil." />
        <link rel="canonical" href="/fluxio" />
        <meta property="og:title" content="Fluxio — Controle de Assinaturas" />
        <meta property="og:description" content="Gerencie assinaturas, receba avisos e economize automaticamente." />
        <meta property="og:type" content="website" />
      </Helmet>

      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <div className="text-lg font-semibold leading-none">Fluxio</div>
            <div className="text-xs text-muted-foreground -mt-0.5">Controle suas assinaturas. Economize fácil.</div>
          </div>
        </div>
        <nav className="hidden md:flex gap-4 items-center">
          <a className="text-sm text-muted-foreground hover:text-foreground story-link" href="#recursos">Recursos</a>
          <a className="text-sm text-muted-foreground hover:text-foreground story-link" href="#precos">Preços</a>
          <a className="text-sm text-muted-foreground hover:text-foreground story-link" href="#ajuda">Ajuda</a>
          <div className="flex items-center gap-2 ml-2">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <User size={16} />
              {user?.email}
            </span>
            <Button size="sm" variant="outline" onClick={handleSignOut}>
              <LogOut size={16} />
              Sair
            </Button>
          </div>
        </nav>
        <div className="md:hidden">
          <button className="p-2 rounded-md bg-accent hover-scale" aria-label="Abrir menu">
            <ArrowRight size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
            className="space-y-6"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">
              Tenha controle das suas assinaturas — <span className="text-brand">economize automaticamente</span>
            </h1>
            <p className="text-muted-foreground max-w-xl">
              Cadastro manual ou automatizado via Open Finance, alertas de renovação e sugestões inteligentes para reduzir
              gastos — tudo em um app intuitivo pensado para o público brasileiro.
            </p>

            <div className="flex gap-3 flex-wrap">
              <Button className="px-5 py-3 hover-scale" asChild>
                <a href="/auth">Começar grátis</a>
              </Button>
              <Button className="px-5 py-3" variant="brand" asChild>
                <a href="/auth">Ver planos</a>
              </Button>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <Feature icon={<Check size={18} />} label="Cadastro manual" sub="Rápido e simples" />
              <Feature icon={<Clock size={18} />} label="Avisos de renovação" sub="Nunca perca um vencimento" />
              <Feature icon={<Zap size={18} />} label="Sugestões de economia" sub="Recomendações automáticas" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center"
          >
            <div className="w-full max-w-md">
              <Card className="shadow-sm">
                <CardHeader className="px-6 pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Fluxio</CardTitle>
                      <CardDescription>Seu assistente de assinaturas</CardDescription>
                    </div>
                    <div className="hidden sm:block">
                      <Mascot />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="space-y-4">
                    <div className="bg-muted rounded-md p-4">
                      <div className="text-sm text-muted-foreground">Assinaturas ativas</div>
                      <div className="text-2xl font-semibold">3</div>
                    </div>

                    <div className="flex gap-3">
                      <MiniStat label="Gasto mensal" value="R$ 89,90" />
                      <MiniStat label="Próxima cobrança" value="12 Ago" />
                    </div>

                    <div className="pt-2">
                      <Button className="w-full py-3" variant="outline" asChild>
                        <a href="/auth">Ir para painel</a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <PlanPill title="Free" price="Grátis" bullets={["Manual", "Alertas", "Comparativos"]} />
                <PlanPill title="Premium" price="R$14,90/mês" bullets={["Open Finance", "Sugestões"]} highlight />
                <PlanPill title="Ultimate" price="R$29,90/mês" bullets={["Economia automática", "Comparador", "Relatórios"]} />
              </div>
            </div>
          </motion.div>
        </section>

        <section className="mt-12" id="recursos">
          <h2 className="text-2xl font-semibold">Como funciona</h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <HowItWorksStep number={1} title="Adicione suas assinaturas" desc="Manual ou via Open Finance" />
            <HowItWorksStep number={2} title="Receba avisos" desc="Alertas antes da renovação" />
            <HowItWorksStep number={3} title="Economize automaticamente" desc="Sugestões e cortes automáticos (Ultimate)" />
          </div>
        </section>

        <section className="mt-12 py-8 bg-card rounded-lg border">
          <div className="md:flex md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-semibold">Pronto pra começar a economizar?</h3>
              <p className="text-muted-foreground">Teste o plano Free e veja quanto você pode economizar.</p>
            </div>
            <div className="mt-4 md:mt-0">
              <Button className="px-6 py-3" variant="brand" asChild>
                <a href="/auth">Criar conta grátis</a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-12 py-8 border-t">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo small />
            <div className="text-sm text-muted-foreground">Fluxio — Controle suas assinaturas • © {new Date().getFullYear()}</div>
          </div>
          <div className="text-sm text-muted-foreground">Termos • Privacidade • Suporte</div>
        </div>
      </footer>
    </div>
  );
}

function Logo({ small }: { small?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${small ? "text-sm" : ""}`}>
      <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-sm text-brand-foreground">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M12 3C8 3 4 4 4 8c0 3 2 5 4 6 2 1 2 1 4 1s2 0 4-1c2-1 4-3 4-6 0-4-4-5-8-5z" />
        </svg>
      </div>
    </div>
  );
}

function Mascot() {
  return (
    <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center text-brand">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <g>
          <rect x="6" y="18" width="52" height="34" rx="10" fill="currentColor" />
          <circle cx="24" cy="30" r="4" fill="#05303D" />
          <circle cx="40" cy="30" r="4" fill="#05303D" />
          <path d="M22 40c4 2 12 2 16 0" stroke="#05303D" strokeWidth="2" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}

function Feature({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-brand/10 rounded-md text-brand">{icon}</div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 bg-card border rounded-md p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function PlanPill({ title, price, bullets, highlight }: { title: string; price: string; bullets: string[]; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 text-center border ${highlight ? "border-brand/30 bg-brand/5" : "bg-card"}`}>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-sm font-semibold">{price}</div>
      <div className="mt-2 text-xs text-muted-foreground">{bullets.join(" • ")}</div>
    </div>
  );
}

function HowItWorksStep({ number, title, desc }: { number: number; title: string; desc: string }) {
  return (
    <div className="bg-card border rounded-lg p-6 text-center">
      <div className="w-10 h-10 rounded-full bg-brand/10 mx-auto flex items-center justify-center font-semibold text-brand">{number}</div>
      <div className="mt-4 font-medium">{title}</div>
      <div className="mt-2 text-sm text-muted-foreground">{desc}</div>
    </div>
  );
}
