'use client';

import { Provider } from 'react-redux';
import { store } from '@/app/store';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
        },
    },
});

export default function Providers({ children }) {
    return (
        <QueryClientProvider client={queryClient}>
            <Provider store={store}>
                <AuthProvider>
                    <Toaster position="top-center" richColors />
                    {children}
                </AuthProvider>
            </Provider>
        </QueryClientProvider>
    );
}
