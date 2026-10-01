import { HomeHeader } from "./home/HomeHeader";
import { HomeHero } from "./home/HomeHero";
import { HomeBenefits } from "./home/HomeBenefits";
import { HomeSteps } from "./home/HomeSteps";
import { HomeCommunity } from "./home/HomeCommunity";
import { HomeFaq } from "./home/HomeFaq";
import { HomeClosing } from "./home/HomeClosing";
import "./home/home.css";

interface CreatorHomeProps {
  onLogin: () => void;
}

/**
 * Portada pública de Kreoon (claro de marca, móvil primero). La home inspira y explica: el alta
 * es solo de creadores y vive en /registro (que resuelve la organización en el servidor).
 */
export function CreatorHome({ onLogin }: CreatorHomeProps) {
  return (
    <div className="brand-surface home-root min-h-[100dvh] overflow-x-clip bg-background text-foreground">
      <a
        href="#contenido"
        className="sr-only rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        Saltar al contenido
      </a>
      <HomeHeader onLogin={onLogin} />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <HomeHero />
        <HomeBenefits />
        <HomeSteps />
        <HomeCommunity />
        <HomeFaq />
      </main>
      <HomeClosing onLogin={onLogin} />
    </div>
  );
}
