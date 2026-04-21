'use client';

import { Suspense } from 'react';
import InviteForm from '../../../_pages/InviteForm';

export default function InviteFormPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>Loading...</div>}>
            <InviteForm />
        </Suspense>
    );
}
