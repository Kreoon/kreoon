import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';

interface LandingHeaderProps {
  onLogin: () => void;
  onRegister: () => void;
  activeSection: string;
  onSectionClick: (section: string) => void;
}

const NAV_ITEMS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'que-es', label: 'Qué es' },
  { id: 'para-quien', label: 'Para quién' },
  { id: 'como-funciona', label: 'Cómo funciona' },
  { id: 'sistema-up', label: 'Sistema UP' },
  { id: 'social', label: 'Social Creators' },
  { id: 'precios', label: 'Precios' },
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

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled 
          ? "bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-lg" 
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="text-primary-foreground font-bold text-xl">K</span>
            </div>
            <span className="text-foreground font-bold text-xl tracking-tight">KREOON</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  activeSection === item.id
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              onClick={onLogin}
              className="hidden sm:flex text-muted-foreground hover:text-foreground"
            >
              Iniciar sesión
            </Button>
            <Button 
              onClick={onRegister}
              className="bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-lg shadow-primary/25"
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
      {mobileMenuOpen && (
        <div className="lg:hidden bg-background/98 backdrop-blur-xl border-b border-border">
          <nav className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {NAV_ITEMS.map((item) => (
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
      )}
    </header>
  );
}
