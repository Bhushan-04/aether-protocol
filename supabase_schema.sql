-- Supabase Schema for nocap-ai Claims
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY,
    claim_text TEXT NOT NULL,
    source_url TEXT,
    cid TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'ANALYZING', 'VERIFIED', 'DEBUNKED', 'BROADCASTED')),
    analysis_results JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) but allow anonymous reads if needed, or keeping it closed.
-- Since we are mostly interacting via backend API using Service Role Key, RLS can be enabled without explicit policies for public.
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
