import React, { createContext, useContext, useState, useEffect } from 'react';
import { sendWhatsAppCode, verifyWhatsAppCode } from '../services/authApi';
import { sendLoginEvent } from '../services/webhookService';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const [phoneNumber, setPhoneNumber] = useState(null);
    const [dossierId, setDossierId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem('auth_token');
        const storedPhone = localStorage.getItem('auth_phone');
        const storedDossierId = localStorage.getItem('dossier_id');

        if (storedToken && storedPhone) {
            setToken(storedToken);
            setPhoneNumber(storedPhone);
            setDossierId(storedDossierId);
        }
        setIsLoading(false);
    }, []);

    const sendCode = async (phone) => {
        return await sendWhatsAppCode(phone);
    };

    const login = async (phone, code) => {
        const result = await verifyWhatsAppCode(phone, code);

        if (result.ok && result.token && result.dossier_id) {
            setToken(result.token);
            setPhoneNumber(phone);
            setDossierId(result.dossier_id);

            localStorage.setItem('auth_token', result.token);
            localStorage.setItem('auth_phone', phone);
            localStorage.setItem('dossier_id', result.dossier_id);

            sendLoginEvent(phone, result.dossier_id);

            return { ok: true };
        }

        return { ok: false, error: result.reason };
    };

    const logout = () => {
        setToken(null);
        setPhoneNumber(null);
        setDossierId(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_phone');
        localStorage.removeItem('dossier_id');
    };

    return (
        <AuthContext.Provider
            value={{
                token,
                phoneNumber,
                dossierId,
                isAuthenticated: !!token,
                isLoading,
                login,
                logout,
                sendCode
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
