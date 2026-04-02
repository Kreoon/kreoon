import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  LayoutGrid,
  List,
  Calendar,
  Table2,
  Star,
  Plus,
  Pencil,
  Trash2,
  Check,
  Loader2,
  Zap,
  Eye,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SavedView } from '@/hooks/useBoardUserPreferences';

interface ViewSelectorProps {
  savedViews: SavedView[];
  activeViewId: string | null;
  currentViewType: 'kanban' | 'list' | 'calendar' | 'table';
  onSelectView: (viewId: string | null) => void;
  onSaveCurrentView: (name: string) => void;
  onRenameView: (viewId: string, newName: string) => void;
  onDeleteView: (viewId: string) => void;
  isSyncing?: boolean;
}

const VIEW_TYPE_ICONS = {
  kanban: LayoutGrid,
  list: List,
  calendar: Calendar,
  table: Table2,
};

const PRESET_ICONS: Record<string, typeof Zap> = {
  'preset-quick': Zap,
  'preset-detailed': Eye,
  'preset-marketing': BarChart3,
};

export function ViewSelector({
  savedViews,
  activeViewId,
  currentViewType,
  onSelectView,
  onSaveCurrentView,
  onRenameView,
  onDeleteView,
  isSyncing = false,
}: ViewSelectorProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const activeView = savedViews.find(v => v.id === activeViewId);
  const presets = savedViews.filter(v => v.isPreset);
  const customViews = savedViews.filter(v => !v.isPreset);

  const handleSaveView = () => {
    if (newViewName.trim()) {
      onSaveCurrentView(newViewName.trim());
      setNewViewName('');
      setShowSaveDialog(false);
    }
  };

  const handleRenameView = () => {
    if (editingViewId && editingName.trim()) {
      onRenameView(editingViewId, editingName.trim());
      setEditingViewId(null);
      setEditingName('');
      setShowRenameDialog(false);
    }
  };

  const openRenameDialog = (view: SavedView) => {
    setEditingViewId(view.id);
    setEditingName(view.name);
    setShowRenameDialog(true);
  };

  const CurrentIcon = VIEW_TYPE_ICONS[currentViewType];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 min-w-[140px] justify-between bg-white dark:bg-[#14141f] border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-[#1a1a24]"
          >
            <div className="flex items-center gap-2">
              <CurrentIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-zinc-900 dark:text-zinc-100 truncate max-w-[100px]">
                {activeView?.name || 'Vista predeterminada'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isSyncing && <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />}
              <ChevronDown className="h-4 w-4 text-zinc-400" />
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="w-64 bg-white dark:bg-[#1f1f2e] border-zinc-200 dark:border-zinc-700"
        >
          {/* Default view */}
          <DropdownMenuItem
            onClick={() => onSelectView(null)}
            className={cn(
              "gap-2 cursor-pointer",
              !activeViewId && "bg-purple-50 dark:bg-purple-500/10"
            )}
          >
            <LayoutGrid className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span className="text-zinc-900 dark:text-zinc-100">Vista predeterminada</span>
            {!activeViewId && <Check className="h-4 w-4 ml-auto text-purple-600 dark:text-purple-400" />}
          </DropdownMenuItem>

          {/* Presets */}
          {presets.length > 0 && (
            <>
              <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-700" />
              <DropdownMenuLabel className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                <Star className="h-3 w-3 inline mr-1" />
                Presets
              </DropdownMenuLabel>
              {presets.map(view => {
                const PresetIcon = PRESET_ICONS[view.id] || VIEW_TYPE_ICONS[view.type];
                const isActive = activeViewId === view.id;
                return (
                  <DropdownMenuItem
                    key={view.id}
                    onClick={() => onSelectView(view.id)}
                    className={cn(
                      "gap-2 cursor-pointer",
                      isActive && "bg-purple-50 dark:bg-purple-500/10"
                    )}
                  >
                    <PresetIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="flex-1 text-zinc-900 dark:text-zinc-100">{view.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400">
                      {view.type}
                    </Badge>
                    {isActive && <Check className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                  </DropdownMenuItem>
                );
              })}
            </>
          )}

          {/* Custom Views */}
          {customViews.length > 0 && (
            <>
              <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-700" />
              <DropdownMenuLabel className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                Mis Vistas
              </DropdownMenuLabel>
              {customViews.map(view => {
                const ViewIcon = VIEW_TYPE_ICONS[view.type];
                const isActive = activeViewId === view.id;
                return (
                  <div
                    key={view.id}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer group",
                      isActive && "bg-purple-50 dark:bg-purple-500/10"
                    )}
                    onClick={() => onSelectView(view.id)}
                  >
                    <ViewIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    <span className="flex-1 text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {view.name}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          openRenameDialog(view);
                        }}
                      >
                        <Pencil className="h-3 w-3 text-zinc-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteView(view.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {isActive && <Check className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                  </div>
                );
              })}
            </>
          )}

          {/* Save Current View */}
          <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-700" />
          <DropdownMenuItem
            onClick={() => setShowSaveDialog(true)}
            className="gap-2 cursor-pointer text-purple-600 dark:text-purple-400"
          >
            <Plus className="h-4 w-4" />
            <span>Guardar vista actual</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save View Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#1f1f2e] border-zinc-200 dark:border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-100">Guardar Vista</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Nombre de la vista"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              className="bg-zinc-50 dark:bg-[#1a1a24] border-zinc-200 dark:border-zinc-700"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveView()}
            />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Se guardará la configuración actual: tipo de vista, campos visibles, ordenamiento y filtros.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveView} disabled={!newViewName.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename View Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#1f1f2e] border-zinc-200 dark:border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-100">Renombrar Vista</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nuevo nombre"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              className="bg-zinc-50 dark:bg-[#1a1a24] border-zinc-200 dark:border-zinc-700"
              onKeyDown={(e) => e.key === 'Enter' && handleRenameView()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRenameView} disabled={!editingName.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
