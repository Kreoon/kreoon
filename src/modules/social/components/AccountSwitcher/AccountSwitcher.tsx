import { useState, useMemo } from 'react';
import { ChevronDown, Users, Building2, Building, User, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSocialAccounts } from '../../hooks/useSocialAccounts';
import { useAccountGroups } from '../../hooks/useAccountGroups';
import { PlatformIcon } from '../common/PlatformIcon';
import type { SocialAccount, AccountGroup } from '../../types/social.types';

export type AccountSelection =
  | { type: 'all' }
  | { type: 'account'; accountId: string }
  | { type: 'group'; groupId: string }
  | { type: 'personal' }
  | { type: 'brand'; brandId: string };

interface AccountSwitcherProps {
  value: AccountSelection;
  onChange: (selection: AccountSelection) => void;
  className?: string;
}

export function AccountSwitcher({ value, onChange, className }: AccountSwitcherProps) {
  const [open, setOpen] = useState(false);
  const { accounts, personalAccounts, brandAccounts, clientAccounts, orgAccounts, accountsByClient, isManagerRole, permissionGroup } = useSocialAccounts();
  const { groups } = useAccountGroups();

  const selectedLabel = useMemo(() => {
    switch (value.type) {
      case 'all':
        return { label: 'Todas las cuentas', icon: Users, count: accounts.length };
      case 'personal':
        return { label: 'Mis cuentas', icon: User, count: personalAccounts.length };
      case 'account': {
        const acc = accounts.find(a => a.id === value.accountId);
        return { label: acc?.platform_display_name || acc?.platform_username || 'Cuenta', account: acc };
      }
      case 'group': {
        const grp = groups.find(g => g.id === value.groupId);
        return { label: grp?.name || 'Grupo', icon: FolderOpen, count: grp?.account_count || 0 };
      }
      case 'brand':
        return { label: 'Marca', icon: Building2 };
      default:
        return { label: 'Todas las cuentas', icon: Users, count: accounts.length };
    }
  }, [value, accounts, groups, personalAccounts]);

  const handleSelect = (selection: AccountSelection) => {
    onChange(selection);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn('gap-2 min-w-[200px] justify-between', className)}>
          <div className="flex items-center gap-2 truncate">
            {'account' in selectedLabel && selectedLabel.account ? (
              <PlatformIcon platform={selectedLabel.account.platform} size="xs" />
            ) : selectedLabel.icon ? (
              <selectedLabel.icon className="w-4 h-4 text-muted-foreground" />
            ) : null}
            <span className="truncate">{selectedLabel.label}</span>
            {'count' in selectedLabel && selectedLabel.count !== undefined && (
              <Badge variant="secondary" className="text-[10px] px-1.5">
                {selectedLabel.count}
              </Badge>
            )}
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[280px] max-h-[400px] overflow-y-auto">
        {/* All accounts */}
        <DropdownMenuItem onClick={() => handleSelect({ type: 'all' })}>
          <Users className="w-4 h-4 mr-2 text-muted-foreground" />
          {permissionGroup === 'client' ? 'Todas las cuentas de mi empresa' : 'Todas las cuentas'}
          <Badge variant="secondary" className="ml-auto text-[10px]">{accounts.length}</Badge>
        </DropdownMenuItem>

        {/* Groups — only for managers */}
        {isManagerRole && groups.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Grupos
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {groups.map(group => (
                <DropdownMenuItem key={group.id} onClick={() => handleSelect({ type: 'group', groupId: group.id })}>
                  <div
                    className="w-3 h-3 rounded-full mr-2 shrink-0"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="truncate">{group.name}</span>
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {group.account_count || 0}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}

        {/* Personal accounts — for managers and talent */}
        {permissionGroup !== 'client' && personalAccounts.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Mis Cuentas
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {personalAccounts.map(account => (
                <DropdownMenuItem
                  key={account.id}
                  onClick={() => handleSelect({ type: 'account', accountId: account.id })}
                >
                  <PlatformIcon platform={account.platform} size="xs" className="mr-2" />
                  <span className="truncate">
                    {account.platform_display_name || account.platform_username}
                  </span>
                  {account.platform_page_name && (
                    <span className="text-[10px] text-muted-foreground ml-1 truncate">
                      ({account.platform_page_name})
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}

        {/* Client (empresa) accounts — for managers and client users */}
        {(isManagerRole || permissionGroup === 'client') && Object.keys(accountsByClient).length > 0 && (
          <>
            {Object.values(accountsByClient).map(group => (
              <div key={group.clientId}>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  {group.clientName}
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  {group.accounts.map(account => (
                    <DropdownMenuItem
                      key={account.id}
                      onClick={() => handleSelect({ type: 'account', accountId: account.id })}
                    >
                      <PlatformIcon platform={account.platform} size="xs" className="mr-2" />
                      <span className="truncate">
                        {account.platform_display_name || account.platform_username}
                      </span>
                      <Building className="w-3 h-3 ml-auto text-muted-foreground" />
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </div>
            ))}
          </>
        )}

        {/* Brand accounts — only for managers */}
        {isManagerRole && brandAccounts.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Marca
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {brandAccounts.map(account => (
                <DropdownMenuItem
                  key={account.id}
                  onClick={() => handleSelect({ type: 'account', accountId: account.id })}
                >
                  <PlatformIcon platform={account.platform} size="xs" className="mr-2" />
                  <span className="truncate">
                    {account.platform_display_name || account.platform_username}
                  </span>
                  <Building2 className="w-3 h-3 ml-auto text-muted-foreground" />
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}

        {/* Org accounts — only for managers */}
        {isManagerRole && orgAccounts.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Organización
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {orgAccounts.map(account => (
                <DropdownMenuItem
                  key={account.id}
                  onClick={() => handleSelect({ type: 'account', accountId: account.id })}
                >
                  <PlatformIcon platform={account.platform} size="xs" className="mr-2" />
                  <span className="truncate">
                    {account.platform_display_name || account.platform_username}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
