import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Coins, Gift, Search, Loader2, User, Plus, Minus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UserProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  reveal_tokens: number;
  ai_token_cost: number | null;
}

export function TokenGiftingPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [tokenAmount, setTokenAmount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [gifting, setGifting] = useState(false);

  // Search users
  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, email, avatar_url, reveal_tokens, ai_token_cost')
        .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Error al buscar usuarios');
    } finally {
      setSearching(false);
    }
  };

  // Gift tokens to user
  const giftTokens = async () => {
    if (!selectedUser || tokenAmount === 0) return;

    setGifting(true);
    try {
      const newBalance = Math.max(0, selectedUser.reveal_tokens + tokenAmount);
      
      const { error } = await supabase
        .from('profiles')
        .update({ reveal_tokens: newBalance })
        .eq('id', selectedUser.id);

      if (error) throw error;

      const action = tokenAmount > 0 ? 'regalados' : 'quitados';
      toast.success(`${Math.abs(tokenAmount)} tokens ${action}`, {
        description: `${selectedUser.full_name || selectedUser.username} ahora tiene ${newBalance} tokens`
      });

      // Update local state
      setSelectedUser({ ...selectedUser, reveal_tokens: newBalance });
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, reveal_tokens: newBalance } : u));
      setTokenAmount(10);
    } catch (error) {
      console.error('Error gifting tokens:', error);
      toast.error('Error al regalar tokens');
    } finally {
      setGifting(false);
    }
  };

  // Handle search on enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchUsers();
    }
  };

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-amber-500" />
          Regalar Tokens
        </CardTitle>
        <CardDescription>
          Asigna o quita tokens de revelación a cualquier usuario de la plataforma
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Section */}
        <div className="space-y-2">
          <Label>Buscar usuario</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nombre, username o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
              />
            </div>
            <Button onClick={searchUsers} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
            </Button>
          </div>
        </div>

        {/* Search Results */}
        {users.length > 0 && (
          <div className="space-y-2">
            <Label>Resultados</Label>
            <ScrollArea className="h-[200px] rounded-md border p-2">
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedUser?.id === user.id 
                        ? 'bg-amber-500/20 border border-amber-500/50' 
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {user.full_name || 'Sin nombre'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        @{user.username || 'sin-username'} • {user.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                        <Coins className="h-3 w-3 mr-1" />
                        {user.reveal_tokens || 0}
                      </Badge>
                      {user.ai_token_cost && (
                        <Badge variant="secondary" className="text-xs">
                          Costo: {user.ai_token_cost}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Selected User & Token Amount */}
        {selectedUser && (
          <div className="space-y-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 ring-2 ring-amber-500/50">
                  <AvatarImage src={selectedUser.avatar_url || ''} />
                  <AvatarFallback>
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedUser.full_name || 'Sin nombre'}</p>
                  <p className="text-sm text-muted-foreground">
                    Tokens actuales: <span className="text-amber-500 font-bold">{selectedUser.reveal_tokens || 0}</span>
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                Cambiar
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Cantidad de tokens</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTokenAmount(Math.max(-100, tokenAmount - 10))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(parseInt(e.target.value) || 0)}
                  className="w-24 text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTokenAmount(tokenAmount + 10)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {tokenAmount > 0 
                  ? `Se agregarán ${tokenAmount} tokens (nuevo balance: ${(selectedUser.reveal_tokens || 0) + tokenAmount})`
                  : tokenAmount < 0 
                    ? `Se quitarán ${Math.abs(tokenAmount)} tokens (nuevo balance: ${Math.max(0, (selectedUser.reveal_tokens || 0) + tokenAmount)})`
                    : 'No se modificarán tokens'
                }
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={giftTokens}
                disabled={gifting || tokenAmount === 0}
                className={tokenAmount >= 0 
                  ? "flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  : "flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                }
              >
                {gifting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Gift className="h-4 w-4 mr-2" />
                )}
                {tokenAmount >= 0 ? `Regalar ${tokenAmount} tokens` : `Quitar ${Math.abs(tokenAmount)} tokens`}
              </Button>
            </div>

            {/* Quick amounts */}
            <div className="flex flex-wrap gap-2">
              <Label className="w-full text-xs text-muted-foreground">Cantidades rápidas:</Label>
              {[5, 10, 25, 50, 100].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setTokenAmount(amount)}
                  className={tokenAmount === amount ? 'border-amber-500' : ''}
                >
                  +{amount}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
