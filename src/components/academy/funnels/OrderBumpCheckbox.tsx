import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';

interface OrderBump {
  id: string;
  bump_course_id: string;
  discount_percent: number;
  headline: string;
  subheadline: string | null;
  image_url: string | null;
  bump_course: {
    id: string;
    title: string;
    price_usd: number;
  };
}

interface Props {
  parentCourseId: string;
  selectedBumps: string[];
  onToggle: (bumpId: string, courseId: string, finalPriceUsd: number) => void;
  accentColor?: string;
}

export function OrderBumpCheckbox({
  parentCourseId,
  selectedBumps,
  onToggle,
  accentColor = '#8B5CF6',
}: Props) {
  const { data: bumps } = useQuery({
    queryKey: ['academy-order-bumps', parentCourseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('academy_order_bumps')
        .select(`
          id, bump_course_id, discount_percent, headline, subheadline, image_url,
          bump_course:academy_courses!academy_order_bumps_bump_course_id_fkey(id, title, price_usd)
        `)
        .eq('parent_course_id', parentCourseId)
        .eq('active', true)
        .order('position', { ascending: true });
      return (data ?? []) as unknown as OrderBump[];
    },
  });

  if (!bumps?.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-400 font-medium">Agregar a la compra</p>
      {bumps.map((b) => {
        const basePrice = Number(b.bump_course.price_usd);
        const finalPrice = basePrice * (1 - b.discount_percent / 100);
        const checked = selectedBumps.includes(b.id);
        return (
          <Card
            key={b.id}
            className={`p-3 cursor-pointer border ${
              checked ? 'border-2' : 'border-dashed border-white/20'
            } bg-white/5 hover:bg-white/10 transition-colors`}
            style={checked ? { borderColor: accentColor } : undefined}
            onClick={() => onToggle(b.id, b.bump_course.id, finalPrice)}
          >
            <div className="flex items-start gap-3">
              <Checkbox checked={checked} className="mt-1" onCheckedChange={() => {}} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100">{b.headline}</p>
                {b.subheadline && (
                  <p className="text-xs text-zinc-400 mt-0.5">{b.subheadline}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-sm font-semibold text-zinc-100">
                    ${finalPrice.toFixed(2)}
                  </span>
                  {b.discount_percent > 0 && (
                    <>
                      <span className="text-xs text-zinc-500 line-through">${basePrice.toFixed(2)}</span>
                      <span
                        className="text-[10px] font-bold rounded px-1.5 py-0.5"
                        style={{ backgroundColor: accentColor + '22', color: accentColor }}
                      >
                        -{b.discount_percent}%
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
