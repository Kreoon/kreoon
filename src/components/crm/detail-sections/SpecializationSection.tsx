import { DetailSection } from '@/components/crm/DetailSection';

interface SpecializationSectionProps {
  categories: string[] | null;
  contentTypes: string[] | null;
  experienceLevel: string | null;
  specialtiesTags: string[] | null;
  industries: string[] | null;
  languages: string[] | null;
  styleKeywords: string[] | null;
  bestAt: string | null;
  interests: string[] | null;
}

const PILL_COLORS: Record<string, string> = {
  categories: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  contentTypes: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  specialtiesTags: 'bg-green-500/20 text-green-300 border-green-500/30',
  industries: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  languages: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  styleKeywords: 'bg-white/10 text-white/60 border-white/20',
  interests: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
};

function PillGroup({ items, colorKey, label }: { items: string[]; colorKey: string; label: string }) {
  if (!items || items.length === 0) return null;
  const color = PILL_COLORS[colorKey] || PILL_COLORS.styleKeywords;

  return (
    <div className="space-y-1">
      <span className="text-[10px] text-white/30 uppercase tracking-wider">{label}</span>
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <span
            key={item}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${color}`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SpecializationSection({
  categories,
  contentTypes,
  experienceLevel,
  specialtiesTags,
  industries,
  languages,
  styleKeywords,
  bestAt,
  interests,
}: SpecializationSectionProps) {
  const hasArrayData =
    (categories && categories.length > 0) ||
    (contentTypes && contentTypes.length > 0) ||
    (specialtiesTags && specialtiesTags.length > 0) ||
    (industries && industries.length > 0) ||
    (languages && languages.length > 0) ||
    (styleKeywords && styleKeywords.length > 0) ||
    (interests && interests.length > 0);

  const hasData = hasArrayData || experienceLevel || bestAt;
  if (!hasData) return null;

  return (
    <DetailSection title="Especializacion">
      <div className="space-y-3">
        {/* Text fields */}
        {(experienceLevel || bestAt) && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {experienceLevel && (
              <>
                <span className="text-white/40">Nivel</span>
                <span className="text-white/70">{experienceLevel}</span>
              </>
            )}
            {bestAt && (
              <>
                <span className="text-white/40">Mejor en</span>
                <span className="text-white/70">{bestAt}</span>
              </>
            )}
          </div>
        )}

        {/* Pill groups */}
        {categories && categories.length > 0 && (
          <PillGroup items={categories} colorKey="categories" label="Categorias" />
        )}
        {contentTypes && contentTypes.length > 0 && (
          <PillGroup items={contentTypes} colorKey="contentTypes" label="Tipos de contenido" />
        )}
        {specialtiesTags && specialtiesTags.length > 0 && (
          <PillGroup items={specialtiesTags} colorKey="specialtiesTags" label="Especialidades" />
        )}
        {industries && industries.length > 0 && (
          <PillGroup items={industries} colorKey="industries" label="Industrias" />
        )}
        {languages && languages.length > 0 && (
          <PillGroup items={languages} colorKey="languages" label="Idiomas" />
        )}
        {styleKeywords && styleKeywords.length > 0 && (
          <PillGroup items={styleKeywords} colorKey="styleKeywords" label="Estilo" />
        )}
        {interests && interests.length > 0 && (
          <PillGroup items={interests} colorKey="interests" label="Intereses" />
        )}
      </div>
    </DetailSection>
  );
}
