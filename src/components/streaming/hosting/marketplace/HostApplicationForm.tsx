import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, Link2, Plus, X, Loader2, Send } from 'lucide-react';
import { useLiveHostingHosts } from '@/hooks/useLiveHosting';
import type { ApplyAsHostPayload } from '@/types/live-hosting.types';

interface HostApplicationFormProps {
  requestId: string;
  budgetMin?: number;
  budgetMax?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function HostApplicationForm({
  requestId,
  budgetMin,
  budgetMax,
  onSuccess,
  onCancel,
}: HostApplicationFormProps) {
  const { applyAsHost, isApplying } = useLiveHostingHosts(requestId);

  const [proposedRate, setProposedRate] = useState(budgetMin || 100);
  const [commissionPct, setCommissionPct] = useState<number | undefined>();
  const [message, setMessage] = useState('');
  const [experience, setExperience] = useState('');
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState('');

  const addLink = () => {
    if (newLink.trim() && !portfolioLinks.includes(newLink.trim())) {
      setPortfolioLinks([...portfolioLinks, newLink.trim()]);
      setNewLink('');
    }
  };

  const removeLink = (link: string) => {
    setPortfolioLinks(portfolioLinks.filter((l) => l !== link));
  };

  const handleSubmit = async () => {
    const payload: ApplyAsHostPayload = {
      request_id: requestId,
      proposed_rate_usd: proposedRate,
      commission_on_sales_pct: commissionPct,
      application_message: message,
      portfolio_links: portfolioLinks,
      experience_description: experience,
    };

    await applyAsHost(payload);
    onSuccess?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aplicar como Host</CardTitle>
        <CardDescription>
          Envía tu propuesta para ser el host de esta transmisión
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rate */}
        <div className="space-y-2">
          <Label>Tu tarifa propuesta (USD)</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              className="pl-9"
              value={proposedRate}
              onChange={(e) => setProposedRate(Number(e.target.value))}
              min={budgetMin}
              max={budgetMax}
            />
          </div>
          {budgetMin && budgetMax && (
            <p className="text-xs text-muted-foreground">
              Rango sugerido: ${budgetMin} - ${budgetMax}
            </p>
          )}
        </div>

        {/* Commission (optional) */}
        <div className="space-y-2">
          <Label>Comisión sobre ventas (opcional)</Label>
          <div className="relative">
            <Input
              type="number"
              min="0"
              max="50"
              value={commissionPct || ''}
              onChange={(e) =>
                setCommissionPct(e.target.value ? Number(e.target.value) : undefined)
              }
              placeholder="Ej: 5"
            />
            <span className="absolute right-3 top-3 text-muted-foreground">%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Adicional a la tarifa fija, si aplica
          </p>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label>Mensaje de aplicación *</Label>
          <Textarea
            placeholder="Cuéntale al cliente por qué eres el host ideal para esta transmisión..."
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        {/* Experience */}
        <div className="space-y-2">
          <Label>Experiencia relevante</Label>
          <Textarea
            placeholder="Describe tu experiencia en transmisiones en vivo, ventas, o similar..."
            rows={3}
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
          />
        </div>

        {/* Portfolio links */}
        <div className="space-y-2">
          <Label>Enlaces de portafolio</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="https://..."
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
              />
            </div>
            <Button type="button" variant="outline" size="icon" onClick={addLink}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {portfolioLinks.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {portfolioLinks.map((link) => (
                <div
                  key={link}
                  className="flex items-center gap-1 px-2 py-1 rounded-sm bg-muted text-sm"
                >
                  <span className="truncate max-w-[200px]">{link}</span>
                  <button
                    type="button"
                    onClick={() => removeLink(link)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!message.trim() || isApplying}
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Aplicación
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
