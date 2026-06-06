import { useMemo } from 'react';
import { MapPin, Globe } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useMemberLocations } from '@/hooks/academy/useMemberLocations';

interface SpaceMapProps {
  spaceId: string;
  accentColor?: string;
}

// Equirectangular projection helpers (lng -> x, lat -> y on a 1000x500 SVG)
function project(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng + 180) / 360) * 1000;
  const y = ((90 - lat) / 180) * 500;
  return { x, y };
}

export function SpaceMap({ spaceId, accentColor = '#8B5CF6' }: SpaceMapProps) {
  const { data: locations = [], isLoading } = useMemberLocations(spaceId);

  const pins = useMemo(
    () =>
      locations
        .filter((l) => l.lat != null && l.lng != null)
        .map((l) => ({
          ...l,
          ...project(l.lat as number, l.lng as number),
        })),
    [locations]
  );

  const byCountry = useMemo(() => {
    const m = new Map<string, number>();
    locations.forEach((l) => {
      const key = l.country ?? 'Otro';
      m.set(key, (m.get(key) ?? 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [locations]);

  return (
    <div className="space-y-6">
      <Card className="p-4 bg-white/5 border-white/10 overflow-hidden">
        <div className="flex items-center gap-2 mb-4 text-sm text-zinc-400">
          <Globe className="h-4 w-4" /> {locations.length} miembros en el mapa
        </div>
        <div className="relative w-full" style={{ aspectRatio: '1000/500' }}>
          <svg
            viewBox="0 0 1000 500"
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
          >
            {/* Outline mundial simplificado (rectángulo + grilla decorativa) */}
            <rect
              x="0"
              y="0"
              width="1000"
              height="500"
              fill="rgba(255,255,255,0.02)"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
            {Array.from({ length: 11 }).map((_, i) => (
              <line
                key={`vlat-${i}`}
                x1={i * 100}
                y1="0"
                x2={i * 100}
                y2="500"
                stroke="rgba(255,255,255,0.04)"
              />
            ))}
            {Array.from({ length: 5 }).map((_, i) => (
              <line
                key={`hlng-${i}`}
                y1={i * 125}
                x1="0"
                y2={i * 125}
                x2="1000"
                stroke="rgba(255,255,255,0.04)"
              />
            ))}

            {/* Pins */}
            {pins.map((p) => (
              <g key={p.id} transform={`translate(${p.x}, ${p.y})`}>
                <circle r="6" fill={accentColor} opacity="0.3" />
                <circle r="3" fill={accentColor} />
              </g>
            ))}
          </svg>

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
              Cargando ubicaciones...
            </div>
          )}
          {!isLoading && locations.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 gap-2">
              <MapPin className="h-8 w-8" />
              <span className="text-sm">Aún no hay miembros con ubicación pública</span>
            </div>
          )}
        </div>
      </Card>

      {byCountry.length > 0 && (
        <Card className="p-4 bg-white/5 border-white/10">
          <h3 className="font-semibold mb-3">Miembros por país</h3>
          <ul className="space-y-1">
            {byCountry.map(([country, count]) => (
              <li key={country} className="flex items-center gap-3 text-sm">
                <span className="flex-1 truncate text-zinc-300">{country}</span>
                <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full"
                    style={{
                      width: `${(count / Math.max(...byCountry.map(([, c]) => c))) * 100}%`,
                      backgroundColor: accentColor,
                    }}
                  />
                </div>
                <span className="text-xs text-zinc-500 w-8 text-right">{count}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
