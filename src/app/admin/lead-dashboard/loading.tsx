import styles from './AanhuurLeadsDashboard.module.css';

export default function LeadsLoading() {
    return (
        <div className={styles.root}>
            <div style={{
                height: 64,
                background: 'white',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                padding: '0 1.5rem',
                gap: '0.75rem',
            }}>
                <div style={{ width: 120, height: 20, background: '#e5e7eb', borderRadius: 4 }} />
                <div style={{ width: 80, height: 20, background: '#e5e7eb', borderRadius: 4 }} />
                <div style={{ width: 60, height: 20, background: '#e5e7eb', borderRadius: 4 }} />
            </div>
            <main style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} style={{ height: 80, background: '#f3f4f6', borderRadius: 8 }} />
                    ))}
                </div>
                <div style={{ height: 400, background: '#f3f4f6', borderRadius: 8 }} />
            </main>
        </div>
    );
}