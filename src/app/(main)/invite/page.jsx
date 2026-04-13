'use client';

import { Suspense } from 'react';
import Invite from '../../../_pages/Invite';

export default function InvitePage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>Loading...</div>}>
            <Invite />
        </Suspense>
    );
}
