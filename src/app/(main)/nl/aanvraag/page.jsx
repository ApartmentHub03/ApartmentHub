'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import Aanvraag from '@/pages/Aanvraag';

function AanvraagWrapper() {
    const searchParams = useSearchParams();
    const apartmentId = searchParams.get('apartment') || undefined;
    return (
        <ProtectedRoute>
            <Aanvraag preselectedApartmentId={apartmentId} />
        </ProtectedRoute>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#009B8A' }}>Loading…</div>}>
            <AanvraagWrapper />
        </Suspense>
    );
}
