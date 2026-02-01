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
      const { data: members, error } = await supabase
        .from("organization_members")
        .select("user_id, role")
        .eq("organization_id", organizationId)
        .in("role", ["creator", "editor"]);

      if (error) throw error;
      if (!members?.length) {
        setCreators([]);
        setEditors([]);
        return;
      }

      const userIds = [...new Set(members.map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      const creatorIds = new Set(members.filter((m) => m.role === "creator").map((m) => m.user_id));
      const editorIds = new Set(members.filter((m) => m.role === "editor").map((m) => m.user_id));

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
