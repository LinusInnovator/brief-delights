# Directive: Landing & Admin Dashboard

## Goal
Maintain and extend the Next.js landing page and admin dashboard at `brief.delights.pro`. This directive captures all learnings about the deployment environment, database access patterns, and common pitfalls.

## Stack
- **Framework:** Next.js (App Router)
- **Language:** TypeScript / React
- **Hosting:** Netlify (with `@netlify/plugin-nextjs`)
- **Database:** Supabase (PostgreSQL)
- **AI Provider:** OpenRouter (Claude 3.5 Sonnet)
- **Source:** `landing/` directory

## Critical Rule: Prefer Client-Side Supabase

> **NEVER use API routes for Supabase CRUD operations.**
> The `SUPABASE_SERVICE_KEY` environment variable has persistent authentication issues on Netlify serverless functions. Always use the client-side Supabase client instead.

### ✅ DO: Direct client-side calls
```tsx
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const { data, error } = await supabase.from('table').select('*');
```

### ❌ DON'T: API route with service key
```ts
// This has failed repeatedly due to invalid API key errors
const supabase = createClient(url, process.env.SUPABASE_SERVICE_KEY!);
```

### When API Routes ARE Needed
Only use API routes (`app/api/`) when:
1. **External API calls** that need server-side secrets (e.g., OpenRouter API key)
2. **Webhook endpoints** that receive external requests
3. **Operations requiring server-side processing** (scraping, heavy computation)

For these cases, use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for any database operations within the route.

## Supabase Client
- **Location:** `landing/lib/supabase/client.ts`
- **Uses:** `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Import:** `import { createClient } from '@/lib/supabase/client'`
- **Both keys are public-facing** and work reliably in all contexts

## Key Database Tables
| Table | Purpose |
|-------|---------|
| `sponsored_content` | Partnership/sponsor management |
| `subscribers` | Newsletter subscriber list |
| `analytics_events` | Click/view tracking |

## Netlify Deployment

### Build Config
- **Build command:** Handled by `@netlify/plugin-nextjs`
- **Config file:** `netlify.toml`
- **Deploy:** Push to `main` branch triggers auto-deploy

### Critical Netlify Rules
1. **Do NOT add manual `/api/*` redirects** in `netlify.toml`. The Next.js plugin handles API routing automatically. Manual redirects conflict and cause 404s.
2. **Environment variables** must be set in Netlify dashboard (Site Settings → Environment Variables)
3. **Build time:** ~60-90 seconds. Wait for deploy to complete before testing.

### Available Environment Variables (Netlify)
| Variable | Status | Notes |
|----------|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Working | Public, used everywhere |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Working | Public, reliable |
| `SUPABASE_SERVICE_KEY` | ⚠️ Broken | DO NOT USE in API routes |
| `OPENROUTER_API_KEY` | ✅ Working | Used for AI generation |

## Admin Pages

### Partnership Manager (`/admin/partnerships`)
- **CRUD operations:** Direct Supabase client (no API routes)
- **AI generation:** Uses `/api/admin/partnerships/generate-from-url` (API route needed for OpenRouter key)
- **Features:** Quick Create from URL, manual create, edit, delete, schedule

### Sponsor Dashboard (`/admin/sponsors`)
- Analytics and sponsor management

## Development Patterns

### Adding a New Admin Feature
1. Create page in `landing/app/admin/[feature]/page.tsx`
2. Use `'use client'` directive (required for React state)
3. Import Supabase client: `import { createClient } from '@/lib/supabase/client'`
4. Use direct Supabase calls for all CRUD
5. Only create API routes if external API secrets are needed
6. Test locally with `npm run dev` before pushing

### Common Mistakes to Avoid
- ❌ Creating API routes for simple database CRUD
- ❌ Using `SUPABASE_SERVICE_KEY` in any context
- ❌ Adding redirect rules to `netlify.toml` for API routes
- ❌ Deploying without waiting for build completion
- ❌ Not adding error alerts to catch silent failures

## Self-Annealing Notes

### Issue: "Invalid API key" (Feb 2026)
- **Root cause:** `SUPABASE_SERVICE_KEY` not authenticating in Netlify functions
- **Fix:** Switched all CRUD to client-side `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Prevention:** Never use service key in this project

### Issue: API Route 404 (Feb 2026)
- **Root cause:** Manual `/api/*` redirect in `netlify.toml` conflicting with Next.js plugin
- **Fix:** Removed the redirect rule
- **Prevention:** Never add manual API redirects; let the plugin handle it

## Testing
```bash
# Local dev
cd landing && npm run dev

# Check deployed site
curl https://brief.delights.pro/admin/partnerships
```
