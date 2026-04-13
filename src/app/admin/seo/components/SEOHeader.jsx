'use client';

import { useRouter } from 'next/navigation';
import { BarChart3, RefreshCw, ArrowLeft, LogOut } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import styles from '../seo.module.css';

export default function SEOHeader({ activeTab, onTabChange, onRefresh, refreshing }) {
    const router = useRouter();

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
