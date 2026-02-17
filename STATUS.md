# Status — The Letter

> Last updated: 2026-02-17 13:24 CET

## System Health

| Component | Status | Notes |
|-----------|--------|-------|
| **Daily Pipeline** | ✅ Running | GitHub Actions cron, 6 AM UTC weekdays |
| **Weekly Insights** | ✅ Running | GitHub Actions, Sundays |
| **Landing / Admin** | ✅ Deployed | Netlify at `brief.delights.pro` |
| **Sponsor System** | ✅ Operational | Discovery, scheduling, click tracking, smart pricing |
| **Supabase** | ✅ Connected | Subscribers, sponsors, analytics |
| **Subscriber Backend** | ✅ Supabase-only | Subscribe → verify → send, all via Supabase (no filesystem) |
| **Referral System** | ✅ Active | Personalized links, milestone progress bar, auto-increment triggers |

## Segments

| Segment | Feed Sources | Pipeline |
|---------|-------------|----------|
| Builders | 1,300+ RSS feeds (shared pool) | ✅ Select → Summarize → Compose → Send |
| Leaders | Same shared pool | ✅ |
| Innovators | Same shared pool | ✅ |

## Known Issues

| Issue | Severity | Status | Directive |
|-------|----------|--------|-----------|
| LLM timeout on 200+ articles | Medium | **Mitigated** — timeout raised to 300s | `daily_automation.md` |
| Newsletter archive silent failure | Low | **Monitoring** — sends still work, archive copy may be missing | `daily_automation.md` |
| iCloud git push bus errors | Low | **Mitigated** — retry with `GIT_HTTP_POST_BUFFER` | `daily_automation.md` |
| `$NaN` in sponsor pipeline tab | Low | **Fixed** — null guard on `formatPrice()` | `sponsor_management.md` |
| Click tracking not wired initially | Low | **Fixed** — `/api/track` extended with RPC | `sponsor_management.md` |
| `supabase` missing from `requirements.txt` | **High** | **Fixed** — added dep + Supabase env vars to both workflows | `daily_automation.md` |

## Costs

- **LLM (OpenRouter):** ~$0.10–$0.30/day
- **Email (Resend):** Free tier (< 100 emails/day)
- **Hosting (Netlify):** Free tier
- **Database (Supabase):** Free tier

## Next Steps

- [ ] A/B test subject lines
- [ ] Send time optimization per subscriber timezone
- [ ] Email alerting on pipeline failure
- [ ] Sponsor A/B test placement positions
- [ ] Sponsor self-serve portal
- [ ] Gate Sunday Deep Dive behind referral tier (≥3 referrals)
- [ ] Product Hunt launch for subscriber burst
- [ ] Newsletter cross-promotions with adjacent publishers
