import ScrollToTop from '@/components/common/ScrollToTop';

export default function LeadFormLayout({ children }) {
    return (
        <>
            <ScrollToTop />
            {children}
        </>
    );
}