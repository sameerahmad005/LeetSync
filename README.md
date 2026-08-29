# LeetSync ⚡

[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon%2FSupabase-4169E1?style=flat-square&logo=postgresql)](https://neon.tech)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**LeetSync** automatically monitors your LeetCode profile and synchronizes accepted solutions directly into your target GitHub repository with clean folder structures, problem descriptions, complexity analysis, and auto-generated repository statistics.

Built for **100% Free-Tier Architecture** using Next.js 15 App Router, Prisma ORM, PostgreSQL (Neon / Supabase), and GitHub Actions.

---

## 🏗️ 100% Free-Tier System Architecture

```text
                           ┌───────────────────────────┐
                           │          Vercel           │
                           │                           │
                           │  Next.js 15 App Router    │
                           │  Developer Dashboard UI   │
                           │  API Routes & Webhooks    │
                           │  GitHub OAuth Handler     │
                           └─────────────┬─────────────┘
                                         │
                                         ▼
                           ┌───────────────────────────┐
                           │    PostgreSQL Database    │
                           │   (Neon.tech / Supabase)  │
                           └─────────────┬─────────────┘
                                         ▲
                                         │
                           ┌─────────────┴─────────────┐
                           │   GitHub Actions Worker   │
                           │                           │
                           │  Daily Automated Cron     │
                           │  CLI Synchronization      │
                           └─────────────┬─────────────┘
                                         │
                             ┌───────────┴───────────┐
                             ▼                       ▼
                         LeetCode                GitHub
                    (GraphQL / Profile)     (Target Repository)
```

---

## ✨ Key Features

- ⚡ **Instant Watch Mode & Webhooks**: Auto-sync solutions in real-time as you solve them, or trigger via instant API webhooks.
- 📁 **Custom Directory Structure**: Customizable folder path patterns (`{rootDir}/{difficulty}/{problem-slug}`) and branch selection (`main`, `dev`, etc.).
- ➕ **In-App Repository Creator**: Create new GitHub repositories directly from the LeetSync UI with 1 click without leaving the app.
- 📦 **Batch Commit Strategy**: Consolidates multiple newly accepted solutions into a single clean Git commit to keep your repository history tidy.
- 📊 **Marker-Safe README Statistics**: Automatically generates and updates problem-solving progress tables inside `<!-- LEETSYNC:START -->` ... `<!-- LEETSYNC:END -->` without overwriting existing README content.
- 🔒 **Idempotency & Duplicate Prevention**: Uniqueness constraints (`userId`, `leetcodeSubmissionId`) prevent duplicate files or commits across retries.
- 👁️ **Dry-Run Preview**: Preview exact file paths and solution code before committing to GitHub.
- 🔐 **GitHub OAuth Security**: HTTP-only JWT sessions, state token validation, and secure access token storage.

---

## ⚡ Instant & Real-Time Syncing Options

LeetSync offers multiple ways to trigger instant synchronization whenever you solve a problem on LeetCode:

### Option 1: ⚡ Dashboard Instant Watch Mode (1-Click, Zero Setup)
1. Open your [LeetSync Dashboard](https://leet-sync-mauve.vercel.app/dashboard).
2. Click **`Enable Watch Mode (30s)`** at the top right while solving problems on LeetCode.
3. LeetSync runs in the background and automatically checks for new accepted solutions every **30 seconds**, instantly committing them to GitHub!

### Option 2: ⏰ Automated Webcron (cron-job.org / cron.org)
1. Click **`⚡ Instant Sync Setup`** on your Dashboard to get your personal Webhook URL:
   ```text
   https://leet-sync-mauve.vercel.app/api/sync?userId=YOUR_USER_ID
   ```
2. Create a free account on [cron-job.org](https://cron-job.org) or [cron.org](https://cron.org).
3. Set up a new HTTP request job pointing to your personal Webhook URL.
4. Set the execution schedule to **every 5 minutes or more** (e.g. 5, 10, or 15 minutes) for free continuous real-time synchronization.

---

## 🚀 Quick Start Guide (Local Development)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/sameerahmad005/LeetSync.git
cd LeetSync
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your configuration:

```env
DATABASE_URL="postgresql://neondb_owner:password@ep-xyz.neon.tech/neondb?sslmode=require"
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"
AUTH_SECRET="super-secret-at-least-32-characters-long-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Initialize Database Schema

```bash
npx prisma db push
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ 100% Free Production Deployment Guide

### 1. Create PostgreSQL Database (Neon or Supabase)

1. Create a free account at [Neon.tech](https://neon.tech) or [Supabase.com](https://supabase.com).
2. Create a new PostgreSQL database project.
3. Copy your database connection string (`DATABASE_URL`).

### 2. Register GitHub OAuth Application

1. Open [GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers).
2. Click **New OAuth App**.
3. Set **Application Name**: `LeetSync`.
4. Set **Homepage URL**: `https://your-app.vercel.app`.
5. Set **Authorization callback URL**: `https://your-app.vercel.app/api/auth/github/callback`.
6. Save and copy your **Client ID** and **Client Secret**.

### 3. Deploy to Vercel

1. Import your GitHub repository to [Vercel](https://vercel.com).
2. Add the following **Environment Variables**:
   - `DATABASE_URL`
   - `AUTH_SECRET` (minimum 32 characters)
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `NEXT_PUBLIC_APP_URL`
3. Click **Deploy**.

### 4. Enable Daily Automated GitHub Actions Workflow

1. Go to your repository on GitHub → **Settings** → **Secrets and variables** → **Actions**.
2. Add the repository secrets (`DATABASE_URL`, `AUTH_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL`).
3. Under the **Actions** tab, enable the workflow `.github/workflows/leetcode-sync.yml` to automatically run daily at 18:00 UTC.

---

## 🧪 Testing & Verification

```bash
npm run type-check   # Strict TypeScript type check (0 errors)
npm run test         # Run Vitest unit tests (36/36 passing)
npm run build        # Validate Next.js production build
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
