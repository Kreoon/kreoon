import { useState, useRef, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus, Trash2, Pencil, Paperclip, ExternalLink, X, Loader2, Receipt,
  Search, TrendingDown, Layers, Award, Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  useFinancialCosts,
  useCreateFinancialCost,
  useUpdateFinancialCost,
  useDeleteFinancialCost,
  COST_CATEGORY_LABELS,
} from '@/hooks/useFinance';
import type { OrgFinancialCost, CostCategory } from '@/hooks/useFinance';
import { useOrgCostsOverview } from '@/hooks/useFinanceOverview';
import { useFinanceFilters } from '@/contexts/FinanceFiltersContext';
import * as financeService from '@/services/finance/financeService';
import type { ActiveClientPackage } from '@/services/finance/financeService';
import { formatCurrency } from '@/lib/finance-format';
import { TabIntro, HelpTip, HealthBadge } from './FinanceHelp';
import { suggestCategory } from '@/lib/cost-category-rules';
import { Sparkles, Repeat } from 'lucide-react';
import { RecurringExpensesSection } from './RecurringExpensesSection';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CATEGORY_COLORS: Record<CostCategory, string> = {
  operativo:  'bg-blue-500/15 text-blue-400 border-blue-500/30',
  plataforma: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  equipo:     'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  agencia:    'bg-orange-500/15 text-orange-400 border-orange-500/30',
  impuesto:   'bg-red-500/15 text-red-400 border-red-500/30',
  talento:    'bg-green-500/15 text-green-400 border-green-500/30',
  otro:       'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

const CATEGORY_BAR_COLORS: Record<CostCategory, string> = {
  operativo:  'bg-blue-500',
  plataforma: 'bg-purple-500',
  equipo:     'bg-cyan-500',
  agencia:    'bg-orange-500',
  impuesto:   'bg-red-500',
  talento:    'bg-green-500',
  otro:       'bg-gray-500',
};

interface CostFormData {
  name: string;
  amount: string;
  currency: string;
  category: CostCategory;
  client_package_id: string;
  cost_date: string;
  notes: string;
}

const BLANK: CostFormData = {
  name: '',
  amount: '',
  currency: 'COP',
  category: 'operativo',
  client_package_id: '',
  cost_date: new Date().toISOString().split('T')[0],
  notes: '',
};

type LinkageFilter = 'all' | 'linked' | 'general';

interface Props {
  orgId: string;
  packages: ActiveClientPackage[];
}

export function CostsTab({ orgId, packages }: Props) {
  const { startDate, endDate, currency } = useFinanceFilters();

  const [filterCats, setFilterCats] = useState<CostCategory[]>([]);
  const [linkageFilter, setLinkageFilter] = useState<LinkageFilter>('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OrgFinancialCost | null>(null);
  const [form, setForm] = useState<CostFormData>(BLANK);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFileUrl, setPendingFileUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: overview } = useOrgCostsOverview(orgId, startDate, endDate, currency);
  const { data: allCosts = [], isLoading } = useFinancialCosts(orgId, { currency });

  const visibleCosts = useMemo(() => {
    return allCosts
      .filter(c => c.cost_date >= startDate && c.cost_date <= endDate)
      .filter(c => filterCats.length === 0 || filterCats.includes(c.category as CostCategory))
      .filter(c => {
        switch (linkageFilter) {
          case 'linked': return !!c.client_package_id;
          case 'general': return !c.client_package_id;
          default: return true;
        }
      })
      .filter(c => {
        if (!search) return true;
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q)
          || (c.notes ?? '').toLowerCase().includes(q)
          || (c.package_name ?? '').toLowerCase().includes(q);
      });
  }, [allCosts, startDate, endDate, filterCats, linkageFilter, search]);

  const createCost = useCreateFinancialCost();
  const updateCost = useUpdateFinancialCost();
  const deleteCost = useDeleteFinancialCost();

  const totalVisible = visibleCosts.reduce((s, c) => s + c.amount, 0);
  const maxCategoryAmount = useMemo(() => {
    const data = overview?.costs_by_category ?? [];
    return data.length > 0 ? Math.max(...data.map(d => d.total)) : 0;
  }, [overview]);

  const pctSemaphore = (overview?.pct_of_income ?? 0) > 50
    ? 'red'
    : (overview?.pct_of_income ?? 0) > 30
      ? 'yellow'
      : 'green';

  function openNew() {
    setEditing(null);
    setForm({ ...BLANK, currency, cost_date: new Date().toISOString().split('T')[0] });
    setPendingFile(null);
    setPendingFileUrl(null);
    setDialogOpen(true);
  }

  function openEdit(cost: OrgFinancialCost) {
    setEditing(cost);
    setForm({
      name: cost.name,
      amount: String(cost.amount),
      currency: cost.currency,
      category: cost.category as CostCategory,
      client_package_id: cost.client_package_id ?? '',
      cost_date: cost.cost_date,
      notes: cost.notes ?? '',
    });
    setPendingFile(null);
    setPendingFileUrl(cost.receipt_url);
    setDialogOpen(true);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setPendingFileUrl(URL.createObjectURL(file));
  }

  function toggleCategory(cat: CostCategory) {
    setFilterCats(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }

  async function handleSave() {
    if (!form.name.trim() || !form.amount || Number(form.amount) <= 0) {
      toast({ title: 'Faltan datos', description: 'Nombre y monto son requeridos.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      let receiptUrl = editing?.receipt_url ?? null;
      let receiptFilename = editing?.receipt_filename ?? null;

      if (pendingFile) {
        const res = await financeService.uploadFinancialReceipt(orgId, pendingFile);
        receiptUrl = res.url;
        receiptFilename = res.filename;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        organization_id: orgId,
        name: form.name.trim(),
        amount: Number(form.amount),
        currency: form.currency,
        category: form.category,
        client_package_id: form.client_package_id || null,
        cost_date: form.cost_date,
        notes: form.notes.trim() || null,
        receipt_url: receiptUrl,
        receipt_filename: receiptFilename,
        created_by: user?.id ?? null,
      };

      if (editing) {
        await updateCost.mutateAsync({ id: editing.id, updates: payload });
        toast({ title: 'Costo actualizado' });
      } else {
        await createCost.mutateAsync(payload);
        toast({ title: 'Costo registrado' });
      }

      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await deleteCost.mutateAsync(id);
      toast({ title: 'Costo eliminado' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  }

  const f = (field: keyof CostFormData, val: string) =>
    setForm(prev => ({ ...prev, [field]: val }));

  // Sugerencia automática de categoría según concepto + notas
  const suggested = useMemo(
    () => suggestCategory(form.name, form.notes),
    [form.name, form.notes],
  );

  const [subTab, setSubTab] = useState<'lista' | 'recurrentes'>('lista');

  return (
    <div className="space-y-6">
      {/* ─── Sub-tabs ──────────────────────────────────────────── */}
      <Tabs value={subTab} onValueChange={v => setSubTab(v as 'lista' | 'recurrentes')}>
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="lista" className="gap-1.5">
            🧾 Lista de costos
          </TabsTrigger>
          <TabsTrigger value="recurrentes" className="gap-1.5">
            <Repeat className="w-3.5 h-3.5" />
            Gastos recurrentes
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {subTab === 'recurrentes' && <RecurringExpensesSection orgId={orgId} />}

      {subTab === 'lista' && (<>
      {/* ─── Intro ──────────────────────────────────────────── */}
      <TabIntro
        emoji="🧾"
        title="¿En qué se va el dinero?"
        subtitle="Aquí registras todos los gastos de la agencia: suscripciones, arriendo, equipos, impuestos, lo que sea."
        accent="red"
        bullets={[
          'Cada costo puede ir suelto (gasto general) o vinculado a una campaña específica para saber cuánto te costó.',
          'Adjunta el soporte (PDF o foto del recibo) para tener todo ordenado para impuestos.',
          'El semáforo "% de ingresos" te dice si estás gastando mucho o poco respecto a lo que cobras: verde <30%, amarillo 30-50%, rojo >50%.',
        ]}
      />

      {/* ─── Hero KPIs ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/20 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-red-500/20 rounded">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-white/60 text-xs uppercase tracking-wide">Total costos</span>
            <HelpTip text="Suma de TODOS los gastos registrados en el período seleccionado." />
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(overview?.total_costs ?? 0, currency)}
          </p>
          <p className="text-red-400 text-xs mt-1">gastado en el período</p>
        </Card>

        <Card className={`bg-gradient-to-br p-5 ${
          pctSemaphore === 'red' ? 'from-red-500/20 to-red-600/10 border-red-500/20'
          : pctSemaphore === 'yellow' ? 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/20'
          : 'from-green-500/20 to-green-600/10 border-green-500/20'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded ${
              pctSemaphore === 'red' ? 'bg-red-500/20'
              : pctSemaphore === 'yellow' ? 'bg-yellow-500/20'
              : 'bg-green-500/20'
            }`}>
              <Layers className={`w-5 h-5 ${
                pctSemaphore === 'red' ? 'text-red-400'
                : pctSemaphore === 'yellow' ? 'text-yellow-400'
                : 'text-green-400'
              }`} />
            </div>
            <span className="text-white/60 text-xs uppercase tracking-wide">% de ingresos</span>
            <HelpTip text="Cuánto de cada peso que cobras se va en costos. Lo ideal es estar por debajo de 30%." />
          </div>
          <p className="text-2xl font-bold text-white">{(overview?.pct_of_income ?? 0).toFixed(1)}%</p>
          <div className="flex items-center justify-between mt-1">
            <p className={`text-xs ${
              pctSemaphore === 'red' ? 'text-red-400'
              : pctSemaphore === 'yellow' ? 'text-yellow-400'
              : 'text-green-400'
            }`}>
              de {formatCurrency(overview?.income_in_period ?? 0, currency)}
            </p>
            {(overview?.total_costs ?? 0) > 0 && (
              pctSemaphore === 'red' ? <HealthBadge level="bad" label="Muy alto" />
              : pctSemaphore === 'yellow' ? <HealthBadge level="warn" label="Vigilar" />
              : <HealthBadge level="good" label="Saludable" />
            )}
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/20 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-orange-500/20 rounded">
              <Award className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-white/60 text-xs uppercase tracking-wide">Mayor gasto</span>
            <HelpTip text="La categoría donde más estás gastando en este período." />
          </div>
          <p className="text-lg font-bold text-white leading-tight">
            {overview?.top_category
              ? COST_CATEGORY_LABELS[overview.top_category as CostCategory] ?? overview.top_category
              : '—'}
          </p>
          <p className="text-orange-400 text-xs mt-1">
            {overview?.top_category_amount
              ? formatCurrency(overview.top_category_amount, currency)
              : 'Sin datos aún'}
          </p>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/20 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-purple-500/20 rounded">
              <Link2 className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-white/60 text-xs uppercase tracking-wide">De campañas</span>
            <HelpTip text="Costos vinculados a una campaña específica (sirven para calcular la rentabilidad real de cada paquete)." />
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(overview?.linked_amount ?? 0, currency)}
          </p>
          <p className="text-purple-400 text-xs mt-1">
            vs {formatCurrency(overview?.general_amount ?? 0, currency)} generales
          </p>
        </Card>
      </div>

      {/* ─── Gráfico por categoría ────────────────────────── */}
      {overview && overview.costs_by_category.length > 0 && (
        <Card className="bg-white/5 border-white/10 p-5">
          <h3 className="text-base font-semibold text-white mb-4">Gastos por categoría</h3>
          <div className="space-y-3">
            {overview.costs_by_category.map(cat => {
              const widthPct = maxCategoryAmount > 0 ? (cat.total / maxCategoryAmount) * 100 : 0;
              const catKey = cat.category as CostCategory;
              return (
                <button
                  key={cat.category}
                  onClick={() => toggleCategory(catKey)}
                  className="block w-full text-left group"
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-white text-sm font-medium">
                      {COST_CATEGORY_LABELS[catKey] ?? cat.category}
                      {filterCats.includes(catKey) && (
                        <span className="ml-2 text-[10px] text-primary">✓ filtrado</span>
                      )}
                    </span>
                    <span className="text-white/70 text-sm whitespace-nowrap">
                      {formatCurrency(cat.total, currency)}
                    </span>
                  </div>
                  <div className="relative h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 ${CATEGORY_BAR_COLORS[catKey] ?? 'bg-gray-500'} rounded-full transition-all group-hover:opacity-80`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
          {filterCats.length > 0 && (
            <button
              onClick={() => setFilterCats([])}
              className="mt-3 text-xs text-white/40 hover:text-white"
            >
              Limpiar filtros de categoría
            </button>
          )}
        </Card>
      )}

      {/* ─── Filtros + tabla ─────────────────────────────── */}
      <Card className="bg-white/5 border-white/10">
        <div className="p-5 pb-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-base font-semibold text-white">Lista de costos</h3>
            <p className="text-white/40 text-xs">{visibleCosts.length} costo{visibleCosts.length !== 1 ? 's' : ''} · {formatCurrency(totalVisible, currency)}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={linkageFilter}
              onChange={e => setLinkageFilter(e.target.value as LinkageFilter)}
              className="bg-white/5 border border-white/10 rounded text-xs text-white px-2 py-1 h-7"
            >
              <option value="all" className="bg-[#111]">Todos</option>
              <option value="linked" className="bg-[#111]">Solo campañas</option>
              <option value="general" className="bg-[#111]">Solo generales</option>
            </select>

            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
              <Input
                placeholder="Buscar concepto"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-xs h-7 pl-7 w-44"
              />
            </div>

            <Button size="sm" onClick={openNew} className="gap-1.5 h-7">
              <Plus className="h-3.5 w-3.5" />
              Agregar costo
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : visibleCosts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Receipt className="h-10 w-10 opacity-30" />
            <p className="text-sm">No hay costos registrados para este filtro.</p>
            <Button variant="outline" size="sm" onClick={openNew} className="gap-2 mt-1">
              <Plus className="h-4 w-4" />
              Registrar primer costo
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/60 text-xs">Concepto</TableHead>
                <TableHead className="text-white/60 text-xs">Categoría</TableHead>
                <TableHead className="text-white/60 text-xs">Campaña</TableHead>
                <TableHead className="text-white/60 text-xs">Fecha</TableHead>
                <TableHead className="text-white/60 text-xs text-right">Monto</TableHead>
                <TableHead className="text-white/60 text-xs w-20">Soporte</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleCosts.map(cost => (
                <TableRow key={cost.id} className="border-white/5 hover:bg-white/3">
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm text-white">{cost.name}</p>
                      {cost.notes && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{cost.notes}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${CATEGORY_COLORS[cost.category as CostCategory] ?? CATEGORY_COLORS.otro}`}>
                      {COST_CATEGORY_LABELS[cost.category as CostCategory] ?? cost.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {cost.package_name ? (
                      <span className="text-xs text-muted-foreground">{cost.package_name}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground opacity-40">General</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(parseISO(cost.cost_date), 'd MMM yyyy', { locale: es })}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-white">
                    {formatCurrency(cost.amount, cost.currency)}
                  </TableCell>
                  <TableCell>
                    {cost.receipt_url ? (
                      <a
                        href={cost.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Paperclip className="h-3 w-3" />
                        Ver
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground opacity-40">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(cost)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(cost.id)}
                        disabled={deleting === cost.id}
                      >
                        {deleting === cost.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#0e0e0e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar costo' : 'Registrar costo'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Concepto *</label>
              <Input
                value={form.name}
                onChange={e => f('name', e.target.value)}
                placeholder="Ej. Suscripción CapCut, Arriendo estudio…"
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Monto *</label>
                <Input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={e => f('amount', e.target.value)}
                  placeholder="0"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Moneda</label>
                <select
                  value={form.currency}
                  onChange={e => f('currency', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-sm text-white"
                >
                  <option value="COP" className="bg-[#111]">COP</option>
                  <option value="USD" className="bg-[#111]">USD</option>
                  <option value="EUR" className="bg-[#111]">EUR</option>
                  <option value="MXN" className="bg-[#111]">MXN</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1.5">
                  Categoría
                  {suggested && suggested !== form.category && (
                    <button
                      type="button"
                      onClick={() => f('category', suggested)}
                      className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      Sugerir: {COST_CATEGORY_LABELS[suggested]}
                    </button>
                  )}
                </label>
                <select
                  value={form.category}
                  onChange={e => f('category', e.target.value as CostCategory)}
                  className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-sm text-white"
                >
                  {Object.entries(COST_CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k} className="bg-[#111]">{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Fecha</label>
                <Input
                  type="date"
                  value={form.cost_date}
                  onChange={e => f('cost_date', e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Vincular a campaña (opcional)</label>
              <select
                value={form.client_package_id}
                onChange={e => f('client_package_id', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-sm text-white"
              >
                <option value="" className="bg-[#111]">Sin vinculación</option>
                {packages.map(pkg => (
                  <option key={pkg.id} value={pkg.id} className="bg-[#111]">
                    #{String(pkg.campaign_number).padStart(4, '0')} {pkg.name} — {pkg.client_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notas</label>
              <Textarea
                value={form.notes}
                onChange={e => f('notes', e.target.value)}
                placeholder="Descripción adicional, referencia, proveedor…"
                rows={2}
                className="bg-white/5 border-white/10 resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Soporte (factura / recibo)</label>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={handleFile}
              />
              {pendingFileUrl ? (
                <div className="flex items-center gap-2 p-2 rounded-sm border border-white/10 bg-white/5">
                  <Paperclip className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs text-muted-foreground flex-1 truncate">
                    {pendingFile?.name ?? 'Soporte adjunto'}
                  </span>
                  <a href={pendingFileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-white" />
                  </a>
                  <button
                    type="button"
                    onClick={() => { setPendingFile(null); setPendingFileUrl(null); }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 w-full"
                  onClick={() => fileRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                  Adjuntar soporte
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={uploading} className="gap-2">
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Guardar cambios' : 'Registrar costo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>)}
    </div>
  );
}
