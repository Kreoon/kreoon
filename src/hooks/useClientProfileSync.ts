import { supabase } from '@/integrations/supabase/client';

/**
 * Utility functions for bidirectional profile synchronization
 * between user profiles and client/organization profiles.
 * 
 * SYNCED FIELDS (profile → client):
 * - contact_email ← email
 * - contact_phone ← phone  
 * - bio ← bio
 * - city ← city
 * - country ← country
 * - address ← address
 * - instagram ← instagram
 * - tiktok ← tiktok
 * - facebook ← facebook
 * - linkedin ← social_linkedin
 * - portfolio_url ← portfolio_url
 * - document_type ← document_type
 * - document_number ← document_number
 */

interface ClientData {
  id: string;
  name: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  portfolio_url?: string | null;
  document_type?: string | null;
  document_number?: string | null;
}

/**
 * Sync client changes to user profile
 * Called when editing a client profile owned by the user
 */
export async function syncClientToProfile(
  userId: string,
  clientData: Partial<ClientData>
): Promise<void> {
  try {
    const updateData: Record<string, any> = {};
    
    if (clientData.contact_phone !== undefined) updateData.phone = clientData.contact_phone;
    if (clientData.bio !== undefined) updateData.bio = clientData.bio;
    if (clientData.city !== undefined) updateData.city = clientData.city;
    if (clientData.country !== undefined) updateData.country = clientData.country;
    if (clientData.address !== undefined) updateData.address = clientData.address;
    if (clientData.instagram !== undefined) updateData.instagram = clientData.instagram;
    if (clientData.tiktok !== undefined) updateData.tiktok = clientData.tiktok;
    if (clientData.facebook !== undefined) updateData.facebook = clientData.facebook;
    if (clientData.linkedin !== undefined) updateData.social_linkedin = clientData.linkedin;
    if (clientData.portfolio_url !== undefined) updateData.portfolio_url = clientData.portfolio_url;
    if (clientData.document_type !== undefined) updateData.document_type = clientData.document_type;
    if (clientData.document_number !== undefined) updateData.document_number = clientData.document_number;

    // Only update if there are fields to sync
    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('[syncClientToProfile] Error:', error);
      }
    }
  } catch (error) {
    console.error('[syncClientToProfile] Exception:', error);
  }
}

/**
 * Check if user is an owner of the given client
 */
export async function isClientOwner(
  userId: string,
  clientId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('client_users')
      .select('id')
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .eq('role', 'owner')
      .maybeSingle();

    return !error && !!data;
  } catch {
    return false;
  }
}

/**
 * Get all clients owned by the user
 */
export async function getUserOwnedClients(
  userId: string
): Promise<{ id: string; name: string }[]> {
  try {
    const { data: clientUsers } = await supabase
      .from('client_users')
      .select('client_id')
      .eq('user_id', userId)
      .eq('role', 'owner');

    if (!clientUsers || clientUsers.length === 0) return [];

    const clientIds = clientUsers.map(cu => cu.client_id);
    
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name')
      .in('id', clientIds);

    return clients || [];
  } catch {
    return [];
  }
}
