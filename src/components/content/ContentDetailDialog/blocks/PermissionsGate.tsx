import React from 'react';
import { ContentResource, ContentAction, ContentPermissions } from '../types';
import { Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
 * PermissionsGate - Wraps content and shows it based on permissions
 * 
 * If user has permission: shows children
 * If user lacks permission:
 *   - For 'view' action: shows fallback or nothing
 *   - For 'edit' action: shows children in read-only mode with lock indicator
 */
export function PermissionsGate({
  permissions,
  resource,
  action = 'view',
  children,
  fallback = null,
  showLockOnReadOnly = true,
  readOnlyMessage = 'No tienes permisos para editar este contenido',
}: PermissionsGateProps) {
  const hasPermission = permissions.can(resource, action);

  // If checking view permission and user doesn't have it, show fallback
  if (action === 'view' && !hasPermission) {
    return <>{fallback}</>;
  }

  // If checking edit permission and user doesn't have it, show read-only version
  if (action === 'edit' && !hasPermission) {
    if (showLockOnReadOnly) {
      return (
        <div className="relative">
          <div className="opacity-75 pointer-events-none">
            {children}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="absolute top-2 right-2 p-1.5 rounded-full bg-muted/80 text-muted-foreground">
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
 * ReadOnlyWrapper - Makes content read-only if user lacks edit permission
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
      <div className="pointer-events-none opacity-75">
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * EditableField - Conditionally renders edit or view mode based on permissions
 */
interface EditableFieldProps {
  permissions: ContentPermissions;
  resource: ContentResource;
  editMode: boolean;
  editComponent: React.ReactNode;
  viewComponent: React.ReactNode;
}

export function EditableField({
  permissions,
  resource,
  editMode,
  editComponent,
  viewComponent,
}: EditableFieldProps) {
  const canEdit = permissions.can(resource, 'edit');
  
  if (editMode && canEdit) {
    return <>{editComponent}</>;
  }
  
  return <>{viewComponent}</>;
}

/**
 * ActionButton - Shows action buttons only if user has permission
 */
interface ActionButtonProps {
  permissions: ContentPermissions;
  resource: ContentResource;
  action: ContentAction;
  children: React.ReactNode;
  disabledTooltip?: string;
}

export function ActionButton({
  permissions,
  resource,
  action,
  children,
  disabledTooltip = 'No tienes permisos para esta acción',
}: ActionButtonProps) {
  const hasPermission = permissions.can(resource, action);

  if (!hasPermission) {
    if (disabledTooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-not-allowed opacity-50">
                {React.cloneElement(children as React.ReactElement, { disabled: true })}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{disabledTooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return null;
  }

  return <>{children}</>;
}
