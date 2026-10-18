# Lead Intel — AI Competitive Intelligence & Enrichment

A full-stack AI research tool that enriches company domains on demand. Users input a list of domains, and the app uses web research to generate structured intelligence profiles, scoring each company against an Ideal Customer Profile (ICP).

**Live Demo:** https://lead-intel-engine.lovable.app

## 🚀 Features

- **Automated Web Research:** Uses the Parallel API to scrape and research live company data.
- **Structured Enrichment:** Extracts company description, industry, estimated headcount, funding info, and key contacts.
- **ICP Fit Scoring:** Automatically scores companies (0–100) against a predefined B2B SaaS Ideal Customer Profile.
- **Source Citations:** Every data point includes a source link and a confidence badge (High/Medium/Low).
- **Real-time Updates:** Results stream in via Supabase Realtime as each domain finishes processing.

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS
- **Database:** Supabase (PostgreSQL + Realtime)
- **AI/Research:** Parallel Connector (Managed by Lovable)

## 📦 Run Locally

If you want to run this project locally:

1. Clone the repo:

   ```bash
   git clone https://github.com/Xhenzouu/lead-intel-engine.git
   cd lead-intel-engine
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up your `.env` file with your Supabase credentials and Parallel API key (if not using Lovable's managed connector).

4. Start the development server:

   ```bash
   npm run dev
   ```
