import { NextResponse } from 'next/server';
import lighthouse from '@lighthouse-web3/sdk';

// Remove edge runtime as Lighthouse SDK requires Node.js environment
// Forced reload timestamp: 2026-02-21T23:38:00
// export const runtime = 'edge';

// Real OpenServ Event Orchestrator
async function triggerOrchestrator(cid: string, fileName: string) {
    try {
        const webhookUrl = process.env.OPENSERV_WEBHOOK_URL;
        const apiKey = process.env.OPENSERV_API_KEY;
        const workspaceId = process.env.OPENSERV_WORKSPACE_ID;

        // 1. Prioritize Direct Webhook (Matches the specific workflow in OpenServ UI)
        if (webhookUrl) {
            console.log(`[OpenServ] Firing direct workflow webhook for CID: ${cid}`);
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: "FILE_ANCHORED",
                    cid,
                    fileName,
                    protocol: "Aether"
                })
            });
            if (response.ok) {
                console.log(`[OpenServ] Webhook Success: Triggered specific workflow.`);
                return;
            }
            console.warn(`[OpenServ] Webhook failed (${response.status}), trying general API fallback...`);
        }

        // 2. Fallback to General Workspace API (requires API Key + Workspace ID)
        if (!apiKey || !workspaceId) {
            console.warn("[OpenServ] Skipping orchestration: No Webhook URL or API Key/WorkspaceID found.");
            return;
        }

        console.log(`[OpenServ] Dispatching task via API for Workspace: ${workspaceId}`);
        const apiResponse = await fetch(`https://api.openserv.ai/workspaces/${workspaceId}/task`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                task: `Aether Protocol: Process and summarize the decentralized file anchored at IPFS CID: ${cid}. Source: ${fileName}`,
                metadata: { cid, fileName, protocol: "Aether" }
            })
        });

        if (apiResponse.ok) {
            console.log(`[OpenServ] General API Success: Task anchored.`);
        } else {
            const errorText = await apiResponse.text();
            console.error(`[OpenServ] API Hub Error (${apiResponse.status}):`, errorText.slice(0, 100));
        }
    } catch (err) {
        console.error("[OpenServ] Integration Failure:", err);
    }
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const apiKey = process.env.LIGHTHOUSE_API_KEY;
        if (!apiKey) {
            console.error("[Upload] LIGHTHOUSE_API_KEY is missing in environmental variables");
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        console.log(`[Upload] Received file: ${file.name}, Size: ${file.size} bytes`);
        console.log(`[Upload] Uploading to Filecoin via Lighthouse...`);

        // Convert File to Buffer for Lighthouse SDK
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Actual Lighthouse Upload
        const uploadResponse = await lighthouse.uploadBuffer(
            buffer,
            apiKey
        );

        if (!uploadResponse || !uploadResponse.data || !uploadResponse.data.Hash) {
            throw new Error("Lighthouse upload failed to return a Hash");
        }

        const cid = uploadResponse.data.Hash;
        console.log(`[Upload] Success! CID: ${cid}`);

        // Fire asynchronous event to Orchestrator (OpenServ)
        triggerOrchestrator(cid, file.name);

        return NextResponse.json({
            success: true,
            cid,
            message: "File encrypted and anchored to Filecoin."
        });

    } catch (error: any) {
        console.error("[Upload] Error:", error);
        return NextResponse.json(
            { error: "Failed to process Filecoin ingestion." },
            { status: 500 }
        );
    }
}
