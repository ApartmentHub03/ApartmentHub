'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, RefreshCw, ArrowLeft, LogOut, ExternalLink } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import styles from '../seo.module.css';

export default function SEOHeader({ activeTab, onTabChange, onRefresh, refreshing }) {
    const router = useRouter();
    const [loadingDeployment, setLoadingDeployment] = useState(false);

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'gsc', label: 'Search Console' },
        { id: 'keywords', label: 'Keywords' },
        { id: 'backlinks', label: 'Backlinks' },
        { id: 'social', label: 'Social' },
        { id: 'ai', label: 'AI Insights' },
    ];

    const handleRefresh = async () => {
        try {
            const token = sessionStorage.getItem('admin_token');
            const response = await fetch('/api/admin/seo/cache/refresh?pattern=%25', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Cache refresh failed');
            toast.success('Cache cleared — reloading data');
            onRefresh?.();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('admin_token');
        router.push('/admin');
    };

    const handleOpenDeployment = async () => {
        if (loadingDeployment) return;
        setLoadingDeployment(true);
        toast.loading('Looking up the latest SEO deployment...', { id: 'deployment-lookup' });
        try {
            const token = sessionStorage.getItem('admin_token');
            const res = await fetch('/api/admin/seo/deployment', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (!res.ok || !json.success || !json.url) {
                throw new Error(json.error || 'Could not load deployment');
            }
            toast.success('Opening deployment...', { id: 'deployment-lookup' });
            window.open(json.url, '_blank', 'noopener,noreferrer');
        } catch (err) {
            toast.error(err.message, { id: 'deployment-lookup' });
        } finally {
            setLoadingDeployment(false);
        }
    };

    return (
        <>
            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <div className={styles.headerLeft}>
                        <div className={styles.logoIcon}>
                            <BarChart3 size={20} />
                        </div>
                        <h1 className={styles.headerTitle}>SEO Analytics</h1>
                    </div>
                    <div className={styles.headerActions}>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={refreshing}
                        >
                            <RefreshCw size={14} />
                            Refresh
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleOpenDeployment}
                            disabled={loadingDeployment}
                            loading={loadingDeployment}
                            title="Open the latest Vercel deployment of the SEO branch"
                        >
                            <ExternalLink size={14} />
                            Deployment
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push('/admin/dashboard')}
                        >
                            <ArrowLeft size={14} />
                            Dashboard
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleLogout}>
                            <LogOut size={14} />
                            Logout
                        </Button>
                    </div>
                </div>
            </header>
            <nav className={styles.tabs}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                        onClick={() => onTabChange(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>
        </>
    );
}
