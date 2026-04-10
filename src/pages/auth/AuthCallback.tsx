import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * AuthCallback - Redirect handler for Supabase Auth callbacks
 *
 * Supabase sends users here after email confirmation.
 * This component preserves the hash (contains the token) and query params,
 * then redirects to /auth where the actual authentication is processed.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Get the 'next' parameter if it exists
    const nextParam = searchParams.get('next');

    // Build the redirect URL
    // The hash fragment (#access_token=...) is automatically preserved by the browser
    const redirectUrl = nextParam ? `/auth?next=${encodeURIComponent(nextParam)}` : '/auth';

    // Use window.location to preserve the hash fragment
    // navigate() from react-router doesn't preserve hash
    window.location.href = redirectUrl + window.location.hash;
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
}
