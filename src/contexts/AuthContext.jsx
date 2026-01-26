import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { getOrCreateDossier } from '../services/userDataService';
import { sendLoginEvent } from '../services/webhookService';

const AuthContext = createContext(undefined);

// Check if Clerk is configured
const isClerkConfigured = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export const AuthProvider = ({ children }) => {
    const [dossierId, setDossierId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [mockAuth, setMockAuth] = useState({
        token: null,
        phoneNumber: null
    });

    // Clerk hooks - only available when Clerk is configured
    let clerkUser = null;
    let clerkInstance = null;
    let isClerkLoaded = false;

    if (isClerkConfigured) {
        try {
            const userResult = useUser();
            const clerkResult = useClerk();

            clerkUser = userResult?.user;
            isClerkLoaded = userResult?.isLoaded;
            clerkInstance = clerkResult;
        } catch (e) {
            console.warn('Clerk hooks not available:', e);
        }
    }

    // Effect to handle Clerk user and dossier linking
    useEffect(() => {
        const initializeAuth = async () => {
            if (isClerkConfigured && isClerkLoaded) {
                if (clerkUser) {
                    // User is signed in with Clerk - get their identifier
                    const phoneNumber = clerkUser.primaryPhoneNumber?.phoneNumber;
                    const email = clerkUser.primaryEmailAddress?.emailAddress;
                    const identifier = phoneNumber || email || clerkUser.id;

                    console.log('[Auth] User signed in:', identifier);

                    const result = await getOrCreateDossier(identifier, clerkUser.id);
                    console.log('[Auth] Dossier result:', result);

                    if (result.ok) {
                        setDossierId(result.dossierId);
                        localStorage.setItem('dossier_id', result.dossierId);

                        // Send login event to webhook on first login
                        if (result.isNew) {
                            sendLoginEvent(identifier, result.dossierId);
                        }
                    } else {
                        // If Supabase fails (e.g., table doesn't exist), use a mock dossier
                        console.warn('[Auth] Supabase dossier failed, using mock:', result.error);
                        const mockDossierId = 'clerk-' + clerkUser.id;
                        setDossierId(mockDossierId);
                        localStorage.setItem('dossier_id', mockDossierId);
                    }
                }
                setIsLoading(false);
            } else if (!isClerkConfigured) {
                // Mock mode - load from localStorage
                const storedToken = localStorage.getItem('auth_token');
                const storedPhone = localStorage.getItem('auth_phone');
                const storedDossierId = localStorage.getItem('dossier_id');

                if (storedToken && storedPhone) {
                    setMockAuth({
                        token: storedToken,
                        phoneNumber: storedPhone
                    });
                    setDossierId(storedDossierId);
                }
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, [isClerkLoaded, clerkUser]);

    /**
     * Logout
     */
    const logout = async () => {
        if (isClerkConfigured && clerkInstance) {
            await clerkInstance.signOut({ redirectUrl: '/login' });
        }

        // Clear local storage regardless
        setMockAuth({ token: null, phoneNumber: null });
        setDossierId(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_phone');
        localStorage.removeItem('dossier_id');
    };

    // Determine authentication state
    const isAuthenticated = isClerkConfigured
        ? !!clerkUser
        : !!mockAuth.token;

    const phoneNumber = isClerkConfigured
        ? clerkUser?.primaryPhoneNumber?.phoneNumber
        : mockAuth.phoneNumber;

    const email = isClerkConfigured
        ? clerkUser?.primaryEmailAddress?.emailAddress
        : null;

    const token = isClerkConfigured
        ? clerkUser?.id
        : mockAuth.token;

    const userName = isClerkConfigured
        ? clerkUser?.fullName || clerkUser?.username
        : null;

    return (
        <AuthContext.Provider
            value={{
                token,
                phoneNumber,
                email,
                userName,
                dossierId,
                isAuthenticated,
                isLoading,
                isClerkConfigured,
                clerkUser,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
