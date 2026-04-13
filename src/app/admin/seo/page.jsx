'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect legacy /admin/seo to the new /seo route
export default function SEODashboardRedirect() {
    const router = useRouter();

    useEffect(() => {
        const token = sessionStorage.getItem('admin_token');
        router.replace(token ? '/seo' : '/auth/seo');
    }, [router]);

    return null;
}
