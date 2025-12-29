import { useState, useEffect, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Search, Plus, Star, User, Sword, Users, Edit3, Trophy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MedievalBanner } from "@/components/layout/MedievalBanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatorDetailDialog } from "@/components/team/CreatorDetailDialog";
import { TalentCard, TalentProfile } from "@/components/team/TalentCard";
import { TalentRanking } from "@/components/team/TalentRanking";
import { cn } from "@/lib/utils";

const Creators = () => {
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

      // Get creators and editors scoped to the current organization
      const { data: memberRoles, error: memberRolesError } = await supabase
        .from('organization_member_roles')
        .select('user_id, role')
        .eq('organization_id', currentOrgId)
        .in('role', ['creator', 'editor']);

      if (memberRolesError) throw memberRolesError;

      if (!memberRoles?.length) {
        setTalents([]);
        return;
      }

      const userIds = [...new Set(memberRoles.map(r => r.user_id))];
      const roleMap = new Map(memberRoles.map(r => [r.user_id, r.role]));

      // Ambassador status (org-scoped)
      const { data: ambassadorRoles } = await supabase
        .from('organization_member_roles')
        .select('user_id')
        .eq('organization_id', currentOrgId)
        .eq('role', 'ambassador')
        .in('user_id', userIds);

      const ambassadorSet = new Set(ambassadorRoles?.map(r => r.user_id) || []);

      // Get organization member data for ambassador_level
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('user_id, ambassador_level')
        .eq('organization_id', currentOrgId)
        .in('user_id', userIds);

      const ambassadorLevelMap = new Map(memberData?.map(m => [m.user_id, m.ambassador_level]) || []);

      // Get profiles with performance data
      const { data: profiles } = await supabase
        .from('profiles')
        .select(`
          id, full_name, email, avatar_url, phone, bio, is_ambassador,
          quality_score_avg, reliability_score, velocity_score,
          ai_recommended_level, ai_risk_flag,
          editor_rating, editor_completed_count, editor_on_time_count
        `)
        .in('id', userIds);

      // Get content counts
      const { data: creatorCounts } = await supabase
        .from('content')
        .select('creator_id')
        .eq('organization_id', currentOrgId)
        .in('creator_id', userIds);

      const { data: editorCounts } = await supabase
        .from('content')
        .select('editor_id')
        .eq('organization_id', currentOrgId)
        .in('editor_id', userIds);

      const countMap = new Map<string, number>();
      creatorCounts?.forEach(c => {
        if (c.creator_id) {
          countMap.set(c.creator_id, (countMap.get(c.creator_id) || 0) + 1);
        }
      });
      editorCounts?.forEach(c => {
        if (c.editor_id) {
          countMap.set(c.editor_id, (countMap.get(c.editor_id) || 0) + 1);
        }
      });

      // Get active tasks count for each talent
      const { data: activeTasks } = await supabase
        .from('content')
        .select('creator_id, editor_id')
        .eq('organization_id', currentOrgId)
        .in('status', ['assigned', 'recording', 'recorded', 'editing', 'review', 'issue']);

      const activeTasksMap = new Map<string, number>();
      activeTasks?.forEach(c => {
        if (c.creator_id) {
          activeTasksMap.set(c.creator_id, (activeTasksMap.get(c.creator_id) || 0) + 1);
        }
        if (c.editor_id) {
          activeTasksMap.set(c.editor_id, (activeTasksMap.get(c.editor_id) || 0) + 1);
        }
      });

      const talentsData: TalentProfile[] = (profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        avatar_url: p.avatar_url,
        phone: p.phone,
        bio: p.bio,
        role: roleMap.get(p.id) as 'creator' | 'editor',
        content_count: countMap.get(p.id) || 0,
        is_ambassador: ambassadorSet.has(p.id) || p.is_ambassador || false,
        quality_score_avg: p.quality_score_avg || 0,
        reliability_score: p.reliability_score || 0,
        velocity_score: p.velocity_score || 0,
        ai_recommended_level: (p.ai_recommended_level as 'junior' | 'pro' | 'elite') || 'junior',
        ai_risk_flag: (p.ai_risk_flag as 'none' | 'warning' | 'high') || 'none',
        ambassador_level: (ambassadorLevelMap.get(p.id) as 'none' | 'bronze' | 'silver' | 'gold') || 'none',
        editor_rating: p.editor_rating,
        editor_completed_count: p.editor_completed_count,
        editor_on_time_count: p.editor_on_time_count,
        active_tasks: activeTasksMap.get(p.id) || 0,
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

    // Optimistic update
    setTalents(prev => prev.map(t =>
      t.id === talent.id ? { ...t, is_ambassador: newStatus, ambassador_level: newLevel as any } : t
    ));

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          is_ambassador: newStatus,
          ambassador_celebration_pending: newStatus,
        })
        .eq('id', talent.id);

      if (profileError) throw profileError;

      // Update organization_members ambassador_level
      const { error: memberError } = await supabase
        .from('organization_members')
        .update({ ambassador_level: newLevel })
        .eq('organization_id', currentOrgId)
        .eq('user_id', talent.id);

      if (memberError) throw memberError;

      // Update organization_member_roles
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

  // Filter talents based on search and active tab
  const filteredTalents = talents.filter(t => {
    const matchesSearch = t.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    switch (activeTab) {
      case 'creators':
        return t.role === 'creator';
      case 'editors':
        return t.role === 'editor';
      case 'ambassadors':
        return t.is_ambassador;
      default:
        return true;
    }
  });

  // Stats for tabs
  const stats = {
    all: talents.length,
    creators: talents.filter(t => t.role === 'creator').length,
    editors: talents.filter(t => t.role === 'editor').length,
    ambassadors: talents.filter(t => t.is_ambassador).length,
  };

  return (
    <>
      <div className="min-h-screen">
        <div className="p-4 md:p-6 space-y-6">
          {/* Medieval Banner */}
          <MedievalBanner
            icon={Sword}
            title="Creadores"
            subtitle="Sistema de Talento Inteligente"
            action={
              isAdmin && (
                <Button variant="glow" size="sm" className="gap-1 md:gap-2 text-xs md:text-sm flex-shrink-0 font-medieval">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Reclutar Guerrero</span>
                  <span className="sm:hidden">Reclutar</span>
                </Button>
              )
            }
          />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <TabsList className="grid grid-cols-5 w-full sm:w-auto">
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
                    placeholder="Buscar talento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
        </div>
      </div>

      <CreatorDetailDialog
        creator={selectedTalent}
        open={!!selectedTalent}
        onOpenChange={(open) => !open && setSelectedTalent(null)}
        onUpdate={fetchTalents}
      />
    </>
  );
};

// Extracted grid component for reuse
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
          <Skeleton key={i} className="h-56 rounded-xl" />
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

export default Creators;
