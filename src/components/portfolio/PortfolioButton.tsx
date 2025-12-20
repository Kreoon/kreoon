import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { User, Share2, Copy, ExternalLink, Check } from 'lucide-react';

interface PortfolioButtonProps {
  userId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export function PortfolioButton({ 
  userId, 
  variant = 'outline', 
  size = 'sm',
  showLabel = true 
}: PortfolioButtonProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const portfolioUrl = `${window.location.origin}/p/${userId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(portfolioUrl);
    setCopied(true);
    toast({
      title: 'Link copiado',
      description: 'El enlace de tu portafolio ha sido copiado al portapapeles',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPortfolio = () => {
    navigate(`/p/${userId}`);
  };

  const handleOpenInNewTab = () => {
    window.open(portfolioUrl, '_blank');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <User className="h-4 w-4" />
          {showLabel && <span className="hidden sm:inline">Mi Portafolio</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleOpenPortfolio}>
          <User className="h-4 w-4 mr-2" />
          Ver portafolio
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenInNewTab}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Abrir en nueva pestaña
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink}>
          {copied ? (
            <Check className="h-4 w-4 mr-2 text-success" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          Copiar link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
