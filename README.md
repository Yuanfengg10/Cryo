# CryoLeads

Mobile-first solo sales command centre for selling premium cryotherapy equipment into Singapore and Malaysia through WhatsApp.

The product direction is now expanding beyond general wellness into a stronger longevity and biohacking sales motion, especially around flagship products such as the HaloX longevity capsule and Antarctica cryotherapy chamber.

## What This Repo Contains

This is the first MVP foundation:

- `Next.js` app shell with a mobile-friendly dashboard
- `Supabase`-ready data model and schema
- mock lead data to shape the workflow before wiring live APIs
- setup docs for Vercel, Supabase, Anthropic, and Google Places

## Recommended Stack

- Frontend: Next.js App Router
- Hosting: Vercel
- Database: Supabase Postgres
- Scheduled jobs: Supabase cron / Edge Functions
- AI copy + reply scoring: Anthropic API
- Lead sourcing: Google Places API
- Outreach: WhatsApp deep links (`wa.me`) for manual send

## Local Development

1. Install dependencies
```bash
npm install
```

2. Copy environment variables
```bash
cp .env.example .env.local
```

3. Start the app
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
GOOGLE_PLACES_API_KEY=
CRON_SECRET=
```

The current UI works without these values because it uses mock data until we wire the backend.

`GOOGLE_PLACES_API_KEY` now powers the sourcing review panel when present. Without it, the app falls back to placeholder candidate leads so the UI still works.

## Database

The initial Supabase schema is in [supabase/schema.sql](/Users/yuanfeng/Documents/Claude/Projects/CryoLeads/Cryo/supabase/schema.sql).

It includes:

- `leads`
- `conversation_events`
- `follow_up_tasks`
- `message_generations`
- `activity_log`

## Suggested Build Order

1. Connect Supabase and run the schema.
2. Replace mock data with live lead queries.
3. Add lead detail and reply logging flows.
4. Add Anthropic-powered message generation.
5. Add Google Places import job.
6. Add follow-up scheduling and analytics rollups.

## Google Places Setup

When you are ready to enable live sourcing:

1. Create or use an existing Google Cloud project.
2. Enable the Places API.
3. Create an API key.
4. Put it into `.env.local` as:

```bash
GOOGLE_PLACES_API_KEY=your_key_here
```

5. Restart `npm run dev`

The sourcing panel will then attempt live search queries for longevity clinics, biohacking centres, and related targets in Singapore and Malaysia.

## Daily Automation

The app now includes a cron-ready daily sourcing endpoint:

- `GET /api/automation/daily-source`

For local testing, use the `Run sourcing now` button in the dashboard.

For production:

1. Set `CRON_SECRET` in your environment.
2. Deploy the repo to Vercel.
3. Keep [vercel.json](/Users/yuanfeng/Documents/Claude/Projects/CryoLeads/Cryo/vercel.json) in the repo so Vercel runs the job every day at `09:00 Singapore time` (`01:00 UTC`).
4. Add the same `CRON_SECRET` value in Vercel Project Settings → Environment Variables.

The daily run respects the in-app quota and auto-add threshold, so it should add up to 20 qualified leads per day.

Important: the dashboard sourcing panel is now preview-only. It shows what the agent has found, but it does not auto-import on page load. Real importing only happens when:

- you click `Run sourcing now`
- or Vercel Cron hits `/api/automation/daily-source`

## Hosting Suggestion

`Vercel + Supabase` is still the best fit for this product:

- low ops for a solo app
- fast deploys
- easy cron and serverless patterns
- simple mobile web delivery

If later you need heavier background jobs, we can move scheduled workflows into a dedicated worker without rebuilding the UI.
