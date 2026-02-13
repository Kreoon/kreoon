// ── Audience location types for ADS targeting ───────────────────────

export interface AudienceLocation {
  type: 'country' | 'city' | 'region';
  name: string;
  code: string;
  country_code?: string;
  flag: string;
  population_tier?: 'tier1' | 'tier2' | 'tier3';
  platform_ids: {
    meta?: string;
    google?: string;
    tiktok?: string;
  };
}

export interface LocationPreset {
  id: string;
  name: string;
  description: string;
  locations: string[];
}

// ── LATAM Locations with ADS platform IDs ──────────────────────────

export const LATAM_LOCATIONS: AudienceLocation[] = [
  // PAISES
  { type: 'country', name: 'Colombia', code: 'CO', flag: '🇨🇴', platform_ids: { meta: '2000060', google: '2170', tiktok: 'CO' } },
  { type: 'country', name: 'México', code: 'MX', flag: '🇲🇽', platform_ids: { meta: '2000040', google: '2484', tiktok: 'MX' } },
  { type: 'country', name: 'Ecuador', code: 'EC', flag: '🇪🇨', platform_ids: { meta: '2000039', google: '2218', tiktok: 'EC' } },
  { type: 'country', name: 'Perú', code: 'PE', flag: '🇵🇪', platform_ids: { meta: '2000045', google: '2604', tiktok: 'PE' } },
  { type: 'country', name: 'Chile', code: 'CL', flag: '🇨🇱', platform_ids: { meta: '2000032', google: '2152', tiktok: 'CL' } },
  { type: 'country', name: 'Argentina', code: 'AR', flag: '🇦🇷', platform_ids: { meta: '2000002', google: '2032', tiktok: 'AR' } },
  { type: 'country', name: 'Panamá', code: 'PA', flag: '🇵🇦', platform_ids: { meta: '2000044', google: '2591', tiktok: 'PA' } },
  { type: 'country', name: 'Costa Rica', code: 'CR', flag: '🇨🇷', platform_ids: { meta: '2000036', google: '2188', tiktok: 'CR' } },
  { type: 'country', name: 'Guatemala', code: 'GT', flag: '🇬🇹', platform_ids: { meta: '2000080', google: '2320', tiktok: 'GT' } },
  { type: 'country', name: 'Rep. Dominicana', code: 'DO', flag: '🇩🇴', platform_ids: { meta: '2000106', google: '2214', tiktok: 'DO' } },

  // CIUDADES TIER 1 - Colombia
  { type: 'city', name: 'Bogotá', code: 'BOG', country_code: 'CO', flag: '🇨🇴', population_tier: 'tier1', platform_ids: { meta: '368148', google: '1003659', tiktok: 'BOG' } },
  { type: 'city', name: 'Medellín', code: 'MDE', country_code: 'CO', flag: '🇨🇴', population_tier: 'tier1', platform_ids: { meta: '368159', google: '1003663', tiktok: 'MDE' } },
  { type: 'city', name: 'Cali', code: 'CLO', country_code: 'CO', flag: '🇨🇴', population_tier: 'tier1', platform_ids: { meta: '368151', google: '1003660', tiktok: 'CLO' } },
  { type: 'city', name: 'Barranquilla', code: 'BAQ', country_code: 'CO', flag: '🇨🇴', population_tier: 'tier1', platform_ids: { meta: '368147', google: '1003658', tiktok: 'BAQ' } },

  // CIUDADES TIER 2 - Colombia
  { type: 'city', name: 'Bucaramanga', code: 'BGA', country_code: 'CO', flag: '🇨🇴', population_tier: 'tier2', platform_ids: { meta: '368150', google: '1003661', tiktok: 'BGA' } },
  { type: 'city', name: 'Pereira', code: 'PEI', country_code: 'CO', flag: '🇨🇴', population_tier: 'tier2', platform_ids: { meta: '368163', google: '1003665', tiktok: 'PEI' } },
  { type: 'city', name: 'Cartagena', code: 'CTG', country_code: 'CO', flag: '🇨🇴', population_tier: 'tier2', platform_ids: { meta: '368152', google: '1003662', tiktok: 'CTG' } },

  // CIUDADES - México
  { type: 'city', name: 'Ciudad de México', code: 'CDMX', country_code: 'MX', flag: '🇲🇽', population_tier: 'tier1', platform_ids: { meta: '116545', google: '1010043', tiktok: 'CDMX' } },
  { type: 'city', name: 'Guadalajara', code: 'GDL', country_code: 'MX', flag: '🇲🇽', population_tier: 'tier1', platform_ids: { meta: '116548', google: '1010046', tiktok: 'GDL' } },
  { type: 'city', name: 'Monterrey', code: 'MTY', country_code: 'MX', flag: '🇲🇽', population_tier: 'tier1', platform_ids: { meta: '116553', google: '1010051', tiktok: 'MTY' } },

  // CIUDADES - Ecuador
  { type: 'city', name: 'Quito', code: 'UIO', country_code: 'EC', flag: '🇪🇨', population_tier: 'tier1', platform_ids: { meta: '111356', google: '1005003', tiktok: 'UIO' } },
  { type: 'city', name: 'Guayaquil', code: 'GYE', country_code: 'EC', flag: '🇪🇨', population_tier: 'tier1', platform_ids: { meta: '111353', google: '1005001', tiktok: 'GYE' } },
  { type: 'city', name: 'Cuenca', code: 'CUE', country_code: 'EC', flag: '🇪🇨', population_tier: 'tier2', platform_ids: { meta: '111351', google: '1005002', tiktok: 'CUE' } },

  // CIUDADES - Perú
  { type: 'city', name: 'Lima', code: 'LIM', country_code: 'PE', flag: '🇵🇪', population_tier: 'tier1', platform_ids: { meta: '123456', google: '1006001', tiktok: 'LIM' } },

  // CIUDADES - Chile
  { type: 'city', name: 'Santiago', code: 'SCL', country_code: 'CL', flag: '🇨🇱', population_tier: 'tier1', platform_ids: { meta: '98765', google: '1004001', tiktok: 'SCL' } },

  // USA - Mercado Hispano
  { type: 'city', name: 'Miami', code: 'MIA', country_code: 'US', flag: '🇺🇸', population_tier: 'tier1', platform_ids: { meta: '212345', google: '1012001', tiktok: 'MIA' } },
  { type: 'city', name: 'Los Angeles', code: 'LAX', country_code: 'US', flag: '🇺🇸', population_tier: 'tier1', platform_ids: { meta: '212346', google: '1012002', tiktok: 'LAX' } },
  { type: 'city', name: 'Houston', code: 'HOU', country_code: 'US', flag: '🇺🇸', population_tier: 'tier1', platform_ids: { meta: '212347', google: '1012003', tiktok: 'HOU' } },
];

// ── Presets ──────────────────────────────────────────────────────────

export const LOCATION_PRESETS: LocationPreset[] = [
  {
    id: 'latam_full',
    name: 'LATAM Completo',
    description: 'Todos los países de Latinoamérica',
    locations: ['CO', 'MX', 'EC', 'PE', 'CL', 'AR', 'PA', 'CR', 'GT', 'DO'],
  },
  {
    id: 'colombia_full',
    name: 'Colombia Completo',
    description: 'País + ciudades principales',
    locations: ['CO', 'BOG', 'MDE', 'CLO', 'BAQ', 'BGA', 'PEI', 'CTG'],
  },
  {
    id: 'mexico_full',
    name: 'México Completo',
    description: 'País + ciudades principales',
    locations: ['MX', 'CDMX', 'GDL', 'MTY'],
  },
  {
    id: 'andean',
    name: 'Región Andina',
    description: 'Colombia, Ecuador, Perú',
    locations: ['CO', 'EC', 'PE'],
  },
  {
    id: 'usa_hispanic',
    name: 'USA Hispano',
    description: 'Mercado hispano en Estados Unidos',
    locations: ['MIA', 'LAX', 'HOU'],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────

/** Find location by code */
export function getLocationByCode(code: string): AudienceLocation | undefined {
  return LATAM_LOCATIONS.find(l => l.code === code);
}

/** Get country name for a given country_code */
function getCountryName(countryCode: string): string {
  const country = LATAM_LOCATIONS.find(l => l.type === 'country' && l.code === countryCode);
  return country?.name || countryCode;
}

/** Get grouped locations for display in selector */
export function getGroupedLocations(): Record<string, AudienceLocation[]> {
  const groups: Record<string, AudienceLocation[]> = {};
  for (const loc of LATAM_LOCATIONS) {
    if (loc.type === 'country') {
      if (!groups['Países']) groups['Países'] = [];
      groups['Países'].push(loc);
    } else {
      const countryName = loc.country_code ? getCountryName(loc.country_code) : 'Otros';
      if (!groups[countryName]) groups[countryName] = [];
      groups[countryName].push(loc);
    }
  }
  return groups;
}

/** Convert selected location codes to JSONB format for edge functions */
export function locationsToJsonb(selectedCodes: string[]): AudienceLocation[] {
  return selectedCodes
    .map(code => getLocationByCode(code))
    .filter(Boolean) as AudienceLocation[];
}
