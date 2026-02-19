import { Mail, Globe, Clock, DollarSign, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RESPONSE_TIME_LABELS } from '../types/marketplace';
import type { OrgFullProfile } from '../types/marketplace';

interface OrgProfileSidebarProps {
  org: OrgFullProfile;
  accentColor: string;
  onContact: () => void;
}

export function OrgProfileSidebar({ org, accentColor, onContact }: OrgProfileSidebarProps) {
  const budgetLabel = org.org_min_budget && org.org_max_budget
    ? `$${org.org_min_budget.toLocaleString()} - $${org.org_max_budget.toLocaleString()} ${org.org_budget_currency}`
    : org.org_min_budget
      ? `Desde $${org.org_min_budget.toLocaleString()} ${org.org_budget_currency}`
      : null;

  const socialLinks = [
    org.org_website && { label: 'Sitio web', url: org.org_website, icon: Globe },
    org.org_linkedin && { label: 'LinkedIn', url: org.org_linkedin, icon: ExternalLink },
    org.org_instagram && { label: 'Instagram', url: `https://instagram.com/${org.org_instagram.replace('@', '')}`, icon: ExternalLink },
    org.org_tiktok && { label: 'TikTok', url: `https://tiktok.com/@${org.org_tiktok.replace('@', '')}`, icon: ExternalLink },
  ].filter(Boolean) as { label: string; url: string; icon: any }[];

  return (
    <div className="sticky top-24 space-y-4">
      {/* Contact card */}
      <div className="rounded-2xl border border-white/5 bg-card p-5 space-y-4">
        <Button
          onClick={onContact}
          className="w-full text-white font-semibold"
          style={{ backgroundColor: accentColor }}
        >
          <Mail className="h-4 w-4 mr-2" />
          Contactar organización
        </Button>

        {/* Budget */}
        {budgetLabel && (
          <div className="flex items-start gap-3 text-sm">
            <DollarSign className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-gray-400">Presupuesto</p>
              <p className="text-white font-medium">{budgetLabel}</p>
            </div>
          </div>
        )}

        {/* Response time */}
        {org.org_response_time && (
          <div className="flex items-start gap-3 text-sm">
            <Clock className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-gray-400">Tiempo de respuesta</p>
              <p className="text-white font-medium">
                {RESPONSE_TIME_LABELS[org.org_response_time] || org.org_response_time}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Social links */}
      {socialLinks.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white">Enlaces</h3>
          {socialLinks.map(link => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <link.icon className="h-4 w-4" />
              <span>{link.label}</span>
            </a>
          ))}
        </div>
      )}

      {/* Specialties */}
      {org.org_specialties.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white">Especialidades</h3>
          <div className="flex flex-wrap gap-2">
            {org.org_specialties.map(spec => (
              <span
                key={spec}
                className="px-2.5 py-1 rounded-full text-xs capitalize bg-white/5 text-foreground/80"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
