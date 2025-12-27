import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { AppRole } from '@/types/database';
import type { Json } from '@/integrations/supabase/types';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  registration_link: string | null;
  is_registration_open: boolean | null;
  default_role: AppRole | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  settings: Json;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: AppRole;
  is_owner: boolean;
  joined_at: string;
  invited_by: string | null;
  profile?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: AppRole;
  token: string;
  expires_at: string;
  invited_by: string | null;
  created_at: string;
  accepted_at: string | null;
}

export function useOrganizations() {
  const { user, isAdmin } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user's organizations
  const fetchOrganizations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);

      // Set current org from localStorage or first org
      const savedOrgId = localStorage.getItem('currentOrganizationId');
      const savedOrg = data?.find(o => o.id === savedOrgId);
      
      if (savedOrg) {
        setCurrentOrg(savedOrg);
      } else if (data && data.length > 0) {
        setCurrentOrg(data[0]);
        localStorage.setItem('currentOrganizationId', data[0].id);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch organization members
  const fetchMembers = useCallback(async (orgId: string) => {
    try {
      // First get members
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', orgId)
        .order('is_owner', { ascending: false });

      if (membersError) throw membersError;

      // Then fetch profiles for each member
      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(m => m.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds);

        // Combine members with their profiles
        const membersWithProfiles: OrganizationMember[] = membersData.map(member => ({
          ...member,
          profile: profilesData?.find(p => p.id === member.user_id) || null
        }));

        setMembers(membersWithProfiles);
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  }, []);

  // Fetch pending invitations
  const fetchInvitations = useCallback(async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('organization_id', orgId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  }, []);

  // Create organization
  const createOrganization = async (name: string, description?: string) => {
    if (!user) return null;

    try {
      // Generate slug
      const { data: slugData } = await supabase.rpc('generate_org_slug', { org_name: name });

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name,
          slug: slugData,
          description,
          created_by: user.id
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'admin',
          is_owner: true
        });

      if (memberError) throw memberError;

      toast.success('Organización creada exitosamente');
      await fetchOrganizations();
      return org;
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast.error('Error al crear organización: ' + error.message);
      return null;
    }
  };

  // Update organization
  const updateOrganization = async (orgId: string, updates: Partial<Organization>) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', orgId);

      if (error) throw error;

      toast.success('Organización actualizada');
      await fetchOrganizations();
      return true;
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toast.error('Error al actualizar: ' + error.message);
      return false;
    }
  };

  // Invite member
  const inviteMember = async (orgId: string, email: string, role: AppRole) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('organization_invitations')
        .insert({
          organization_id: orgId,
          email,
          role,
          invited_by: user.id
        });

      if (error) throw error;

      toast.success(`Invitación enviada a ${email}`);
      await fetchInvitations(orgId);
      return true;
    } catch (error: any) {
      console.error('Error inviting member:', error);
      if (error.code === '23505') {
        toast.error('Ya existe una invitación pendiente para este email');
      } else {
        toast.error('Error al enviar invitación: ' + error.message);
      }
      return false;
    }
  };

  // Cancel invitation
  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('organization_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('Invitación cancelada');
      if (currentOrg) {
        await fetchInvitations(currentOrg.id);
      }
      return true;
    } catch (error: any) {
      console.error('Error canceling invitation:', error);
      toast.error('Error al cancelar invitación');
      return false;
    }
  };

  // Update member role (legacy - updates single role)
  const updateMemberRole = async (memberId: string, newRole: AppRole) => {
    try {
      // Get the member details first
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('user_id, organization_id')
        .eq('id', memberId)
        .single();

      if (!memberData) throw new Error('Member not found');

      // Update organization_members for backward compatibility
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      // Replace all roles with the new one in organization_member_roles
      await supabase
        .from('organization_member_roles')
        .delete()
        .eq('user_id', memberData.user_id)
        .eq('organization_id', memberData.organization_id);

      await supabase
        .from('organization_member_roles')
        .insert({
          organization_id: memberData.organization_id,
          user_id: memberData.user_id,
          role: newRole,
        });

      toast.success('Rol actualizado');
      if (currentOrg) {
        await fetchMembers(currentOrg.id);
      }
      return true;
    } catch (error: any) {
      console.error('Error updating member role:', error);
      toast.error('Error al actualizar rol');
      return false;
    }
  };

  // Remove member
  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Miembro removido');
      if (currentOrg) {
        await fetchMembers(currentOrg.id);
      }
      return true;
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast.error('Error al remover miembro');
      return false;
    }
  };

  // Switch organization
  const switchOrganization = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setCurrentOrg(org);
      localStorage.setItem('currentOrganizationId', orgId);
      window.dispatchEvent(new CustomEvent('organization-changed', { detail: { orgId } }));
    }
  };

  // Generate registration link
  const generateRegistrationLink = async (orgId: string) => {
    try {
      const { data, error } = await supabase.rpc('generate_registration_link', { _org_id: orgId });
      
      if (error) throw error;
      
      await fetchOrganizations();
      toast.success('Link de registro generado');
      return data;
    } catch (error: any) {
      console.error('Error generating registration link:', error);
      toast.error('Error al generar link');
      return null;
    }
  };

  // Toggle registration
  const toggleRegistration = async (orgId: string, isOpen: boolean) => {
    return updateOrganization(orgId, { is_registration_open: isOpen });
  };

  // Initial fetch
  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Fetch members/invitations when current org changes
  useEffect(() => {
    if (currentOrg) {
      fetchMembers(currentOrg.id);
      fetchInvitations(currentOrg.id);
    }
  }, [currentOrg, fetchMembers, fetchInvitations]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('org-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'organizations' },
        () => fetchOrganizations()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'organization_members' },
        () => currentOrg && fetchMembers(currentOrg.id)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrg, fetchOrganizations, fetchMembers]);

  return {
    organizations,
    currentOrg,
    members,
    invitations,
    loading,
    createOrganization,
    updateOrganization,
    inviteMember,
    cancelInvitation,
    updateMemberRole,
    removeMember,
    switchOrganization,
    generateRegistrationLink,
    toggleRegistration,
    refetch: fetchOrganizations
  };
}
