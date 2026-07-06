import styles from '../dashboard-selling.module.css';

export default function AdminLoading() {
    return (
        <div className={styles.root}>
            <header className={styles.topbar}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 80, height: 20, background: '#e5e7eb', borderRadius: 4 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 40, height: 20, background: '#e5e7eb', borderRadius: 4 }} />
                </div>
            </header>
            <main style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
                <div style={{ height: 200, background: '#f3f4f6', borderRadius: 8, marginBottom: 16 }} />
                <div style={{ height: 400, background: '#f3f4f6', borderRadius: 8 }} />
            </main>
        </div>
    );
}