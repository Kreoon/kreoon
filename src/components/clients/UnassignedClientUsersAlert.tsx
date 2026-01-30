import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { AlertTriangle, Building2, UserPlus, X, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UnassignedUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface Client {
  id: string;
  name: string;
}

interface UnassignedClientUsersAlertProps {
  unassignedUsers: UnassignedUser[];
  clients: Client[];
  onRefresh: () => void;
}

export function UnassignedClientUsersAlert({ 
  unassignedUsers, 
  clients,
  onRefresh 
}: UnassignedClientUsersAlertProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UnassignedUser | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("viewer");
  const [assigning, setAssigning] = useState(false);

  if (unassignedUsers.length === 0) return null;

  const handleAssign = async () => {
    if (!selectedUser || !selectedClientId) {
      toast.error("Selecciona un usuario y una empresa");
      return;
    }

    setAssigning(true);
    try {
      const { error } = await supabase
        .from('client_users')
        .insert({
          client_id: selectedClientId,
          user_id: selectedUser.id,
          role: selectedRole
        });

      if (error) throw error;

      toast.success(`${selectedUser.full_name} vinculado exitosamente`);
      setSelectedUser(null);
      setSelectedClientId("");
      setSelectedRole("viewer");
      onRefresh();
      
      // Close dialog if no more unassigned users
      if (unassignedUsers.length === 1) {
        setDialogOpen(false);
      }
    } catch (error: any) {
      console.error('Error assigning user:', error);
      if (error.code === '23505') {
        toast.error("Este usuario ya está vinculado a esta empresa");
      } else {
        toast.error("Error al vincular usuario");
      }
    } finally {
      setAssigning(false);
    }
  };

  const handleSelectUser = (user: UnassignedUser) => {
    setSelectedUser(user);
    setSelectedClientId("");
    setSelectedRole("viewer");
  };

  return (
    <>
      <Alert className="border-amber-500/50 bg-amber-500/10">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-600">Usuarios sin empresa asignada</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            Hay <strong>{unassignedUsers.length}</strong> usuario(s) con rol cliente que no tienen empresa asignada.
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-4 gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/20"
            onClick={() => setDialogOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            Asignar
          </Button>
        </AlertDescription>
      </Alert>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-amber-500" />
              Asignar usuarios a empresas
            </DialogTitle>
            <DialogDescription>
              Selecciona un usuario y asígnalo a una empresa
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* User List */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Usuarios sin asignar ({unassignedUsers.length})
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {unassignedUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedUser?.id === user.id 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-amber-500/20 text-amber-600">
                        {user.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.full_name || 'Sin nombre'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    {selectedUser?.id === user.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Assignment Form */}
            {selectedUser && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedUser.avatar_url || undefined} />
                    <AvatarFallback>{selectedUser.full_name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedUser.full_name}</p>
                    <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Empresa</label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar empresa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {client.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Rol</label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Propietario</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="viewer">Visor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  className="w-full gap-2" 
                  onClick={handleAssign}
                  disabled={!selectedClientId || assigning}
                >
                  {assigning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Asignar a empresa
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
