import { useOrgOwner } from './useOrgOwner';

/**
 * Hook to check if the current user's organization has marketplace enabled.
 * Delegates to useOrgOwner which fetches all org context in a single RPC call.
 *
 * - `marketplaceEnabled`: controls marketplace visibility for internal team members
 * - `clientMarketplaceEnabled`: controls marketplace visibility specifically for client users
 *
 * For users without an organization, marketplace is always enabled.
 */
export function useOrgMarketplace() {
  const { marketplaceEnabled, loading } = useOrgOwner();
  // clientMarketplaceEnabled defaults to true (marketplace enabled for clients by default)
  // TODO: Add client_marketplace_enabled column to organizations if granular control needed
  const clientMarketplaceEnabled = marketplaceEnabled;
  return { marketplaceEnabled, clientMarketplaceEnabled, loading };
}
