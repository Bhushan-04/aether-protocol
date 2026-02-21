import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getClaimById, updateClaim } from "@/lib/db";
import lighthouse from "@lighthouse-web3/sdk";

const BROADCAST_LOG_PATH = path.join(process.cwd(), "broadcast.log");

// POST /api/broadcast — Write verdict to broadcast.log, upload to Lighthouse, and notify via Discord
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        const claim = await getClaimById(id);
        if (!claim) {
            return NextResponse.json(
                { error: "Claim not found" },
                { status: 404 }
            );
        }

        let cid = claim.cid;

        // 1. Upload to Lighthouse IPFS
        const apiKey = process.env.LIGHTHOUSE_API_KEY;
        if (apiKey) {
            try {
                const claimDataString = JSON.stringify(claim, null, 2);
                console.log(`Uploading claim ${id} to Lighthouse...`);
                // Upload text to Lighthouse
                const response = await lighthouse.uploadText(claimDataString, apiKey);

                if (response && response.data && response.data.Hash) {
                    cid = response.data.Hash;
                    console.log(`Successfully uploaded to Lighthouse. New CID: ${cid}`);
                } else {
                    console.warn("Lighthouse upload successful but no Hash returned:", response);
                }
            } catch (lighthouseError) {
                console.error("Failed to upload to Lighthouse:", lighthouseError);
                // Continue with the broadcast even if IPFS upload fails
            }
        } else {
            console.warn("LIGHTHOUSE_API_KEY not found. Skipping IPFS upload.");
        }

        // Format broadcast payload
        const divider = "═".repeat(60);
        const timestamp = new Date().toISOString();
        const verdict = claim.status === "VERIFIED" ? "✅ VERIFIED" : "❌ DEBUNKED";

        const payload = `
${divider}
📡 NOCAP-AI BROADCAST
${divider}
🕐 Timestamp: ${timestamp}
🆔 Claim ID:  ${claim.id}
🔗 CID:       ${cid}
${divider}
📝 CLAIM:
"${claim.claim_text}"
${claim.source_url ? `🌐 Source: ${claim.source_url}` : ""}
${divider}
${verdict} — Truth Score: ${claim.analysis_results?.truth_score ?? "N/A"}/100

🚩 Propaganda Flags:
${claim.analysis_results?.propaganda_flags
                ?.map((f) => `   • ${f}`)
                .join("\n") || "   None detected"
            }

📊 Analysis Summary:
${claim.analysis_results?.summary || "No analysis available"}
${divider}

`;

        // Append to broadcast.log
        await fs.appendFile(BROADCAST_LOG_PATH, payload, "utf-8");

        // Update status to BROADCASTED and update CID in DB
        await updateClaim(id, { status: "BROADCASTED", cid });

        // 2. Discord Webhook Notification
        const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
        if (discordWebhookUrl) {
            try {
                await fetch(discordWebhookUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        content: `**New nocap-ai Broadcast**\n\`\`\`text\n${payload}\n\`\`\``
                    }),
                });
                console.log("Successfully sent Discord notification.");
            } catch (discordError) {
                console.error("Failed to send Discord notification:", discordError);
            }
        } else {
            console.warn("DISCORD_WEBHOOK_URL not found. Skipping Discord notification.");
        }

        console.log(`📡 Broadcast complete for claim ${id}`);

        return NextResponse.json({ success: true, broadcast: "logged", cid });
    } catch (error) {
        console.error("Error broadcasting claim:", error);
        return NextResponse.json(
            { error: "Failed to broadcast claim" },
            { status: 500 }
        );
    }
}
