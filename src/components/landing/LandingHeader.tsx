import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Menu, X, ChevronDown, Sparkles } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LandingHeaderProps {
  onLogin: () => void;
  onRegister: () => void;
  activeSection: string;
  onSectionClick: (section: string) => void;
}

const MAIN_NAV = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'que-es', label: 'Qué es' },
  { id: 'para-quien', label: 'Para quién' },
  { id: 'como-funciona', label: 'Cómo funciona' },
];

const MORE_NAV = [
  { id: 'sistema-up', label: 'Sistema UP' },
  { id: 'social', label: 'Social Creators' },
  { id: 'precios', label: 'Precios' },
  { id: 'seguridad', label: 'Seguridad' },
  { id: 'contacto', label: 'Contacto' },
];

export function LandingHeader({ onLogin, onRegister, activeSection, onSectionClick }: LandingHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (id: string) => {
    onSectionClick(id);
    setMobileMenuOpen(false);
  };

  const isMoreActive = MORE_NAV.some(item => item.id === activeSection);

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        isScrolled 
          ? "bg-[hsl(240,15%,4%)]/95 backdrop-blur-2xl border-b border-primary/10 shadow-2xl shadow-primary/5" 
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo with glow */}
          <button 
            onClick={() => handleNavClick('inicio')}
            className="flex items-center gap-3 group"
          >
            <div className="relative h-10 w-10 rounded-sm overflow-hidden bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all">
              <img src="/favicon.png" alt="KREOON" className="h-10 w-10 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
            </div>
            <div className="flex flex-col">
              <span className="text-foreground font-bold text-xl tracking-tight">KREOON</span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-primary/60 font-medium">AI Platform</span>
            </div>
          </button>

          {/* Desktop Navigation - Tech Style */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/5 backdrop-blur-xl rounded-full px-2 py-1.5 border border-white/10">
            {MAIN_NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-full transition-all duration-300",
                  activeSection === item.id
                    ? "text-white bg-primary shadow-lg shadow-primary/30"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                {item.label}
              </button>
            ))}
            
            {/* More Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 flex items-center gap-1",
                    isMoreActive
                      ? "text-white bg-primary shadow-lg shadow-primary/30"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  Más
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-[hsl(240,15%,8%)]/95 backdrop-blur-xl border-primary/20">
                {MORE_NAV.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={cn(
                      "cursor-pointer",
                      activeSection === item.id && "text-primary bg-primary/10"
                    )}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Actions - Neon style */}
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={onLogin}
              className="hidden sm:flex text-white/60 hover:text-white hover:bg-white/5"
            >
              Iniciar sesión
            </Button>
            <Button 
              onClick={onRegister}
              className="relative overflow-hidden bg-gradient-to-r from-primary via-primary to-[hsl(260,100%,60%)] text-white font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all hover:-translate-y-0.5 border border-primary/50"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Comenzar
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
            </Button>
            
            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white/60 hover:text-white hover:bg-white/10"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu - Tech Style */}
      <div className={cn(
        "lg:hidden overflow-hidden transition-all duration-300",
        mobileMenuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="bg-[hsl(240,15%,4%)]/98 backdrop-blur-2xl border-b border-primary/10">
          <nav className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {[...MAIN_NAV, ...MORE_NAV].map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  "w-full text-left px-4 py-3 text-sm font-medium rounded-sm transition-all duration-200",
                  activeSection === item.id
                    ? "text-white bg-primary/20 border border-primary/30"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                {item.label}
              </button>
            ))}
            <div className="pt-4 border-t border-primary/10 mt-4">
              <Button 
                variant="ghost" 
                onClick={() => { onLogin(); setMobileMenuOpen(false); }}
                className="w-full justify-start text-white/60 hover:text-white hover:bg-white/5"
              >
                Iniciar sesión
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
