# VeritasStream 🔬📡

**VeritasStream** is a decentralized news truth machine. It's an autonomous fact-checking pipeline designed to capture, verify, archive, and broadcast news claims using decentralized truth protocols. 

Built with **Next.js** (App Router), styled with **Tailwind CSS**, and powered by **Supabase** for data persistence and **Lighthouse** for decentralized web3 storage.

---

## 🚀 Features

- **Claim Ingestion:** Submit any news claim or statement along with an optional source URL.
- **AI-Powered Analysis Pipeline:** Once a claim is submitted, it enters an analysis queue (Pending -> Analyzing -> Verified/Debunked -> Broadcasted).
- **Truth Scoring & Propaganda Flags:** Each claim receives a computed Truth Score (out of 100) and highlights detected propaganda techniques (e.g., Emotional manipulation, Straw man arguments).
- **Decentralized Archiving:** Claims are tied to a Content Identifier (CID).
- **Live Verification Feed:** A real-time, auto-polling dashboard showcasing the latest verified and debunked claims.
- **Premium Dark UI:** Designed with a sleek, glowing glassmorphism aesthetic.

---

## 🛠 Tech Stack

- **Framework:** [Next.js 15+](https://nextjs.org/) (React 19)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) & Custom Vanilla CSS (Glassmorphism & animations)
- **Database:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Web3 Storage:** [Lighthouse Web3 SDK](https://www.lighthouse.storage/)
- **Icons & Fonts:** Custom SVGs, `next/font/google` (Inter)

---

## 🖥 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 1. Clone the repository

```bash
git clone https://github.com/Bhushan-04/nocap-ai.git
cd nocap-ai
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory and add your Supabase and Lighthouse credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
# Add other required API keys for Lighthouse and your AI pipeline
```

*Note: `.env.local` is ignored by git to keep your secrets safe.*

### 4. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the live feed.

---

## 🗄 Database Schema

The application expects a `claims` table in Supabase. You can find the raw SQL schema needed to set this up in `supabase_schema.sql` at the root of the project.

```sql
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY,
    claim_text TEXT NOT NULL,
    source_url TEXT,
    cid TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'ANALYZING', 'VERIFIED', 'DEBUNKED', 'BROADCASTED')),
    analysis_results JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

---

*Phase 2: Live Pipeline • Decentralized • Built for Truth*
