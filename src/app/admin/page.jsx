'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import styles from './admin.module.css';

export default function AdminLogin() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                sessionStorage.setItem('admin_token', data.token);
                if (data.refreshToken) sessionStorage.setItem('admin_refresh', data.refreshToken);
                sessionStorage.setItem('crm_role', data.role || '');
                sessionStorage.setItem('crm_name', data.name || '');
                sessionStorage.setItem('crm_permissions', JSON.stringify(data.permissions || {}));
                router.push('/admin/dashboard');
            } else {
                setError(data.message || 'Invalid credentials');
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.loginContainer}>
            <Card shadow="lg" className={styles.loginCard}>
                <CardHeader>
                    <div className={styles.logoWrapper}>
                        <div className={styles.logoIcon}>A</div>
                        <CardTitle as="h1">Team Login</CardTitle>
                    </div>
                    <p className={styles.subtitle}>ApartmentHub CRM · per-user access</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className={styles.form}>
                        <Input
                            label="Email"
                            required
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@apartmenthub.nl"
                            autoComplete="email"
                        />
                        <Input
                            label="Password"
                            required
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            autoComplete="current-password"
                        />
                        {error && <p className={styles.errorMessage}>{error}</p>}
                        <Button
                            type="submit"
                            fullWidth
                            size="lg"
                            loading={loading}
                        >
                            Sign In
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
