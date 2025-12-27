import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgOwner } from "@/hooks/useOrgOwner";
import { useToast } from "@/hooks/use-toast";

export interface AmbassadorReferral {
  id: string;
  organization_id: string;
  ambassador_id: string;
  referred_user_id: string | null;
  referred_email: string;
  referred_type: "creator" | "editor" | "client";
  referral_code: string;
  status: "pending" | "registered" | "active" | "churned";
  registered_at: string | null;
  activated_at: string | null;
  created_at: string;
}

export interface AmbassadorNetworkStats {
  id: string;
  organization_id: string;
  ambassador_id: string;
  period_month: number;
  period_year: number;
  active_referrals_count: number;
  content_by_network: number;
  revenue_by_network: number;
  commission_earned: number;
  up_bonus_earned: number;
  retention_rate: number;
}

export interface AmbassadorCommissionConfig {
  id: string;
  organization_id: string;
  ambassador_level: "bronze" | "silver" | "gold";
  commission_type: "percentage" | "fixed" | "up_points";
  commission_value: number;
  up_bonus_multiplier: number;
  priority_assignment_boost: number;
  is_active: boolean;
}

export function useAmbassador() {
  const [loading, setLoading] = useState(false);
  const { currentOrgId } = useOrgOwner();
  const { toast } = useToast();

  const getMyReferrals = useCallback(async (): Promise<AmbassadorReferral[]> => {
    if (!currentOrgId) return [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("ambassador_referrals")
        .select("*")
        .eq("ambassador_id", user.id)
        .eq("organization_id", currentOrgId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as AmbassadorReferral[];
    } catch (error: any) {
      console.error("Error fetching referrals:", error);
      return [];
    }
  }, [currentOrgId]);

  const getMyNetworkStats = useCallback(async (): Promise<AmbassadorNetworkStats[]> => {
    if (!currentOrgId) return [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("ambassador_network_stats")
        .select("*")
        .eq("ambassador_id", user.id)
        .eq("organization_id", currentOrgId)
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false })
        .limit(12);

      if (error) throw error;
      return (data || []) as AmbassadorNetworkStats[];
    } catch (error: any) {
      console.error("Error fetching network stats:", error);
      return [];
    }
  }, [currentOrgId]);

  const getCommissionConfig = useCallback(async (): Promise<AmbassadorCommissionConfig[]> => {
    if (!currentOrgId) return [];

    try {
      const { data, error } = await supabase
        .from("ambassador_commission_config")
        .select("*")
        .eq("organization_id", currentOrgId)
        .eq("is_active", true);

      if (error) throw error;
      return (data || []) as AmbassadorCommissionConfig[];
    } catch (error: any) {
      console.error("Error fetching commission config:", error);
      return [];
    }
  }, [currentOrgId]);

  const createReferral = useCallback(async (
    email: string,
    type: "creator" | "editor" | "client"
  ): Promise<AmbassadorReferral | null> => {
    if (!currentOrgId) {
      toast({ variant: "destructive", description: "No hay organización seleccionada" });
      return null;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // Generate referral code
      const { data: codeData, error: codeError } = await supabase
        .rpc("generate_ambassador_referral_code", {
          org_id: currentOrgId,
          p_user_id: user.id,
        });

      if (codeError) throw codeError;

      const { data, error } = await supabase
        .from("ambassador_referrals")
        .insert({
          organization_id: currentOrgId,
          ambassador_id: user.id,
          referred_email: email,
          referred_type: type,
          referral_code: codeData,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ description: "Referido agregado exitosamente" });
      return data as AmbassadorReferral;
    } catch (error: any) {
      console.error("Error creating referral:", error);
      toast({ variant: "destructive", description: error.message || "Error al crear referido" });
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentOrgId, toast]);

  const getMyReferralCode = useCallback(async (): Promise<string | null> => {
    if (!currentOrgId) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("organization_members")
        .select("ambassador_referral_code")
        .eq("user_id", user.id)
        .eq("organization_id", currentOrgId)
        .single();

      if (error) throw error;
      return data?.ambassador_referral_code || null;
    } catch (error: any) {
      console.error("Error fetching referral code:", error);
      return null;
    }
  }, [currentOrgId]);

  const getAmbassadorStats = useCallback(async (userId: string) => {
    if (!currentOrgId) return null;

    try {
      const [memberRes, referralsRes, statsRes] = await Promise.all([
        supabase
          .from("organization_members")
          .select("ambassador_level, ambassador_since, ambassador_total_referrals, ambassador_active_referrals, ambassador_network_revenue")
          .eq("user_id", userId)
          .eq("organization_id", currentOrgId)
          .single(),
        supabase
          .from("ambassador_referrals")
          .select("*")
          .eq("ambassador_id", userId)
          .eq("organization_id", currentOrgId),
        supabase
          .from("ambassador_network_stats")
          .select("*")
          .eq("ambassador_id", userId)
          .eq("organization_id", currentOrgId)
          .order("period_year", { ascending: false })
          .order("period_month", { ascending: false })
          .limit(1),
      ]);

      return {
        membership: memberRes.data,
        referrals: referralsRes.data || [],
        latestStats: statsRes.data?.[0] || null,
      };
    } catch (error: any) {
      console.error("Error fetching ambassador stats:", error);
      return null;
    }
  }, [currentOrgId]);

  const getAllAmbassadors = useCallback(async () => {
    if (!currentOrgId) return [];

    try {
      const { data: members, error } = await supabase
        .from("organization_members")
        .select(`
          user_id,
          ambassador_level,
          ambassador_since,
          ambassador_total_referrals,
          ambassador_active_referrals,
          ambassador_network_revenue
        `)
        .eq("organization_id", currentOrgId)
        .in("ambassador_level", ["bronze", "silver", "gold"])
        .order("ambassador_network_revenue", { ascending: false });

      if (error) throw error;
      if (!members?.length) return [];

      // Fetch profiles separately
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email, quality_score_avg")
        .in("id", userIds);

      // Merge data
      return members.map(m => ({
        ...m,
        profile: profiles?.find(p => p.id === m.user_id) || { id: m.user_id, full_name: "Unknown", avatar_url: null, email: "", quality_score_avg: 0 }
      }));
    } catch (error: any) {
      console.error("Error fetching ambassadors:", error);
      return [];
    }
  }, [currentOrgId]);

  // Admin: Update ambassador level
  const updateAmbassadorLevel = useCallback(async (
    userId: string,
    level: "none" | "bronze" | "silver" | "gold"
  ) => {
    if (!currentOrgId) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("organization_members")
        .update({
          ambassador_level: level,
          ambassador_since: level !== "none" ? new Date().toISOString() : null,
        })
        .eq("user_id", userId)
        .eq("organization_id", currentOrgId);

      if (error) throw error;

      toast({ description: `Nivel de embajador actualizado a ${level}` });
      return true;
    } catch (error: any) {
      console.error("Error updating ambassador level:", error);
      toast({ variant: "destructive", description: error.message });
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentOrgId, toast]);

  return {
    loading,
    getMyReferrals,
    getMyNetworkStats,
    getCommissionConfig,
    createReferral,
    getMyReferralCode,
    getAmbassadorStats,
    getAllAmbassadors,
    updateAmbassadorLevel,
  };
}
