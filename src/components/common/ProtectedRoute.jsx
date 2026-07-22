'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Protected Route component
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            // Preserve the full URL (including query string) so deep links like
            // /aanvraag?apartment=UUID survive the login redirect.
            const query = typeof window !== 'undefined' ? window.location.search : '';
            const from = query ? `${pathname}${query}` : pathname;
            router.push(`/login?from=${encodeURIComponent(from)}`);
        }
    }, [isLoading, isAuthenticated, router, pathname]);

    // Show nothing while checking auth status or redirecting
    if (isLoading || !isAuthenticated) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                color: '#009B8A'
            }}>
                Loading...
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
