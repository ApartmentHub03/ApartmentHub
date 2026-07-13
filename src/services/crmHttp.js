import { NextResponse } from 'next/server';

// Shared response helpers for the CRM API routes.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
    return typeof value === 'string' && UUID_RE.test(value);
}

export function invalidId() {
    return NextResponse.json({ success: false, message: 'Invalid id' }, { status: 400 });
}

// Log the real error, return a generic one. Postgres errors name columns,
// constraints and relations, and the auth errors distinguish "no such user"
// from "wrong password" — all of which we'd rather not hand to a caller.
export function failed(tag, error, message = 'Request failed', status = 500) {
    console.error(`[${tag}]`, error);
    return NextResponse.json({ success: false, message }, { status });
}
