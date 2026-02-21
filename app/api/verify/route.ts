import { NextRequest, NextResponse } from "next/server";
import { updateClaim, getClaimById } from "@/lib/db";
import { AnalysisResults } from "@/lib/types";

// POST /api/verify — Fact-checking engine with Llama
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

        // Set to ANALYZING
        await updateClaim(id, { status: "ANALYZING" });

        // Call local Ollama
        const prompt = `
You are an expert fact-checker and propaganda analyst.
Analyze the following claim and provide an assessment.
Claim: "${claim.claim_text}"

You must respond strictly with valid JSON conforming to the following structure:
{
  "truth_score": number (0-100, where 100 is completely true),
  "propaganda_flags": string[] (list of recognized propaganda techniques, if any),
  "summary": string (a strict factual summary of your analysis)
}
Return only JSON, nothing else.`;

        let analysis_results: AnalysisResults;
        try {
            const ollamaRes = await fetch("http://127.0.0.1:11434/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "llama3:latest",
                    prompt,
                    stream: false,
                    format: "json" // Force JSON output if supported
                })
            });

            if (!ollamaRes.ok) {
                throw new Error("Failed connecting to Ollama");
            }

            const ollamaData = await ollamaRes.json();
            analysis_results = JSON.parse(ollamaData.response);
        } catch (llmError) {
            console.error("LLM Error:", llmError);
            // Fallback mock analysis if LLM fails
            analysis_results = {
                truth_score: 50,
                propaganda_flags: ["ANALYSIS_FAILED"],
                summary: "Ollama model failed to analyze the claim."
            };
        }

        const status = analysis_results.truth_score >= 50 ? "VERIFIED" : "DEBUNKED";

        await updateClaim(id, { status, analysis_results });

        // Fire-and-forget: trigger broadcast
        const baseUrl =
            process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        fetch(`${baseUrl}/api/broadcast`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        }).catch((err) => console.error("Failed to trigger broadcast:", err));

        return NextResponse.json({ id, status, analysis_results });
    } catch (error) {
        console.error("Error verifying claim:", error);
        return NextResponse.json(
            { error: "Failed to verify claim" },
            { status: 500 }
        );
    }
}
