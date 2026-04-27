import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AssignableUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

export function useOrgAssignableUsers(organizationId: string | null) {
  const [creators, setCreators] = useState<AssignableUser[]>([]);
  const [editors, setEditors] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      const [membersResult, memberRolesResult] = await Promise.all([
        supabase
          .from("organization_members")
          .select("user_id, role")
          .eq("organization_id", organizationId)
          .in("role", ["creator", "content_creator", "editor"]),
        supabase
          .from("organization_member_roles")
          .select("user_id, role")
          .eq("organization_id", organizationId)
          .in("role", ["creator", "content_creator", "editor"]),
      ]);

      if (membersResult.error) throw membersResult.error;

      const members = membersResult.data || [];
      const memberRoles = memberRolesResult.data || [];
      const allRoles = [...members, ...memberRoles];

      if (!allRoles.length) {
        setCreators([]);
        setEditors([]);
        return;
      }

      const userIds = [...new Set(allRoles.map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      const creatorIds = new Set(allRoles.filter((m) => m.role === "creator" || m.role === "content_creator").map((m) => m.user_id));
      const editorIds = new Set(allRoles.filter((m) => m.role === "editor").map((m) => m.user_id));

      setCreators(
        [...creatorIds]
          .map((id) => {
            const p = profileMap.get(id);
            return p ? { id: p.id, full_name: p.full_name, avatar_url: p.avatar_url, role: "creator" } : null;
          })
          .filter(Boolean) as AssignableUser[]
      );
      setEditors(
        [...editorIds]
          .map((id) => {
            const p = profileMap.get(id);
            return p ? { id: p.id, full_name: p.full_name, avatar_url: p.avatar_url, role: "editor" } : null;
          })
          .filter(Boolean) as AssignableUser[]
      );
    } catch (err) {
      console.error("Error fetching assignable users:", err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { creators, editors, loading, refetch: fetchUsers };
}
