import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Menu, X, ChevronDown } from 'lucide-react';
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
          ? "bg-background/90 backdrop-blur-xl border-b border-border/30 shadow-2xl shadow-black/10" 
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <button 
            onClick={() => handleNavClick('inicio')}
            className="flex items-center gap-3 group"
          >
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
              <span className="text-primary-foreground font-bold text-xl">K</span>
            </div>
            <span className="text-foreground font-bold text-xl tracking-tight">KREOON</span>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {MAIN_NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  activeSection === item.id
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
                    "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-1",
                    isMoreActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  Más
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
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

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={onLogin}
              className="hidden sm:flex text-muted-foreground hover:text-foreground"
            >
              Iniciar sesión
            </Button>
            <Button 
              onClick={onRegister}
              className="bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
            >
              Crear cuenta
            </Button>
            
            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={cn(
        "lg:hidden overflow-hidden transition-all duration-300",
        mobileMenuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="bg-background/98 backdrop-blur-xl border-b border-border">
          <nav className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {[...MAIN_NAV, ...MORE_NAV].map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  "w-full text-left px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                  activeSection === item.id
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {item.label}
              </button>
            ))}
            <div className="pt-4 border-t border-border mt-4">
              <Button 
                variant="ghost" 
                onClick={() => { onLogin(); setMobileMenuOpen(false); }}
                className="w-full justify-start text-muted-foreground"
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
