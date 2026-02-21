// nocap-ai — Core Type Definitions

export type ClaimStatus =
  | "PENDING"
  | "ANALYZING"
  | "VERIFIED"
  | "DEBUNKED"
  | "BROADCASTED";

export interface AnalysisResults {
  truth_score: number; // 0-100
  propaganda_flags: string[];
  summary: string;
}

export interface Claim {
  id: string;
  claim_text: string;
  source_url?: string;
  cid: string; // IPFS Content Identifier (mocked in Phase 1)
  status: ClaimStatus;
  analysis_results?: AnalysisResults;
  created_at: string; // ISO 8601 timestamp
}
