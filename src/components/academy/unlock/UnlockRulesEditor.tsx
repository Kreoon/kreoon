import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getRoleLabel } from '@/lib/roles';
import { useAllBadges } from '@/hooks/academy/useAcademyGamification';
import {
  useUnlockRules,
  useManageUnlockRules,
  type NewUnlockRule,
} from '@/hooks/academy/useAcademyUnlock';
import type { UnlockRule, UnlockRuleType, UnlockTargetType, UnlockLogic } from '@/types/academy';

// Roles de plataforma que tiene sentido exigir para ver contenido
const ROLE_OPTIONS = [
  'client',
  'content_creator',
  'editor',
  'digital_strategist',
  'creative_strategist',
  'community_manager',
  'student',
];

interface RuleMeta {
  label: string;
  /** qué inputs necesita: número (int_value), referencia (ref_id) o rol/badge (text_value). */
  needsInt?: 'level' | 'xp' | 'days' | 'score';
  needsRef?: 'course' | 'module' | 'lesson' | 'quiz';
  needsRole?: boolean;
  needsBadge?: boolean;
}

const RULE_CATALOG: Record<UnlockRuleType, RuleMeta> = {
  min_level: { label: '🏆 Nivel mínimo de gamificación', needsInt: 'level' },
  min_xp: { label: '⭐ Puntos (XP) mínimos', needsInt: 'xp' },
  course_completed: { label: '🎓 Completar otro curso', needsRef: 'course' },
  module_completed: { label: '📦 Completar un módulo', needsRef: 'module' },
  lesson_completed: { label: '📺 Completar una lección', needsRef: 'lesson' },
  quiz_passed: { label: '✅ Aprobar un quiz', needsRef: 'quiz', needsInt: 'score' },
  badge_earned: { label: '🥇 Obtener una insignia', needsBadge: true },
  drip_days: { label: '⏳ Días tras la inscripción (drip)', needsInt: 'days' },
  platform_role: { label: '🛡️ Tener cierto rol de plataforma', needsRole: true },
};

const INT_HINT: Record<NonNullable<RuleMeta['needsInt']>, string> = {
  level: 'Nivel (ej. 3)',
  xp: 'Puntos (ej. 500)',
  days: 'Días (ej. 7)',
  score: 'Puntaje mínimo % (ej. 80)',
};

interface Props {
  spaceId: string;
  targetType: UnlockTargetType;
  targetId: string;
  /** Curso al que pertenece el target (para resolver módulos/lecciones/quizzes). */
  courseId?: string;
  unlockLogic: UnlockLogic;
  onLogicChange: (logic: UnlockLogic) => void;
  accentColor?: string;
}

const selectCls =
  'w-full rounded-md bg-black/30 border border-white/10 p-2 text-sm text-zinc-100 focus:outline-none focus:border-purple-500/50';

export function UnlockRulesEditor({
  spaceId,
  targetType,
  targetId,
  courseId,
  unlockLogic,
  onLogicChange,
  accentColor = '#7c3aed',
}: Props) {
  const { data: rules = [] } = useUnlockRules(targetType, targetId);
  const { addRule, removeRule } = useManageUnlockRules();
  const { data: badges = [] } = useAllBadges();

  // Opciones de referencia (cursos del space, módulos/lecciones/quizzes del curso)
  const { data: courses = [] } = useQuery({
    queryKey: ['academy', 'space-courses-lite', spaceId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('academy_courses')
        .select('id, title')
        .eq('space_id', spaceId)
        .order('sort_order', { ascending: true });
      return (data ?? []) as { id: string; title: string }[];
    },
    enabled: !!spaceId,
    staleTime: 60_000,
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['academy', 'course-modules-lite', courseId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('academy_modules')
        .select('id, title')
        .eq('course_id', courseId!)
        .order('sort_order', { ascending: true });
      return (data ?? []) as { id: string; title: string }[];
    },
    enabled: !!courseId,
    staleTime: 60_000,
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['academy', 'course-lessons-lite', courseId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('academy_lessons')
        .select('id, title')
        .eq('course_id', courseId!)
        .order('sort_order', { ascending: true });
      return (data ?? []) as { id: string; title: string }[];
    },
    enabled: !!courseId,
    staleTime: 60_000,
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['academy', 'course-quizzes-lite', courseId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('academy_quizzes')
        .select('id, title')
        .eq('course_id', courseId!)
        .order('created_at', { ascending: true });
      return (data ?? []) as { id: string; title: string }[];
    },
    enabled: !!courseId,
    staleTime: 60_000,
  });

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4" style={{ color: accentColor }} />
        <span className="text-sm font-semibold text-zinc-100">Condiciones de desbloqueo</span>
      </div>

      {/* Lógica Y / O (solo relevante con 2+ condiciones) */}
      {rules.length > 1 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-400">El alumno debe cumplir</span>
          <div className="inline-flex rounded-lg border border-white/10 overflow-hidden">
            <button
              type="button"
              onClick={() => onLogicChange('all')}
              className={cn('px-3 py-1 font-bold', unlockLogic === 'all' ? 'text-white' : 'text-zinc-400')}
              style={unlockLogic === 'all' ? { backgroundColor: accentColor } : undefined}
            >
              TODAS (Y)
            </button>
            <button
              type="button"
              onClick={() => onLogicChange('any')}
              className={cn('px-3 py-1 font-bold', unlockLogic === 'any' ? 'text-white' : 'text-zinc-400')}
              style={unlockLogic === 'any' ? { backgroundColor: accentColor } : undefined}
            >
              AL MENOS UNA (O)
            </button>
          </div>
        </div>
      )}

      {/* Lista de condiciones actuales */}
      {rules.length === 0 ? (
        <p className="text-[11px] text-zinc-500">
          Sin condiciones: disponible para todos los inscritos. Agrega una abajo para restringir el acceso.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rules.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-zinc-200"
            >
              <span className="flex-1 min-w-0">{describeRule(r, { courses, modules, lessons, quizzes, badges })}</span>
              <button
                type="button"
                onClick={() => removeRule.mutate({ id: r.id, target_type: r.target_type, target_id: r.target_id })}
                className="text-zinc-500 hover:text-red-400 transition-colors"
                title="Quitar condición"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Form para agregar */}
      <AddRuleForm
        accentColor={accentColor}
        disabled={addRule.isPending}
        onAdd={(partial) =>
          addRule.mutate({ space_id: spaceId, target_type: targetType, target_id: targetId, ...partial })
        }
        options={{ courses, modules, lessons, quizzes, badges }}
      />
    </div>
  );
}

// ── Form de nueva condición ─────────────────────────────────────────────────
interface RefOptions {
  courses: { id: string; title: string }[];
  modules: { id: string; title: string }[];
  lessons: { id: string; title: string }[];
  quizzes: { id: string; title: string }[];
  badges: { id: string; name: string; emoji?: string }[];
}

function AddRuleForm({
  onAdd,
  options,
  disabled,
  accentColor,
}: {
  onAdd: (partial: Omit<NewUnlockRule, 'space_id' | 'target_type' | 'target_id'>) => void;
  options: RefOptions;
  disabled?: boolean;
  accentColor: string;
}) {
  const [type, setType] = useState<UnlockRuleType | ''>('');
  const [intValue, setIntValue] = useState('');
  const [refId, setRefId] = useState('');
  const [textValue, setTextValue] = useState('');

  const meta = type ? RULE_CATALOG[type] : null;

  const refList = useMemo(() => {
    if (!meta?.needsRef) return [];
    if (meta.needsRef === 'course') return options.courses.map((c) => ({ id: c.id, label: c.title }));
    if (meta.needsRef === 'module') return options.modules.map((m) => ({ id: m.id, label: m.title }));
    if (meta.needsRef === 'lesson') return options.lessons.map((l) => ({ id: l.id, label: l.title }));
    if (meta.needsRef === 'quiz') return options.quizzes.map((q) => ({ id: q.id, label: q.title }));
    return [];
  }, [meta, options]);

  function reset() {
    setType('');
    setIntValue('');
    setRefId('');
    setTextValue('');
  }

  function canAdd(): boolean {
    if (!meta) return false;
    if (meta.needsInt && !intValue) return false;
    if (meta.needsRef && !refId) return false;
    if (meta.needsRole && !textValue) return false;
    if (meta.needsBadge && !textValue) return false;
    return true;
  }

  function handleAdd() {
    if (!type || !meta || !canAdd()) return;
    onAdd({
      rule_type: type,
      int_value: meta.needsInt ? Number(intValue) : null,
      ref_id: meta.needsRef ? refId : null,
      text_value: meta.needsRole || meta.needsBadge ? textValue : null,
    });
    reset();
  }

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-white/15 p-3">
      <Label className="text-[11px] text-zinc-400">Agregar condición</Label>
      <select value={type} onChange={(e) => setType(e.target.value as UnlockRuleType)} className={selectCls}>
        <option value="">Elige un tipo de condición…</option>
        {(Object.keys(RULE_CATALOG) as UnlockRuleType[]).map((rt) => (
          <option key={rt} value={rt}>
            {RULE_CATALOG[rt].label}
          </option>
        ))}
      </select>

      {meta?.needsInt && (
        <input
          type="number"
          min={0}
          value={intValue}
          onChange={(e) => setIntValue(e.target.value)}
          placeholder={INT_HINT[meta.needsInt]}
          className={selectCls}
        />
      )}

      {meta?.needsRef && (
        <select value={refId} onChange={(e) => setRefId(e.target.value)} className={selectCls}>
          <option value="">
            {refList.length ? `Elige ${meta.needsRef}…` : `No hay ${meta.needsRef}s disponibles`}
          </option>
          {refList.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      {meta?.needsRole && (
        <select value={textValue} onChange={(e) => setTextValue(e.target.value)} className={selectCls}>
          <option value="">Elige un rol…</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {getRoleLabel(r)}
            </option>
          ))}
        </select>
      )}

      {meta?.needsBadge && (
        <select value={textValue} onChange={(e) => setTextValue(e.target.value)} className={selectCls}>
          <option value="">{options.badges.length ? 'Elige una insignia…' : 'No hay insignias'}</option>
          {options.badges.map((b) => (
            <option key={b.id} value={b.id}>
              {b.emoji ? `${b.emoji} ` : ''}
              {b.name}
            </option>
          ))}
        </select>
      )}

      <Button
        type="button"
        size="sm"
        disabled={!canAdd() || disabled}
        onClick={handleAdd}
        className="w-full text-white font-bold"
        style={{ background: `linear-gradient(135deg, ${accentColor}, #a855f7)` }}
      >
        <Plus className="h-4 w-4 mr-1.5" /> Agregar condición
      </Button>
    </div>
  );
}

// ── Texto legible de una regla guardada ─────────────────────────────────────
function describeRule(r: UnlockRule, opts: RefOptions): string {
  switch (r.rule_type) {
    case 'min_level':
      return `🏆 Nivel ${r.int_value} o superior`;
    case 'min_xp':
      return `⭐ ${r.int_value} puntos o más`;
    case 'course_completed':
      return `🎓 Completar: ${opts.courses.find((c) => c.id === r.ref_id)?.title ?? 'curso'}`;
    case 'module_completed':
      return `📦 Completar módulo: ${opts.modules.find((m) => m.id === r.ref_id)?.title ?? 'módulo'}`;
    case 'lesson_completed':
      return `📺 Completar lección: ${opts.lessons.find((l) => l.id === r.ref_id)?.title ?? 'lección'}`;
    case 'quiz_passed':
      return `✅ Aprobar (${r.int_value}%): ${opts.quizzes.find((q) => q.id === r.ref_id)?.title ?? 'quiz'}`;
    case 'badge_earned':
      return `🥇 Insignia: ${opts.badges.find((b) => b.id === r.text_value)?.name ?? r.text_value}`;
    case 'drip_days':
      return `⏳ Disponible ${r.int_value} días tras inscribirse`;
    case 'platform_role':
      return `🛡️ Rol: ${getRoleLabel(r.text_value ?? '')}`;
    default:
      return 'Condición';
  }
}
