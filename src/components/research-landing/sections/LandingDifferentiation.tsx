import { safeArray, safeStr } from '../utils/researchDataHelpers';
import { EmptySection } from '../ResearchSection';

interface Props {
  differentiation?: {
    repeatedMessages?: any[];
    poorlyAddressedPains?: any[];
    ignoredAspirations?: any[];
    positioningOpportunities?: any[];
    unexploitedEmotions?: any[];
  } | null;
}

function DiffList({ title, items, color, primaryKey, secondaryKey }: {
  title: string; items: any[]; color: string; primaryKey: string; secondaryKey: string;
}) {
  if (items.length === 0) return null;
  const borderColor = color === 'red' ? 'border-red-500/10' : color === 'green' ? 'border-green-500/10' : color === 'purple' ? 'border-purple-500/10' : color === 'pink' ? 'border-pink-500/10' : 'border-yellow-500/10';
  const bgColor = color === 'red' ? 'bg-red-500/5' : color === 'green' ? 'bg-green-500/5' : color === 'purple' ? 'bg-purple-500/5' : color === 'pink' ? 'bg-pink-500/5' : 'bg-yellow-500/5';
  const titleColor = color === 'red' ? 'text-red-300/80' : color === 'green' ? 'text-green-300/80' : color === 'purple' ? 'text-purple-300' : color === 'pink' ? 'text-pink-300/80' : 'text-yellow-300/80';

  return (
    <div>
      <h4 className={`text-xs font-semibold ${titleColor} uppercase tracking-wider mb-3`}>{title}</h4>
      <div className="space-y-2">
        {items.map((item: any, i: number) => (
          <div key={i} className={`${bgColor} border ${borderColor} rounded-sm p-3`}>
            <p className="text-sm text-white/80">{safeStr(typeof item === 'string' ? item : item[primaryKey] || item, '')}</p>
            {typeof item === 'object' && item[secondaryKey] && (
              <p className="text-xs text-white/40 mt-1">{item[secondaryKey]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LandingDifferentiation({ differentiation }: Props) {
  if (!differentiation) return <EmptySection label="Diferenciacion" />;

  const repeated = safeArray(differentiation.repeatedMessages);
  const pains = safeArray(differentiation.poorlyAddressedPains);
  const aspirations = safeArray(differentiation.ignoredAspirations);
  const opportunities = safeArray(differentiation.positioningOpportunities);
  const emotions = safeArray(differentiation.unexploitedEmotions);

  const hasData = repeated.length + pains.length + aspirations.length + opportunities.length + emotions.length > 0;
  if (!hasData) return <EmptySection label="Diferenciacion" />;

  return (
    <div className="space-y-5">
      <DiffList title="Oportunidades de Posicionamiento" items={opportunities} color="green" primaryKey="opportunity" secondaryKey="execution" />
      <DiffList title="Dolores Poco Atendidos" items={pains} color="red" primaryKey="pain" secondaryKey="howToUse" />
      <DiffList title="Aspiraciones Ignoradas" items={aspirations} color="purple" primaryKey="aspiration" secondaryKey="opportunity" />
      <DiffList title="Emociones Sin Explotar" items={emotions} color="pink" primaryKey="emotion" secondaryKey="howToUse" />
      <DiffList title="Mensajes Saturados (evitar)" items={repeated} color="yellow" primaryKey="message" secondaryKey="opportunity" />
    </div>
  );
}
