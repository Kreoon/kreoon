import { useState, useEffect, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Search, Plus, Star, User, Sword, Users, Edit3, Trophy, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatorDetailDialog } from "@/components/team/CreatorDetailDialog";
import { TalentCard, TalentProfile } from "@/components/team/TalentCard";
import { TalentRanking } from "@/components/team/TalentRanking";

// Extracted grid component
interface TalentGridProps {
  talents: TalentProfile[];
  loading: boolean;
  onSelect: (talent: TalentProfile) => void;
  onAmbassadorToggle: (talent: TalentProfile, e: MouseEvent) => void;
  isAdmin: boolean;
}

function TalentGrid({ talents, loading, onSelect, onAmbassadorToggle, isAdmin }: TalentGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-56 rounded-sm" />
        ))}
      </div>
    );
  }

  if (talents.length === 0) {
    return (
      <div className="text-center py-8 md:py-12">
        <User className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-sm md:text-base text-muted-foreground">No hay talento en esta categoría</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
      {talents.map((talent) => (
        <TalentCard
          key={talent.id}
          talent={talent}
          onClick={() => onSelect(talent)}
          onAmbassadorToggle={(e) => onAmbassadorToggle(talent, e)}
          isAdmin={isAdmin}
          showKPIs={true}
        />
      ))}
    </div>
  );
}

export function CreatorsContent() {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const { isPlatformRoot, currentOrgId, loading: orgLoading } = useOrgOwner();
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTalent, setSelectedTalent] = useState<TalentProfile | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const fetchTalents = async () => {
    if (orgLoading) return;
    setLoading(true);

    try {
      if (!currentOrgId) {
        setTalents([]);
        return;
      }

      // FASE 4 B2: antes eran ~12 queries secuenciales (roles, ambassador,
      // member data, profiles, content counts x2, active tasks, up totals x2,
      // ratings x3). Unificado en un solo RPC agregado server-side.
      const { data, error } = await (supabase as any).rpc('get_org_talent_roster', {
        p_organization_id: currentOrgId,
      });

      if (error) throw error;

      const talentsData: TalentProfile[] = (data || []).map((row: any) => ({
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        avatar_url: row.avatar_url,
        phone: row.phone,
        bio: row.bio,
        role: row.role,
        content_count: Number(row.content_count) || 0,
        is_ambassador: row.is_ambassador || false,
        quality_score_avg: row.quality_score_avg || 0,
        reliability_score: row.reliability_score || 0,
        velocity_score: row.velocity_score || 0,
        ai_recommended_level: (row.ai_recommended_level as 'junior' | 'pro' | 'elite') || 'junior',
        ai_risk_flag: (row.ai_risk_flag as 'none' | 'warning' | 'high') || 'none',
        ambassador_level: (row.ambassador_level as 'none' | 'bronze' | 'silver' | 'gold') || 'none',
        editor_rating: row.editor_rating,
        editor_completed_count: row.editor_completed_count,
        editor_on_time_count: row.editor_on_time_count,
        active_tasks: Number(row.active_tasks) || 0,
        up_points: Number(row.up_points) || 0,
        up_level: row.up_level || 'bronze',
        avg_creator_rating: row.avg_creator_rating != null ? Number(row.avg_creator_rating) : undefined,
        avg_editor_rating: row.avg_editor_rating != null ? Number(row.avg_editor_rating) : undefined,
        avg_strategy_rating: row.avg_strategy_rating != null ? Number(row.avg_strategy_rating) : undefined,
        avg_star_rating: Number(row.avg_star_rating) || 0,
        rated_content_count: Number(row.rated_content_count) || 0,
      }));

      setTalents(talentsData);
    } catch (error) {
      console.error('Error fetching talents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTalents();
  }, [isPlatformRoot, currentOrgId, orgLoading]);

  const toggleAmbassador = async (talent: TalentProfile, e: MouseEvent) => {
    e.stopPropagation();
    if (!currentOrgId) return;

    const newStatus = !talent.is_ambassador;
    const newLevel = newStatus ? 'bronze' : 'none';

    setTalents(prev => prev.map(t =>
      t.id === talent.id ? { ...t, is_ambassador: newStatus, ambassador_level: newLevel as any } : t
    ));

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          is_ambassador: newStatus,
          ambassador_celebration_pending: newStatus,
        })
        .eq('id', talent.id);

      if (profileError) throw profileError;

      if (newStatus) {
        const { error: badgeError } = await supabase
          .from('organization_member_badges')
          .upsert(
            {
              organization_id: currentOrgId,
              user_id: talent.id,
              badge: 'ambassador',
              level: 'bronze',
              is_active: true,
              granted_at: new Date().toISOString(),
              granted_by: user?.id || null,
            },
            { onConflict: 'organization_id,user_id,badge' }
          );
        if (badgeError) throw badgeError;
      } else {
        const { error: badgeError } = await supabase
          .from('organization_member_badges')
          .update({
            is_active: false,
            revoked_at: new Date().toISOString(),
            revoked_by: user?.id || null,
          })
          .eq('organization_id', currentOrgId)
          .eq('user_id', talent.id)
          .eq('badge', 'ambassador');
        if (badgeError) throw badgeError;
      }

      const { error: memberError } = await supabase
        .from('organization_members')
        .update({ ambassador_level: newLevel })
        .eq('organization_id', currentOrgId)
        .eq('user_id', talent.id);

      if (memberError) throw memberError;

      if (newStatus) {
        const { error: roleError } = await supabase
          .from('organization_member_roles')
          .upsert(
            {
              organization_id: currentOrgId,
              user_id: talent.id,
              role: 'ambassador',
            },
            { onConflict: 'organization_id,user_id,role' }
          );
        if (roleError) throw roleError;
      } else {
        const { error: roleError } = await supabase
          .from('organization_member_roles')
          .delete()
          .eq('organization_id', currentOrgId)
          .eq('user_id', talent.id)
          .eq('role', 'ambassador');
        if (roleError) throw roleError;
      }

      toast({
        description: newStatus
          ? `¡${talent.full_name} es ahora embajador!`
          : `${talent.full_name} ya no es embajador`,
      });
    } catch (error) {
      console.error('Error toggling ambassador:', error);
      setTalents(prev => prev.map(t =>
        t.id === talent.id ? { ...t, is_ambassador: !newStatus, ambassador_level: talent.ambassador_level } : t
      ));
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de embajador",
        variant: "destructive",
      });
    }
  };

  const filteredTalents = talents.filter(t => {
    const matchesSearch = t.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    switch (activeTab) {
      case 'creators':
        return t.role === 'creator';
      case 'editors':
        return t.role === 'editor';
      case 'strategists':
        return t.role === 'strategist';
      case 'ambassadors':
        return t.is_ambassador;
      default:
        return true;
    }
  });

  const stats = {
    all: talents.length,
    creators: talents.filter(t => t.role === 'creator').length,
    editors: talents.filter(t => t.role === 'editor').length,
    strategists: talents.filter(t => t.role === 'strategist').length,
    ambassadors: talents.filter(t => t.is_ambassador).length,
  };

  return (
    <>
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full sm:w-auto">
            <TabsTrigger value="all" className="gap-1.5">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Todos</span>
              <span className="text-xs opacity-70">({stats.all})</span>
            </TabsTrigger>
            <TabsTrigger value="creators" className="gap-1.5">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Creadores</span>
              <span className="text-xs opacity-70">({stats.creators})</span>
            </TabsTrigger>
            <TabsTrigger value="editors" className="gap-1.5">
              <Edit3 className="h-4 w-4" />
              <span className="hidden sm:inline">Editores</span>
              <span className="text-xs opacity-70">({stats.editors})</span>
            </TabsTrigger>
            <TabsTrigger value="strategists" className="gap-1.5">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Estrategas</span>
              <span className="text-xs opacity-70">({stats.strategists})</span>
            </TabsTrigger>
            <TabsTrigger value="ambassadors" className="gap-1.5">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Embajadores</span>
              <span className="text-xs opacity-70">({stats.ambassadors})</span>
            </TabsTrigger>
            <TabsTrigger value="ranking" className="gap-1.5">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Ranking</span>
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          {activeTab !== 'ranking' && (
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar creador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full rounded-sm border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
        </div>

        {/* Tab Contents */}
        <TabsContent value="all" className="mt-0">
          <TalentGrid
            talents={filteredTalents}
            loading={loading}
            onSelect={setSelectedTalent}
            onAmbassadorToggle={toggleAmbassador}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="creators" className="mt-0">
          <TalentGrid
            talents={filteredTalents}
            loading={loading}
            onSelect={setSelectedTalent}
            onAmbassadorToggle={toggleAmbassador}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="editors" className="mt-0">
          <TalentGrid
            talents={filteredTalents}
            loading={loading}
            onSelect={setSelectedTalent}
            onAmbassadorToggle={toggleAmbassador}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="strategists" className="mt-0">
          <TalentGrid
            talents={filteredTalents}
            loading={loading}
            onSelect={setSelectedTalent}
            onAmbassadorToggle={toggleAmbassador}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="ambassadors" className="mt-0">
          <TalentGrid
            talents={filteredTalents}
            loading={loading}
            onSelect={setSelectedTalent}
            onAmbassadorToggle={toggleAmbassador}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="ranking" className="mt-0">
          <div className="max-w-3xl">
            <TalentRanking />
          </div>
        </TabsContent>
      </Tabs>

      <CreatorDetailDialog
        creator={selectedTalent}
        open={!!selectedTalent}
        onOpenChange={(open) => !open && setSelectedTalent(null)}
        onUpdate={fetchTalents}
      />
    </>
  );
}
