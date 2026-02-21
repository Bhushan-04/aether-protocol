"use client";

import { useState, useEffect, useCallback } from "react";
import { Claim, ClaimStatus } from "@/lib/types";

/* ───────────────────────────────────────────────
   STATUS BADGE
   ─────────────────────────────────────────────── */

function StatusBadge({ status }: { status: ClaimStatus }) {
  const map: Record<ClaimStatus, { label: string; cls: string; icon: string }> =
  {
    PENDING: { label: "Pending", cls: "status-pending", icon: "⏳" },
    ANALYZING: { label: "Analyzing", cls: "status-analyzing", icon: "🔍" },
    VERIFIED: { label: "Verified", cls: "status-verified", icon: "✅" },
    DEBUNKED: { label: "Debunked", cls: "status-debunked", icon: "❌" },
    BROADCASTED: {
      label: "Broadcasted",
      cls: "status-broadcasted",
      icon: "📡",
    },
  };

  const { label, cls, icon } = map[status] || map.PENDING;

  return (
    <span className={`status-badge ${cls}`}>
      {icon} {label}
    </span>
  );
}

/* ───────────────────────────────────────────────
   TRUTH SCORE BAR
   ─────────────────────────────────────────────── */

function TruthScoreBar({ score }: { score: number }) {
  const barClass =
    score >= 65 ? "truth-bar-high" : score >= 40 ? "truth-bar-medium" : "truth-bar-low";

  return (
    <div className="flex items-center gap-3 w-full">
      <div className="truth-bar-track flex-1">
        <div
          className={`truth-bar-fill ${barClass}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span
        className="text-sm font-bold tabular-nums"
        style={{
          color:
            score >= 65
              ? "var(--vs-accent-green)"
              : score >= 40
                ? "var(--vs-accent-amber)"
                : "var(--vs-accent-red)",
        }}
      >
        {score}/100
      </span>
    </div>
  );
}

/* ───────────────────────────────────────────────
   CLAIM CARD
   ─────────────────────────────────────────────── */

function ClaimCard({
  claim,
  index,
}: {
  claim: Claim;
  index: number;
}) {
  const hasResults = claim.analysis_results && claim.status !== "PENDING" && claim.status !== "ANALYZING";

  return (
    <div
      className="glass-card p-6 animate-fade-in-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-base leading-relaxed" style={{ color: "var(--vs-text-primary)" }}>
            &ldquo;{claim.claim_text}&rdquo;
          </p>
          {claim.source_url && (
            <a
              href={claim.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs hover:underline"
              style={{ color: "var(--vs-accent-cyan)" }}
            >
              🌐 {claim.source_url}
            </a>
          )}
        </div>
        <StatusBadge status={claim.status} />
      </div>

      {/* Meta Row */}
      <div
        className="flex flex-wrap items-center gap-4 text-xs mb-4"
        style={{ color: "var(--vs-text-muted)" }}
      >
        <span>🆔 {claim.id.slice(0, 8)}...</span>
        <span>🔗 {claim.cid}</span>
        <span>🕐 {new Date(claim.created_at).toLocaleString()}</span>
      </div>

      {/* Analysis Results */}
      {hasResults && claim.analysis_results && (
        <div
          className="pt-4 mt-4"
          style={{ borderTop: "1px solid var(--vs-border)" }}
        >
          {/* Truth Score */}
          <div className="mb-4">
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--vs-text-secondary)" }}>
              Truth Score
            </p>
            <TruthScoreBar score={claim.analysis_results.truth_score} />
          </div>

          {/* Propaganda Flags */}
          {claim.analysis_results.propaganda_flags.length > 0 && (
            <div className="mb-4">
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--vs-text-secondary)" }}>
                🚩 Propaganda Flags
              </p>
              <div className="flex flex-wrap gap-2">
                {claim.analysis_results.propaganda_flags.map((flag, i) => (
                  <span key={i} className="flag-tag">
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--vs-text-secondary)" }}>
              📊 Analysis Summary
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--vs-text-secondary)" }}>
              {claim.analysis_results.summary}
            </p>
          </div>
        </div>
      )}

      {/* Analyzing Shimmer */}
      {claim.status === "ANALYZING" && (
        <div className="mt-4 rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="h-2 animate-shimmer" />
          <p
            className="text-xs text-center py-3"
            style={{ color: "var(--vs-accent-cyan)" }}
          >
            🧠 AI Brain is analyzing this claim...
          </p>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────
   CLAIM INPUT FORM
   ─────────────────────────────────────────────── */

function ClaimInput({ onSubmit }: { onSubmit: () => void }) {
  const [claimText, setClaimText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Auto-clear success feedback after 5 seconds
  useEffect(() => {
    if (feedback?.type === "success") {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimText.trim() || submitting) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim_text: claimText,
          source_url: sourceUrl || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({
          type: "success",
          msg: `Claim ingested! CID: ${data.cid} — Verification starting...`,
        });
        setClaimText("");
        setSourceUrl("");
        onSubmit();
      } else {
        setFeedback({ type: "error", msg: data.error || "Submission failed" });
      }
    } catch {
      setFeedback({ type: "error", msg: "Network error — please try again" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl animate-float">🔬</span>
        <h2 className="text-lg font-bold" style={{ color: "var(--vs-text-primary)" }}>
          Submit a Claim for Verification
        </h2>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="claim-text"
            className="block text-xs uppercase tracking-wider mb-2 font-medium"
            style={{ color: "var(--vs-text-secondary)" }}
          >
            News Claim / Statement
          </label>
          <textarea
            id="claim-text"
            className="vs-input"
            rows={3}
            placeholder='e.g. "The government has banned all cryptocurrency trading effective immediately."'
            value={claimText}
            onChange={(e) => {
              setClaimText(e.target.value);
              if (feedback) setFeedback(null);
            }}
            onFocus={() => {
              if (feedback) setFeedback(null);
            }}
            required
            style={{ resize: "vertical", minHeight: "80px" }}
          />
        </div>

        <div>
          <label
            htmlFor="source-url"
            className="block text-xs uppercase tracking-wider mb-2 font-medium"
            style={{ color: "var(--vs-text-secondary)" }}
          >
            Source URL <span style={{ color: "var(--vs-text-muted)" }}>(optional)</span>
          </label>
          <input
            id="source-url"
            type="url"
            className="vs-input"
            placeholder="https://example.com/article"
            value={sourceUrl}
            onChange={(e) => {
              setSourceUrl(e.target.value);
              if (feedback) setFeedback(null);
            }}
            onFocus={() => {
              if (feedback) setFeedback(null);
            }}
          />
        </div>

        <button
          type="submit"
          className="vs-btn-primary w-full md:w-auto"
          disabled={!claimText.trim() || submitting}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⚙️</span> Ingesting...
            </span>
          ) : (
            "⚡ Verify Claim"
          )}
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className="mt-4 p-3 rounded-lg text-sm"
          style={{
            background:
              feedback.type === "success"
                ? "rgba(0, 230, 118, 0.08)"
                : "rgba(255, 23, 68, 0.08)",
            color:
              feedback.type === "success"
                ? "var(--vs-accent-green)"
                : "var(--vs-accent-red)",
            border: `1px solid ${feedback.type === "success"
              ? "rgba(0, 230, 118, 0.2)"
              : "rgba(255, 23, 68, 0.2)"
              }`,
          }}
        >
          {feedback.msg}
        </div>
      )}
    </form>
  );
}

/* ───────────────────────────────────────────────
   STATS BAR
   ─────────────────────────────────────────────── */

function StatsBar({ claims }: { claims: Claim[] }) {
  const total = claims.length;
  const verified = claims.filter((c) => c.status === "VERIFIED" || c.status === "BROADCASTED").length;
  const debunked = claims.filter((c) => c.status === "DEBUNKED").length;
  const analyzing = claims.filter(
    (c) => c.status === "ANALYZING" || c.status === "PENDING"
  ).length;

  const stats = [
    { label: "Total Claims", value: total, color: "var(--vs-accent-cyan)" },
    { label: "Verified", value: verified, color: "var(--vs-accent-green)" },
    { label: "Debunked", value: debunked, color: "var(--vs-accent-red)" },
    { label: "Processing", value: analyzing, color: "var(--vs-accent-amber)" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="glass-card p-4 text-center">
          <p className="text-2xl font-bold tabular-nums" style={{ color: stat.color }}>
            {stat.value}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--vs-text-muted)" }}>
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────────────────────────────
   MAIN PAGE
   ─────────────────────────────────────────────── */

export default function Home() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClaims = useCallback(async () => {
    try {
      const res = await fetch("/api/claim");
      const data = await res.json();
      if (data.claims) {
        setClaims(data.claims);
      }
    } catch (err) {
      console.error("Failed to fetch claims:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling every 2 seconds
  useEffect(() => {
    fetchClaims();
    const interval = setInterval(fetchClaims, 2000);
    return () => clearInterval(interval);
  }, [fetchClaims]);

  return (
    <div className="min-h-screen bg-grid-pattern">
      {/* ── HERO ───────────────────────── */}
      <header className="relative pt-16 pb-12 md:pt-24 md:pb-16 px-4">
        {/* Background glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-20 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse, rgba(0,229,255,0.3), transparent 70%)",
            filter: "blur(80px)",
          }}
        />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full text-xs font-medium"
            style={{
              background: "rgba(0, 229, 255, 0.06)",
              border: "1px solid rgba(0, 229, 255, 0.15)",
              color: "var(--vs-accent-cyan)",
            }}
          >
            <span className="animate-pulse-glow">●</span>
            Decentralized Truth Protocol — Phase 2 (Live)
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
            <span className="gradient-text animate-gradient">nocap</span>
            <span style={{ color: "var(--vs-text-primary)" }}>-ai</span>
          </h1>

          <p
            className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
            style={{ color: "var(--vs-text-secondary)" }}
          >
            Autonomous fact-checking pipeline that captures, verifies, archives,
            and broadcasts news claims.{" "}
            <span className="gradient-text font-semibold">
              Powered by decentralized truth.
            </span>
          </p>
        </div>
      </header>

      {/* ── MAIN CONTENT ──────────────── */}
      <main className="max-w-4xl mx-auto px-4 pb-20 space-y-8">
        {/* Claim Input */}
        <section>
          <ClaimInput onSubmit={fetchClaims} />
        </section>

        {/* Stats */}
        {claims.length > 0 && (
          <section className="animate-fade-in-up">
            <StatsBar claims={claims} />
          </section>
        )}

        {/* Feed Header */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold" style={{ color: "var(--vs-text-primary)" }}>
                📡 Verification Feed
              </h2>
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{
                  background: "rgba(0, 229, 255, 0.06)",
                  color: "var(--vs-accent-cyan)",
                }}
              >
                Live
              </span>
            </div>
            {claims.length > 0 && (
              <span className="text-xs" style={{ color: "var(--vs-text-muted)" }}>
                {claims.length} claim{claims.length !== 1 ? "s" : ""} processed
              </span>
            )}
          </div>

          {/* Claims List */}
          {loading ? (
            <div className="glass-card p-12 text-center">
              <p className="text-lg animate-pulse-glow" style={{ color: "var(--vs-accent-cyan)" }}>
                ⏳ Loading claims...
              </p>
            </div>
          ) : claims.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <p className="text-4xl mb-4">🔬</p>
              <p className="text-lg font-medium mb-2" style={{ color: "var(--vs-text-secondary)" }}>
                No claims yet
              </p>
              <p className="text-sm" style={{ color: "var(--vs-text-muted)" }}>
                Submit a news claim above to start the decentralized verification pipeline.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {claims.map((claim, i) => (
                <ClaimCard key={claim.id} claim={claim} index={i} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── FOOTER ────────────────────── */}
      <footer
        className="text-center py-8 text-xs"
        style={{
          color: "var(--vs-text-muted)",
          borderTop: "1px solid var(--vs-border)",
        }}
      >
        <p>
          <span className="gradient-text font-semibold">nocap-ai</span> —
          Decentralized News Truth Machine
        </p>
        <p className="mt-1">Phase 2: Live Pipeline • Decentralized • Built for Truth</p>
      </footer>
    </div>
  );
}
