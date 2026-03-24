'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import styles from './admin.module.css';

export default function AdminLogin() {
    const router = useRouter();
    const [username, setUsername] = useState('');
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
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                sessionStorage.setItem('admin_token', data.token);
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
                        <CardTitle as="h1">Admin Login</CardTitle>
                    </div>
                    <p className={styles.subtitle}>ApartmentHub Dashboard</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className={styles.form}>
                        <Input
                            label="Username"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            autoComplete="username"
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
