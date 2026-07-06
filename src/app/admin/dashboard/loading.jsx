import { Home, Users, BarChart3, ClipboardList, LogOut } from 'lucide-react';
import styles from './dashboard.module.css';

export default function DashboardLoading() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <div className={styles.headerLeft}>
                        <div style={{ width: 50, height: 50, background: '#e5e7eb', borderRadius: 8 }} />
                        <h1 className={styles.headerTitle}>Admin Dashboard</h1>
                        <span className={styles.rentalBadge}>Rental</span>
                    </div>
                    <div className={styles.headerActions}>
                        <span className={styles.navLink}><Home size={16} /> Selling</span>
                        <span className={styles.navLink}><Users size={16} /> Leads</span>
                        <span className={styles.navLink}><BarChart3 size={16} /> SEO</span>
                        <span className={styles.navLink}><ClipboardList size={16} /> Logs</span>
                        <span className={styles.navLink}><LogOut size={16} /> Logout</span>
                    </div>
                </div>
            </header>
            <main className={styles.main}>
                <div className={styles.actionsBar}>
                    <h2 className={styles.sectionTitle}>Apartments</h2>
                </div>
                <div className={styles.apartmentGrid}>
                    {[0, 1, 2].map((i) => (
                        <div key={i} style={{
                            background: 'white',
                            borderRadius: '0.75rem',
                            border: '1px solid #e5e7eb',
                            padding: '1.5rem',
                            opacity: 0.6,
                        }}>
                            <div style={{ height: 20, width: '60%', background: '#e5e7eb', borderRadius: 4, marginBottom: 12 }} />
                            <div style={{ height: 16, width: '40%', background: '#f3f4f6', borderRadius: 4, marginBottom: 16 }} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div style={{ height: 40, background: '#f3f4f6', borderRadius: 6 }} />
                                <div style={{ height: 40, background: '#f3f4f6', borderRadius: 6 }} />
                                <div style={{ height: 40, background: '#f3f4f6', borderRadius: 6 }} />
                                <div style={{ height: 40, background: '#f3f4f6', borderRadius: 6 }} />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}