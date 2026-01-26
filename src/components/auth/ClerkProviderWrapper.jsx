import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
    console.warn('Clerk publishable key is not set. Authentication will run in mock mode.');
}

/**
 * Clerk Provider Wrapper Component
 * Wraps the application with Clerk authentication provider.
 * Falls back to rendering children directly if Clerk key is not configured.
 */
export const ClerkProviderWrapper = ({ children }) => {
    // If no Clerk key is set, render children without Clerk
    // This allows the app to run in development without Clerk credentials
    if (!CLERK_PUBLISHABLE_KEY) {
        return <>{children}</>;
    }

    return (
        <ClerkProvider
            publishableKey={CLERK_PUBLISHABLE_KEY}
            afterSignOutUrl="/login"
            appearance={{
                variables: {
                    colorPrimary: '#009B8A', // Match the app's teal theme
                    colorText: '#333333',
                    fontFamily: 'Inter, system-ui, sans-serif',
                },
                elements: {
                    formButtonPrimary: {
                        backgroundColor: '#009B8A',
                        '&:hover': {
                            backgroundColor: '#008777',
                        },
                    },
                },
            }}
        >
            {children}
        </ClerkProvider>
    );
};

export default ClerkProviderWrapper;
