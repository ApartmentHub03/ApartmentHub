'use client';

import DealResponse from '@/pages/DealResponse';
import { Suspense } from 'react';

export default function Page() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Loading...</div>}>
            <DealResponse />
        </Suspense>
    );
}
