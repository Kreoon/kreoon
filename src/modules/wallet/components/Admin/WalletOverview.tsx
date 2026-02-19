import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Wallet,
  User,
  Building2,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Lock,
  Unlock,
  MoreVertical,
  History,
  Edit,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '../../types';
import type { WalletType, WalletStatus, Currency } from '../../types';

interface WalletWithOwner {
  id: string;
  wallet_type: WalletType;
  status: WalletStatus;
  currency: Currency;
  available_balance: number;
  pending_balance: number;
  reserved_balance: number;
  total_balance: number;
  created_at: string;
  user_id: string | null;
  organization_id: string | null;
  owner?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  organization?: {
    id: string;
    name: string;
  };
}

interface WalletOverviewProps {
  className?: string;
}

export function WalletOverview({ className }: WalletOverviewProps) {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [freezingWallet, setFreezingWallet] = useState<WalletWithOwner | null>(null);

  const { data: wallets, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'wallets', typeFilter, statusFilter],
    queryFn: async (): Promise<WalletWithOwner[]> => {
      let query = supabase
        .from('unified_wallets')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            email,
            avatar_url
          ),
          organizations:organization_id (
            id,
            name
          )
        `)
        .order('available_balance', { ascending: false })
        .limit(100);

      if (typeFilter !== 'all') {
        query = query.eq('wallet_type', typeFilter);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(w => ({
        ...w,
        total_balance: (w.available_balance || 0) + (w.pending_balance || 0) + (w.reserved_balance || 0),
        owner: w.profiles,
        organization: w.organizations,
      })) as WalletWithOwner[];
    },
    staleTime: 30 * 1000,
  });

  // Filter by search
  const filteredWallets = useMemo(() => {
    if (!wallets) return [];
    if (!searchQuery) return wallets;

    const query = searchQuery.toLowerCase();
    return wallets.filter(w => {
      const ownerName = w.owner?.full_name?.toLowerCase() || '';
      const ownerEmail = w.owner?.email?.toLowerCase() || '';
      const orgName = w.organization?.name?.toLowerCase() || '';
      return (
        w.id.toLowerCase().includes(query) ||
        ownerName.includes(query) ||
        ownerEmail.includes(query) ||
        orgName.includes(query)
      );
    });
  }, [wallets, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    if (!wallets) return { total: 0, active: 0, frozen: 0, totalBalance: 0 };
    return {
      total: wallets.length,
      active: wallets.filter(w => w.status === 'active').length,
      frozen: wallets.filter(w => w.status === 'frozen').length,
      totalBalance: wallets.reduce((sum, w) => sum + w.total_balance, 0),
    };
  }, [wallets]);

  const handleFreezeToggle = async () => {
    if (!freezingWallet) return;

    const newStatus = freezingWallet.status === 'active' ? 'frozen' : 'active';

    const { error } = await supabase
      .from('unified_wallets')
      .update({ status: newStatus })
      .eq('id', freezingWallet.id);

    if (!error) {
      refetch();
    }
    setFreezingWallet(null);
  };

  const getOwnerDisplay = (wallet: WalletWithOwner) => {
    if (wallet.wallet_type === 'platform') {
      return { name: 'Plataforma', email: 'Sistema', avatar: null, isOrg: false };
    }
    if (wallet.organization) {
      return { name: wallet.organization.name, email: 'Organización', avatar: null, isOrg: true };
    }
    if (wallet.owner) {
      return {
        name: wallet.owner.full_name,
        email: wallet.owner.email,
        avatar: wallet.owner.avatar_url,
        isOrg: false,
      };
    }
    return { name: 'Sin propietario', email: '', avatar: null, isOrg: false };
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-[hsl(270,100%,60%,0.2)] to-[hsl(280,100%,60%,0.1)]">
          <Wallet className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Visión General de Wallets</h1>
          <p className="text-muted-foreground">
            Administración de todos los wallets del sistema
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Wallets</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Activos</p>
            <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Congelados</p>
            <p className="text-2xl font-bold text-amber-400">{stats.frozen}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Balance Total</p>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(stats.totalBalance, 'USD')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por usuario, email, org..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="user">Usuario</SelectItem>
              <SelectItem value="creator">Creador</SelectItem>
              <SelectItem value="organization">Organización</SelectItem>
              <SelectItem value="agency_pool">Pool Agencia</SelectItem>
              <SelectItem value="platform">Plataforma</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="frozen">Congelado</SelectItem>
              <SelectItem value="suspended">Suspendido</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : filteredWallets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Wallet className="h-12 w-12 text-[hsl(270,100%,60%,0.2)] mb-4" />
              <p className="text-muted-foreground">No se encontraron wallets</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Propietario</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Disponible</TableHead>
                    <TableHead className="hidden md:table-cell">Pendiente</TableHead>
                    <TableHead className="hidden lg:table-cell">Reservado</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWallets.map((wallet, index) => {
                    const owner = getOwnerDisplay(wallet);

                    return (
                      <motion.tr
                        key={wallet.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="group"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              {owner.avatar ? (
                                <AvatarImage src={owner.avatar} />
                              ) : null}
                              <AvatarFallback>
                                {owner.isOrg ? (
                                  <Building2 className="h-4 w-4" />
                                ) : (
                                  <User className="h-4 w-4" />
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-white truncate max-w-[150px]">
                                {owner.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {owner.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {wallet.wallet_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-emerald-400">
                            {formatCurrency(wallet.available_balance, wallet.currency)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-amber-400">
                            {formatCurrency(wallet.pending_balance, wallet.currency)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-primary">
                            {formatCurrency(wallet.reserved_balance, wallet.currency)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-white">
                            {formatCurrency(wallet.total_balance, wallet.currency)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px]',
                              wallet.status === 'active' && 'border-emerald-500/30 text-emerald-400',
                              wallet.status === 'frozen' && 'border-amber-500/30 text-amber-400',
                              wallet.status === 'suspended' && 'border-red-500/30 text-red-400'
                            )}
                          >
                            {wallet.status === 'frozen' && <Lock className="h-3 w-3 mr-1" />}
                            {wallet.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/admin/wallets/${wallet.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/admin/wallets/${wallet.id}/transactions`)}>
                                <History className="h-4 w-4 mr-2" />
                                Transacciones
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setFreezingWallet(wallet)}
                                className={wallet.status === 'frozen' ? 'text-emerald-400' : 'text-amber-400'}
                              >
                                {wallet.status === 'frozen' ? (
                                  <>
                                    <Unlock className="h-4 w-4 mr-2" />
                                    Descongelar
                                  </>
                                ) : (
                                  <>
                                    <Lock className="h-4 w-4 mr-2" />
                                    Congelar
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Freeze/Unfreeze confirmation */}
      <AlertDialog open={!!freezingWallet} onOpenChange={() => setFreezingWallet(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {freezingWallet?.status === 'frozen' ? 'Descongelar' : 'Congelar'} Wallet
            </AlertDialogTitle>
            <AlertDialogDescription>
              {freezingWallet?.status === 'frozen' ? (
                'El usuario podrá volver a realizar transacciones normalmente.'
              ) : (
                <div className="space-y-2">
                  <p>
                    El usuario no podrá realizar retiros ni transferencias mientras el wallet
                    esté congelado.
                  </p>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-[hsl(270,30%,70%)]">
                      Esta acción debería utilizarse solo en casos de actividad sospechosa o
                      investigaciones en curso.
                    </p>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFreezeToggle}
              className={
                freezingWallet?.status === 'frozen'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }
            >
              {freezingWallet?.status === 'frozen' ? 'Descongelar' : 'Congelar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
