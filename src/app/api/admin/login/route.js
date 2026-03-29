import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request) {
    const { username, password } = await request.json();

    const validUsername = process.env.NEXT_PUBLIC_ADMIN_USERNAME;
    const validPassword = process.env.ADMIN_PASSWORD;

    if (username === validUsername && password === validPassword) {
        const token = crypto.randomBytes(32).toString('hex');

        // Store token in a simple way - in production use a proper session store
        // For now we validate on the client side with sessionStorage
        return NextResponse.json({
            success: true,
            token,
        });
    }

    return NextResponse.json(
        { success: false, message: 'Invalid username or password' },
        { status: 401 }
    );
}
