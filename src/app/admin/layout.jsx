import '@/index.css';

export const metadata = {
    title: 'Admin | ApartmentHub',
    robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#F7FAFC' }}>
            {children}
        </div>
    );
}
