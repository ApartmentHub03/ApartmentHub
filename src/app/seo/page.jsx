'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SEOHeader from '../admin/seo/components/SEOHeader';
import OverviewTab from '../admin/seo/components/OverviewTab';
import GSCPerformanceTab from '../admin/seo/components/GSCPerformanceTab';
import KeywordsTab from '../admin/seo/components/KeywordsTab';
import BacklinksTab from '../admin/seo/components/BacklinksTab';
import SocialTab from '../admin/seo/components/SocialTab';
import AIInsightsTab from '../admin/seo/components/AIInsightsTab';
import styles from '../admin/seo/seo.module.css';

export default function SEOPage() {
    const router = useRouter();
    const [authenticated, setAuthenticated] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const token = sessionStorage.getItem('admin_token');
        if (!token) {
            router.push('/auth/seo');
            return;
        }
        setAuthenticated(true);
    }, [router]);

    if (!authenticated) return null;

    const handleRefresh = () => setRefreshKey((k) => k + 1);

    return (
        <div className={styles.container}>
            <SEOHeader
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onRefresh={handleRefresh}
            />
            <main className={styles.main}>
                {activeTab === 'overview' && <OverviewTab refreshKey={refreshKey} />}
                {activeTab === 'gsc' && <GSCPerformanceTab refreshKey={refreshKey} />}
                {activeTab === 'keywords' && <KeywordsTab refreshKey={refreshKey} />}
                {activeTab === 'backlinks' && <BacklinksTab refreshKey={refreshKey} />}
                {activeTab === 'social' && <SocialTab refreshKey={refreshKey} />}
                {activeTab === 'ai' && <AIInsightsTab refreshKey={refreshKey} />}
            </main>
        </div>
    );
}
