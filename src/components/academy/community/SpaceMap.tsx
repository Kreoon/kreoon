import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Globe, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useMemberLocations } from '@/hooks/academy/useMemberLocations';

interface SpaceMapProps {
  spaceId: string;
  accentColor?: string;
}

// Coordenadas aproximadas para fallback cuando solo tenemos country/city sin lat/lng
const CITY_FALLBACK: Record<string, [number, number]> = {
  'Bogotá': [4.7110, -74.0721],
  'Medellín': [6.2442, -75.5812],
  'Cali': [3.4516, -76.5320],
  'Mexico City': [19.4326, -99.1332],
  'Buenos Aires': [-34.6037, -58.3816],
  'Lima': [-12.0464, -77.0428],
  'Santiago': [-33.4489, -70.6693],
  'Madrid': [40.4168, -3.7038],
  'Barcelona': [41.3851, 2.1734],
  'Miami': [25.7617, -80.1918],
};

export function SpaceMap({ spaceId, accentColor = '#8B5CF6' }: SpaceMapProps) {
  const { data: locations = [], isLoading } = useMemberLocations(spaceId);

  // Filtra ubicaciones con coordenadas válidas (o estima por ciudad conocida)
  const pins = useMemo(() => {
    return locations
      .map((l) => {
        let lat = l.lat as number | null;
        let lng = l.lng as number | null;
        if ((lat == null || lng == null) && l.city && CITY_FALLBACK[l.city]) {
          [lat, lng] = CITY_FALLBACK[l.city];
        }
        if (lat == null || lng == null) return null;
        return { ...l, lat, lng };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);
  }, [locations]);

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
          <Globe className="h-4 w-4" /> {locations.length} miembros · {pins.length} ubicaciones
        </div>
        <div className="relative w-full rounded-lg overflow-hidden" style={{ height: 420 }}>
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-500 bg-black/30">
              Cargando ubicaciones...
            </div>
          ) : pins.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 gap-2 bg-black/30">
              <MapPin className="h-8 w-8" />
              <span className="text-sm">Aún no hay miembros con ubicación pública</span>
            </div>
          ) : (
            <MapContainer
              center={[10, -50]}
              zoom={2}
              style={{ height: '100%', width: '100%', background: '#0c0c16' }}
              scrollWheelZoom
            >
              {/* Dark tile layer (Carto) */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {pins.map((p) => (
                <CircleMarker
                  key={p.id}
                  center={[p.lat, p.lng]}
                  radius={6}
                  pathOptions={{
                    fillColor: accentColor,
                    color: accentColor,
                    fillOpacity: 0.7,
                    weight: 2,
                  }}
                >
                  <Tooltip>
                    {p.user?.full_name ?? 'Miembro'} — {p.city ?? p.country ?? 'Ubicación oculta'}
                  </Tooltip>
                  <Popup>
                    <div className="text-sm">
                      <div className="font-semibold">{p.user?.full_name ?? 'Miembro'}</div>
                      <div className="text-xs text-zinc-600 mt-0.5">
                        {p.city ? `${p.city}, ` : ''}{p.country ?? ''}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
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
