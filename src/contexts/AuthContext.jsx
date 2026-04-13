import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getOrCreateDossier } from '../services/userDataService';
import { sendLoginEvent } from '../services/webhookService';
import { sendReminderRegistration } from '../services/reminderService';

const AuthContext = createContext(undefined);

// JWT decoder (simple base64 decode for payload)
function decodeJWT(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1]));
        return payload;
    } catch (e) {
        console.error('Error decoding JWT:', e);
        return null;
    }
}

// Check if token is expired
function isTokenExpired(token) {
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) return true;
    return Date.now() >= payload.exp * 1000;
}

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState({
        token: null,
        phoneNumber: null,
        dossierId: null,
        accountId: null,
        firstName: null,
        lastName: null,
        userRole: null,    // 'main_tenant', 'co_tenant', or 'guarantor'
        persoonId: null,   // personen table ID for co-tenants/guarantors
    });
    const [isLoading, setIsLoading] = useState(true);

    // Load auth state from localStorage on mount
    useEffect(() => {
        const loadAuthState = () => {
            try {
                const storedToken = localStorage.getItem('auth_token');
                const storedPhone = localStorage.getItem('auth_phone');
                const storedDossierId = localStorage.getItem('dossier_id');
                const storedAccountId = localStorage.getItem('account_id');
                const storedFirstName = localStorage.getItem('auth_first_name');
                const storedLastName = localStorage.getItem('auth_last_name');
                const storedUserRole = localStorage.getItem('auth_user_role');
                const storedPersoonId = localStorage.getItem('auth_persoon_id');

                if (storedToken && !isTokenExpired(storedToken)) {
                    console.log('[Auth] Loaded session from localStorage');
                    setAuthState({
                        token: storedToken,
                        phoneNumber: storedPhone,
                        dossierId: storedDossierId,
                        accountId: storedAccountId,
                        firstName: storedFirstName,
                        lastName: storedLastName,
                        userRole: storedUserRole || 'main_tenant',
                        persoonId: storedPersoonId,
                    });
                } else if (storedToken) {
                    // Token expired, clear storage
                    console.log('[Auth] Token expired, clearing session');
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('auth_phone');
                    localStorage.removeItem('dossier_id');
                    localStorage.removeItem('account_id');
                    localStorage.removeItem('auth_first_name');
                    localStorage.removeItem('auth_last_name');
                    localStorage.removeItem('auth_user_role');
                    localStorage.removeItem('auth_persoon_id');
                }
            } catch (e) {
                console.error('[Auth] Error loading auth state:', e);
            } finally {
                setIsLoading(false);
            }
        };

        loadAuthState();
    }, []);

    /**
     * Login - store auth data after successful verification
     */
    const login = useCallback((token, phoneNumber, dossierId, firstName = null, lastName = null, accountId = null, userRole = null, persoonId = null) => {
        console.log('[Auth] Logging in:', phoneNumber, 'Dossier:', dossierId, 'Account:', accountId, 'Role:', userRole);

        // Store in localStorage
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_phone', phoneNumber);
        localStorage.setItem('dossier_id', dossierId);
        if (accountId) localStorage.setItem('account_id', accountId);
        if (firstName) localStorage.setItem('auth_first_name', firstName);
        if (lastName) localStorage.setItem('auth_last_name', lastName);
        localStorage.setItem('auth_user_role', userRole || 'main_tenant');
        if (persoonId) localStorage.setItem('auth_persoon_id', persoonId);

        // Update state
        setAuthState({
            token,
            phoneNumber,
            dossierId,
            accountId,
            firstName,
            lastName,
            userRole: userRole || 'main_tenant',
            persoonId,
        });

        // Send login event to webhook
        sendLoginEvent(phoneNumber, dossierId);

        // Register for document completion reminders (n8n handles timing)
        sendReminderRegistration(phoneNumber, dossierId);
    }, []);

    /**
     * Logout - clear all auth data
     */
    const logout = useCallback(() => {
        console.log('[Auth] Logging out');

        // Clear localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_phone');
        localStorage.removeItem('dossier_id');
        localStorage.removeItem('account_id');
        localStorage.removeItem('auth_first_name');
        localStorage.removeItem('auth_last_name');
        localStorage.removeItem('auth_user_role');
        localStorage.removeItem('auth_persoon_id');

        // Clear state
        setAuthState({
            token: null,
            phoneNumber: null,
            dossierId: null,
            accountId: null,
            firstName: null,
            lastName: null,
            userRole: null,
            persoonId: null,
        });
    }, []);

    // Computed values
    const isAuthenticated = !!authState.token && !isTokenExpired(authState.token);
    const userName = authState.firstName && authState.lastName
        ? `${authState.firstName} ${authState.lastName}`
        : null;

    return (
        <AuthContext.Provider
            value={{
                token: authState.token,
                phoneNumber: authState.phoneNumber,
                dossierId: authState.dossierId,
                accountId: authState.accountId,
                firstName: authState.firstName,
                lastName: authState.lastName,
                userRole: authState.userRole,
                persoonId: authState.persoonId,
                isMainTenant: !authState.userRole || authState.userRole === 'main_tenant',
                userName,
                isAuthenticated,
                isLoading,
                login,
                logout,
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
