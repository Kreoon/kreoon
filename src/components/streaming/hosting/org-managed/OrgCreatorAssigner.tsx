import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Loader2,
  Search,
  UserPlus,
  Calculator,
  CheckCircle2,
} from 'lucide-react';
import { useOrgLiveManagement, useLiveHostingHosts, useLiveHostingFinancials } from '@/hooks/useLiveHosting';
import type { OrgMarkupBreakdown } from '@/types/live-hosting.types';

interface OrgCreatorAssignerProps {
  requestId: string;
  organizationId: string;
  clientId?: string;
  onSuccess?: () => void;
}

export function OrgCreatorAssigner({
  requestId,
  organizationId,
  clientId,
  onSuccess,
}: OrgCreatorAssignerProps) {
  const { availableHosts, isLoading: hostsLoading } = useOrgLiveManagement(organizationId);
  const { assignInternalHost, isAssigning } = useLiveHostingHosts(requestId);
  const { calculateMarkup, setClientPrice, isSettingPrice } = useLiveHostingFinancials();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHost, setSelectedHost] = useState<typeof availableHosts[0] | null>(null);
  const [hostRate, setHostRate] = useState(150);
  const [markupRate, setMarkupRate] = useState(0.30); // 30% default
  const [breakdown, setBreakdown] = useState<OrgMarkupBreakdown | null>(null);

  const filteredHosts = availableHosts.filter(
    (h) =>
      h.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCalculate = async () => {
    const result = await calculateMarkup(hostRate, markupRate);
    setBreakdown(result);
  };

  const handleAssign = async () => {
    if (!selectedHost || !breakdown) return;

    // Set client price first
    await setClientPrice({
      request_id: requestId,
      client_price_usd: breakdown.client_price_usd,
      org_markup_rate: markupRate,
      org_markup_amount: breakdown.org_markup_amount,
    });

    // Assign host
    await assignInternalHost({
      request_id: requestId,
      user_id: selectedHost.user_id,
      agreed_rate_usd: hostRate,
    });

    onSuccess?.();
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Host selection */}
      <Card>
        <CardHeader>
          <CardTitle>Asignar Creador Interno</CardTitle>
          <CardDescription>
            Selecciona un miembro de tu equipo como host
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar creador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {hostsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredHosts.map((host) => (
                <div
                  key={host.user_id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedHost?.user_id === host.user_id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedHost(host)}
                >
                  <Avatar>
                    <AvatarImage src={host.avatar_url || undefined} />
                    <AvatarFallback>
                      {host.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {host.full_name || 'Sin nombre'}
                    </p>
                    <div className="flex items-center gap-2">
                      {host.slug && (
                        <span className="text-sm text-muted-foreground">
                          @{host.slug}
                        </span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {host.role}
                      </Badge>
                    </div>
                  </div>
                  {selectedHost?.user_id === host.user_id && (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  )}
                </div>
              ))}

              {filteredHosts.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No se encontraron creadores
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing calculation */}
      <Card>
        <CardHeader>
          <CardTitle>Calcular Precio</CardTitle>
          <CardDescription>
            Define el pago al host y tu markup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Pago al host (USD)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                className="pl-9"
                value={hostRate}
                onChange={(e) => {
                  setHostRate(Number(e.target.value));
                  setBreakdown(null);
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Markup de la organización (%)</Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                value={markupRate * 100}
                onChange={(e) => {
                  setMarkupRate(Number(e.target.value) / 100);
                  setBreakdown(null);
                }}
              />
              <span className="absolute right-3 top-3 text-muted-foreground">%</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleCalculate}
            disabled={!hostRate}
          >
            <Calculator className="h-4 w-4 mr-2" />
            Calcular Desglose
          </Button>

          {breakdown && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Pago al host:</span>
                <span className="font-medium">${breakdown.host_rate_usd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tu markup ({(markupRate * 100).toFixed(0)}%):</span>
                <span className="font-medium">${breakdown.org_markup_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Comisión plataforma ({(breakdown.platform_fee_rate * 100).toFixed(0)}%):</span>
                <span className="text-muted-foreground">-${breakdown.platform_fee_usd.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Precio al cliente:</span>
                  <span className="text-primary">${breakdown.client_price_usd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Tu ganancia neta:</span>
                  <span className="font-medium">${breakdown.org_net_profit_usd.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleAssign}
            disabled={!selectedHost || !breakdown || isAssigning || isSettingPrice}
          >
            {isAssigning || isSettingPrice ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Asignando...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Asignar y Configurar Precio
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
