import { Claim } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Missing Supabase environment variables");
}

const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
};

export async function getClaims(): Promise<Claim[]> {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/claims?order=created_at.desc`, {
        method: "GET",
        headers,
        cache: "no-store",
    });
    if (!res.ok) {
        throw new Error(`Failed to fetch claims: ${res.statusText}`);
    }
    return res.json();
}

export async function saveClaims(claims: Claim[]): Promise<void> {
    // Only used conceptually now; each claim is inserted individually via insertClaim
}

export async function insertClaim(claim: Claim): Promise<Claim> {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/claims`, {
        method: "POST",
        headers,
        body: JSON.stringify(claim)
    });
    if (!res.ok) {
        throw new Error(`Failed to insert claim: ${res.statusText}`);
    }
    const data = await res.json();
    return data[0];
}

export async function getClaimById(id: string): Promise<Claim | undefined> {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/claims?id=eq.${id}`, {
        method: "GET",
        headers,
        cache: "no-store",
    });
    if (!res.ok) {
        throw new Error(`Failed to fetch claim by id: ${res.statusText}`);
    }
    const data = await res.json();
    return data[0];
}

export async function updateClaim(
    id: string,
    updates: Partial<Claim>
): Promise<Claim | null> {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/claims?id=eq.${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(updates)
    });
    if (!res.ok) {
        throw new Error(`Failed to update claim: ${res.statusText}`);
    }
    const data = await res.json();
    return data[0] || null;
}
