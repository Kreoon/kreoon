import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Users, MapPin, Mail, Building2, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { PortfolioContactForm } from '@/components/portfolio/PortfolioContactForm';

interface OrgPortfolio {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  portfolio_enabled: boolean;
  portfolio_title: string | null;
  portfolio_description: string | null;
  portfolio_cover: string | null;
  portfolio_color: string | null;
  primary_color: string | null;
}

interface PortfolioCreator {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  joined_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  creator: 'Creador',
  editor: 'Editor',
  strategist: 'Estratega',
};

export default function OrgPortfolioPage() {
  const { slug } = useParams<{ slug: string }>();
  const [org, setOrg] = useState<OrgPortfolio | null>(null);
  const [creators, setCreators] = useState<PortfolioCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      // Fetch org portfolio via the public function
      const { data: orgData, error: orgError } = await (supabase as any)
        .rpc('get_public_org_portfolio', { org_slug: slug });

      if (orgError || !orgData || orgData.length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const orgInfo = orgData[0] as OrgPortfolio;
      setOrg(orgInfo);

      // Fetch creators
      const { data: creatorsData } = await (supabase as any)
        .rpc('get_portfolio_creators', { org_id_param: orgInfo.id });

      if (creatorsData) {
        setCreators(creatorsData as PortfolioCreator[]);
      }

      setLoading(false);
    };

    fetchData();
  }, [slug]);

  // Update document title for SEO
  useEffect(() => {
    if (org) {
      document.title = `${org.portfolio_title || org.name} - Talento | KREOON`;
    }
    return () => { document.title = 'KREOON'; };
  }, [org]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (notFound || !org) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Building2 className="h-16 w-16 mx-auto text-zinc-500" />
          <h1 className="text-xl font-semibold text-zinc-100">Portafolio no encontrado</h1>
          <p className="text-zinc-400">Esta organización no tiene un portafolio público activo.</p>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
            className="border-border text-foreground/80 hover:bg-muted"
          >
            Ir al inicio
          </Button>
        </div>
      </div>
    );
  }

  const accentColor = org.portfolio_color || org.primary_color || '#8B5CF6';

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Cover image or gradient */}
        {org.portfolio_cover ? (
          <div className="h-64 md:h-80">
            <img
              src={org.portfolio_cover}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
          </div>
        ) : (
          <div
            className="h-64 md:h-80"
            style={{
              background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}05, hsl(250,20%,2%))`,
            }}
          />
        )}

        {/* Org info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="max-w-6xl mx-auto flex items-end gap-4">
            {org.logo_url ? (
              <img
                src={org.logo_url}
                alt={org.name}
                className="h-20 w-20 md:h-24 md:w-24 rounded-lg border-4 border-zinc-800 object-cover shadow-xl"
              />
            ) : (
              <div
                className="h-20 w-20 md:h-24 md:w-24 rounded-lg border-4 border-zinc-800 flex items-center justify-center shadow-xl"
                style={{ backgroundColor: `${accentColor}30` }}
              >
                <Building2 className="h-10 w-10" style={{ color: accentColor }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 truncate">
                {org.portfolio_title || org.name}
              </h1>
              {org.portfolio_description && (
                <p className="text-zinc-400 mt-1 line-clamp-2 max-w-2xl">
                  {org.portfolio_description}
                </p>
              )}
            </div>
            <Button
              onClick={() => setShowContact(true)}
              style={{ backgroundColor: accentColor }}
              className="hidden md:flex text-white hover:opacity-90"
            >
              <Mail className="h-4 w-4 mr-2" />
              Contactar
            </Button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-6">
          <div className="flex items-center gap-2 text-zinc-400">
            <Users className="h-4 w-4" />
            <span className="text-sm">{creators.length} profesionales</span>
          </div>
          <div className="flex-1" />
          <Button
            onClick={() => setShowContact(true)}
            size="sm"
            className="md:hidden"
            style={{ backgroundColor: accentColor }}
          >
            <Mail className="h-4 w-4 mr-2" />
            Contactar
          </Button>
        </div>
      </div>

      {/* Creators Grid */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {creators.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400">Aún no hay miembros visibles en este portafolio</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {creators.map((creator) => (
              <CreatorCard
                key={creator.user_id}
                creator={creator}
                accentColor={accentColor}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <img src="/favicon.png" alt="KREOON" className="h-5 w-5 rounded-lg" />
            <span>Powered by KREOON</span>
          </div>
          <a
            href="/"
            className="text-sm text-zinc-500 hover:text-foreground flex items-center gap-1"
          >
            kreoon.com <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Contact Form Dialog */}
      {showContact && org && (
        <PortfolioContactForm
          organizationId={org.id}
          organizationName={org.name}
          accentColor={accentColor}
          open={showContact}
          onClose={() => setShowContact(false)}
        />
      )}
    </div>
  );
}

function CreatorCard({ creator, accentColor }: { creator: PortfolioCreator; accentColor: string }) {
  const initials = creator.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  return (
    <div className="group rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#14141f] p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors duration-150 hover:shadow-lg">
      <div className="flex flex-col items-center text-center">
        <Avatar className="h-20 w-20 mb-3 ring-2 ring-zinc-800 group-hover:ring-zinc-700 transition-all">
          <AvatarImage src={creator.avatar_url || ''} alt={creator.full_name} />
          <AvatarFallback
            className="text-lg font-semibold"
            style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-semibold text-zinc-100 truncate w-full">{creator.full_name}</h3>
        <Badge
          variant="secondary"
          className="mt-1 text-xs"
          style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
        >
          {ROLE_LABELS[creator.role] || creator.role}
        </Badge>
      </div>
    </div>
  );
}
