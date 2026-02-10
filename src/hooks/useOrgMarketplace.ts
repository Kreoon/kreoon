import { useOrgOwner } from './useOrgOwner';

/**
 * Hook to check if the current user's organization has marketplace enabled.
 * Delegates to useOrgOwner which fetches all org context in a single RPC call.
 *
 * For users without an organization, marketplace is always enabled.
 */
export function useOrgMarketplace() {
  const { marketplaceEnabled, loading } = useOrgOwner();
  return { marketplaceEnabled, loading };
}
