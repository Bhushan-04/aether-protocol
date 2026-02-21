import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getClaims, insertClaim } from "@/lib/db";
import { Claim } from "@/lib/types";

// GET /api/claim — Return all claims (for feed polling)
export async function GET() {
    try {
        const claims = await getClaims();
        // Return newest first (fallback if API doesn't order them)
        claims.sort(
            (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        return NextResponse.json({ claims });
    } catch (error) {
        console.error("Error fetching claims:", error);
        return NextResponse.json(
            { error: "Failed to fetch claims" },
            { status: 500 }
        );
    }
}

// POST /api/claim — Ingest a new claim
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { claim_text, source_url } = body;

        if (!claim_text || typeof claim_text !== "string" || !claim_text.trim()) {
            return NextResponse.json(
                { error: "claim_text is required" },
                { status: 400 }
            );
        }

        const id = uuidv4();
        const cidPrefix = id.split("-")[0];

        const newClaim: Claim = {
            id,
            claim_text: claim_text.trim(),
            source_url: source_url?.trim() || undefined,
            cid: `pending-ipfs-${cidPrefix}`,
            status: "PENDING",
            created_at: new Date().toISOString(),
        };

        await insertClaim(newClaim);

        // Fire-and-forget: trigger verification asynchronously
        const baseUrl =
            process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        fetch(`${baseUrl}/api/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        }).catch((err) => console.error("Failed to trigger verify:", err));

        return NextResponse.json(
            { id: newClaim.id, cid: newClaim.cid, status: newClaim.status },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating claim:", error);
        return NextResponse.json(
            { error: "Failed to create claim" },
            { status: 500 }
        );
    }
}
