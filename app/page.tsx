"use client";

import { useState, useCallback, useRef } from "react";
import { ConnectKitButton } from "connectkit";
import { useAccount, useSignMessage } from "wagmi";

type ProcessStage = "IDLE" | "EDGE_INGESTION" | "ANCHORING_FILECOIN" | "ORCHESTRATION" | "PRIVATE_COMPUTE" | "COMPLETED" | "ERROR";

export default function Home() {
  const [stage, setStage] = useState<ProcessStage>("IDLE");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cid, setCid] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isConnected, address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    // 127 bytes is the minimum for Synapse/Cloudflare Worker
    if (selectedFile.size < 127) {
      setErrorMsg("File too small. Minimum 127 bytes required for decentralized anchoring.");
      return;
    }
    // < 5MB for demo
    if (selectedFile.size > 5 * 1024 * 1024) {
      setErrorMsg("File too large for demo. Please keep it under 5MB.");
      return;
    }
    setFile(selectedFile);
    setErrorMsg("");
    setStage("IDLE");
    setCid("");
    setResult(null);
  };

  const resetAll = () => {
    setFile(null);
    setStage("IDLE");
    setCid("");
    setResult(null);
    setErrorMsg("");
  };

  const startPipeline = async () => {
    if (!file) return;
    if (!isConnected) {
      setErrorMsg("Please connect your wallet to authorize ingestion.");
      return;
    }

    setStage("EDGE_INGESTION");
    setErrorMsg("");

    try {
      // 0. Self-Sovereign Authorization (Cryptographic Signature)
      console.log(`[Self-Sovereignty] Requesting signature from ${address}...`);
      const signature = await signMessageAsync({
        message: `Authorize Aether Protocol to process and anchor this sensitive data (Digest: ${file.name}-${file.size}).`,
      });
      console.log(`[Self-Sovereignty] Consent Verified. Signature: ${signature.slice(0, 20)}...`);
      // 1. Production Edge Ingestion (Cloudflare Worker)
      const workerUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL;
      if (!workerUrl) throw new Error("Cloudflare Worker URL not configured in .env.local");

      console.log(`[Aether-Edge] Routing ingestion to: ${workerUrl}`);
      console.log(`[Aether-Edge] File: ${file.name}, Size: ${file.size}, User: ${address}`);

      const uploadRes = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'user-id': address || 'Aether-User',
          'x-file-name': file.name
        },
        body: file // Direct binary stream supported by the worker
      });

      if (!uploadRes.ok) {
        let errorDetail = "";
        try {
          const errorData = await uploadRes.json();
          errorDetail = errorData.message || errorData.error || "";
        } catch (e) {
          // Fallback if not JSON
        }
        throw new Error(`Edge Ingestion failed (${uploadRes.status})${errorDetail ? ': ' + errorDetail : ''}.`);
      }
      const uploadData = await uploadRes.json();

      setStage("ANCHORING_FILECOIN");
      setCid(uploadData.cid);

      // Brief pause for UI transition
      await new Promise(r => setTimeout(r, 1000));

      // 2. OpenServ Orchestration (Event Router)
      setStage("ORCHESTRATION");
      const orchRes = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event: 'FILE_ANCHORED',
          cid: uploadData.cid,
          metadata: { timestamp: new Date().toISOString() }
        })
      });

      if (!orchRes.ok) throw new Error("Orchestration routing failed");
      const orchData = await orchRes.json();

      // Brief pause for UI transition
      await new Promise(r => setTimeout(r, 1000));

      // 3. Aether Compute (Secure Enclave)
      setStage("PRIVATE_COMPUTE");
      const computeRes = await fetch('/api/compute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cid: uploadData.cid,
          original_name: file.name
        })
      });

      if (!computeRes.ok) throw new Error("Private compute failed");
      const computeData = await computeRes.json();

      // 4. Final Result Display
      setResult(computeData.result);
      setStage("COMPLETED");

    } catch (err: any) {
      setStage("ERROR");
      setErrorMsg(err.message || "An error occurred during the pipeline.");
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-300 font-sans selection:bg-purple-500/30">
      {/* Background Glow */}
      <div className="fixed inset-0 z-0 flex items-center justify-center opacity-30 pointer-events-none">
        <div className="w-[800px] h-[800px] bg-purple-900/20 rounded-full blur-[120px]"></div>
        <div className="w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[100px] absolute -top-20 -right-20"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-24">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="flex justify-between items-center mb-8">
            <div className="px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-medium tracking-wide">
              ZK Intelligence Framework
            </div>
            <ConnectKitButton />
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 text-white drop-shadow-lg">
            Aether Protocol
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-slate-400">
            The Self-Sovereign Autonomous Intelligence Agency. <br />
            Process highly sensitive data privately. Immutable storage. Ephemeral compute.
          </p>
        </header>

        <main className="grid md:grid-cols-2 gap-10 items-start">
          {/* LEFT: Upload Zone */}
          <section className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secure Data Ingestion
            </h2>

            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[250px]
                  ${isDragging ? "border-purple-500 bg-purple-500/10" : "border-slate-700 hover:border-purple-500/50 hover:bg-slate-800/50"}`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-inner">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-white font-medium text-lg mb-1">Upload Sensitive File</p>
                <p className="text-sm text-slate-500">Drag & drop or click to browse</p>
              </div>
            ) : (
              <div className="border border-slate-700 bg-slate-800/50 rounded-xl p-6 flex flex-col h-[250px]">
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <svg className="w-12 h-12 text-purple-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-white font-medium truncate max-w-[250px]">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={resetAll}
                    className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium transition-colors"
                  >
                    {stage === "COMPLETED" ? "New Ingestion" : "Reset"}
                  </button>
                  <button
                    onClick={startPipeline}
                    disabled={stage !== "IDLE"}
                    className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)] text-sm font-medium transition-all disabled:opacity-50 disabled:shadow-none font-semibold flex justify-center items-center gap-2"
                  >
                    {stage === "IDLE" ? "Deploy Agent Pipeline" : stage === "COMPLETED" ? "Inference Finalized" : "Processing..."}
                  </button>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                {errorMsg}
              </div>
            )}
          </section>

          {/* RIGHT: Pipeline Orchestration & Results */}
          <section className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl flex flex-col h-full">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Live Telemetry
            </h2>

            <div className="space-y-6 flex-1 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent flex flex-col justify-center">

              <StepItem
                title="1. Edge Ingestion"
                desc="Cloudflare Worker securely receives bits"
                status={stage === "IDLE" ? "pending" : ["EDGE_INGESTION"].includes(stage) ? "active" : "success"}
              />

              <StepItem
                title="2. Decentralized Anchoring"
                desc="Synapse SDK pins ciphertext to Filecoin"
                cid={cid}
                status={["IDLE", "EDGE_INGESTION"].includes(stage) ? "pending" : stage === "ANCHORING_FILECOIN" ? "active" : "success"}
              />

              <StepItem
                title="3. Event Orchestration"
                desc="OpenServ Hub routes task to Knowledge Sub-Agent"
                status={["IDLE", "EDGE_INGESTION", "ANCHORING_FILECOIN"].includes(stage) ? "pending" : stage === "ORCHESTRATION" ? "active" : "success"}
              />

              <StepItem
                title="4. Private Compute Engine"
                desc="Aether ephemeral environment processes data"
                status={["IDLE", "EDGE_INGESTION", "ANCHORING_FILECOIN", "ORCHESTRATION"].includes(stage) ? "pending" : stage === "PRIVATE_COMPUTE" ? "active" : "success"}
              />

            </div>

            {/* Results Output */}
            <div className={`mt-8 pt-6 border-t border-slate-700/50 transition-all duration-500 ${stage === "COMPLETED" ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none hidden'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">DePIN Agent Output</h3>
                {stage === "COMPLETED" && (
                  <button onClick={resetAll} className="text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-3 py-1 rounded-full border border-purple-500/30 transition-all">
                    Upload Another
                  </button>
                )}
              </div>
              <div className="bg-[#0f1423] rounded-lg p-5 font-mono text-sm border border-slate-800 relative group overflow-hidden">
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 left-0"></div>
                <pre className="text-green-400 whitespace-pre-wrap word-break">
                  {result ? JSON.stringify(result, null, 2) : ""}
                </pre>
              </div>
            </div>

          </section>
        </main>
      </div>
    </div>
  );
}

function StepItem({ title, desc, status, cid }: { title: string, desc: string, status: "pending" | "active" | "success", cid?: string }) {
  return (
    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
      {/* Icon Node */}
      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#030712] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors duration-500
        ${status === 'active' ? 'bg-purple-500 outline outline-4 outline-purple-500/20' : status === 'success' ? 'bg-blue-500' : 'bg-slate-800'}`}>
        {status === 'success' ? (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        ) : status === 'active' ? (
          <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
        ) : (
          <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
        )}
      </div>

      {/* Content */}
      <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border transition-all duration-300
        ${status === 'active' ? 'bg-slate-800/80 border-purple-500/50 shadow-[0_0_15px_rgba(147,51,234,0.1)]' : status === 'success' ? 'bg-slate-800/30 border-slate-700/80 opacity-80' : 'bg-slate-800/20 border-slate-800 opacity-40'}
      `}>
        <h4 className={`font-semibold text-sm mb-1 ${status === 'active' ? 'text-purple-300' : 'text-slate-300'}`}>{title}</h4>
        <p className="text-xs text-slate-500">{desc}</p>
        {cid && (
          <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center gap-1">
            <span className="text-[10px] uppercase text-slate-500 font-bold bg-slate-800 px-1.5 py-0.5 rounded">CID</span>
            <span className="text-xs text-blue-400 font-mono truncate">{cid}</span>
          </div>
        )}
      </div>
    </div>
  )
}
