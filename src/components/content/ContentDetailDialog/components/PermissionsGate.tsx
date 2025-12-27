import React from 'react';
import { ContentResource, ContentAction, ContentPermissions } from '../types';
import { Lock } from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

interface PermissionsGateProps {
  permissions: ContentPermissions;
  resource: ContentResource;
  action?: ContentAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLockOnReadOnly?: boolean;
  readOnlyMessage?: string;
}

/**
 * PermissionsGate - Conditionally renders content based on RBAC permissions
 * 
 * - If user has permission: renders children normally
 * - If user lacks 'view' permission: renders fallback or nothing
 * - If user lacks 'edit' permission: renders children in read-only state with lock
 */
export function PermissionsGate({
  permissions,
  resource,
  action = 'view',
  children,
  fallback = null,
  showLockOnReadOnly = true,
  readOnlyMessage = 'No tienes permisos para editar',
}: PermissionsGateProps) {
  const hasPermission = permissions.can(resource, action);

  // Can't view at all - show fallback
  if (action === 'view' && !hasPermission) {
    return <>{fallback}</>;
  }

  // Can view but can't edit - show read-only version
  if (action === 'edit' && !hasPermission) {
    if (showLockOnReadOnly) {
      return (
        <div className="relative">
          <div className="opacity-60 pointer-events-none select-none">
            {children}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="absolute top-2 right-2 p-1.5 rounded-full bg-muted text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{readOnlyMessage}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    }
    return <>{children}</>;
  }

  return <>{children}</>;
}

/**
 * ReadOnlyWrapper - Makes content non-interactive if user can't edit
 */
interface ReadOnlyWrapperProps {
  permissions: ContentPermissions;
  resource: ContentResource;
  children: React.ReactNode;
}

export function ReadOnlyWrapper({
  permissions,
  resource,
  children,
}: ReadOnlyWrapperProps) {
  const isReadOnly = permissions.isReadOnly(resource);

  if (isReadOnly) {
    return (
      <div className="pointer-events-none opacity-60">
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * EditableField - Switches between edit/view mode based on permissions
 * 
 * NOTE: The readOnly prop is an additional override that forces view mode
 * regardless of permissions. This is used when blockConfig determines the
 * tab/block should be read-only for the current user.
 */
interface EditableFieldProps {
  permissions: ContentPermissions;
  resource: ContentResource;
  editMode: boolean;
  editComponent: React.ReactNode;
  viewComponent: React.ReactNode;
  /** When true, forces view mode regardless of permissions */
  readOnly?: boolean;
}

export function EditableField({
  permissions,
  resource,
  editMode,
  editComponent,
  viewComponent,
  readOnly = false,
}: EditableFieldProps) {
  const canEdit = permissions.can(resource, 'edit') && !readOnly;
  
  if (editMode && canEdit) {
    return <>{editComponent}</>;
  }
  
  return <>{viewComponent}</>;
}
