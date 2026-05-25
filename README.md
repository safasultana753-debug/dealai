# DealGauge — AI Sales Intelligence Platform

Know which deal will close before you pick up the phone.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Run locally
```bash
npm run dev
```
Open http://localhost:5173 in your browser.

### 3. Deploy to Vercel
1. Push this repo to GitHub
2. Go to vercel.com → New Project → Import your repo
3. Add environment variable: `ANTHROPIC_API_KEY` = your key from console.anthropic.com
4. Click Deploy

## Tech Stack
- React 18 + Vite
- Anthropic Claude API (claude-sonnet-4)
- Vercel (hosting + serverless functions)
- localStorage (data persistence)

## Project by
Safa Sultana — Bitsom x Masai PM Capstone 2025
