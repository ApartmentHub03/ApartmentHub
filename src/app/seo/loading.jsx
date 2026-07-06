import styles from '../admin/seo/seo.module.css';

export default function SEOLoading() {
    return (
        <div className={styles.container}>
            <header style={{
                background: 'white',
                borderBottom: '1px solid #e5e7eb',
                padding: '1rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 32, height: 32, background: '#e5e7eb', borderRadius: 8 }} />
                    <div style={{ width: 140, height: 20, background: '#e5e7eb', borderRadius: 4 }} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} style={{ width: 80, height: 28, background: '#f3f4f6', borderRadius: 16 }} />
                    ))}
                </div>
            </header>
            <main className={styles.main}>
                <div style={{ display: 'grid', gap: '1rem' }}>
                    <div style={{ height: 200, background: '#f3f4f6', borderRadius: 8 }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ height: 160, background: '#f3f4f6', borderRadius: 8 }} />
                        <div style={{ height: 160, background: '#f3f4f6', borderRadius: 8 }} />
                    </div>
                </div>
            </main>
        </div>
    );
}