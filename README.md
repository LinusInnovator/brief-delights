# Quick Start Guide

## Setup Instructions

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Verify Configuration
Make sure these files exist:
- ✅ `.env` - API keys configured
- ✅ `feeds_config.json` - RSS feeds configured
- ✅ `subscribers.json` - At least one test subscriber

### 3. Test the Pipeline
Run manually first to verify everything works:
```bash
python3 execution/run_daily_pipeline.py
```

Expected output files in `.tmp/`:
- `raw_articles_YYYY-MM-DD.json` (shared across segments)
- `selected_articles_{segment}_YYYY-MM-DD.json` (×3: builders, leaders, innovators)
- `summaries_{segment}_YYYY-MM-DD.json` (×3)
- `newsletter_{segment}_YYYY-MM-DD.html` (×3)
- `send_log_YYYY-MM-DD.json`
- `pipeline_log_YYYY-MM-DD.txt`

### 4. Review Newsletter
Check `.tmp/newsletter_YYYY-MM-DD.html` in a browser to preview before sending.

### 5. Schedule Daily Automation
Once tested, set up cron to run automatically:
```bash
crontab -e
```

Add this line (runs Mon-Fri at 6 AM):
```
0 6 * * 1-5 cd /path/to/your/project && python3 execution/run_daily_pipeline.py
```

## Individual Scripts

You can also run each step individually for testing:

```bash
# Step 1: Aggregate RSS feeds
python3 execution/aggregate_feeds.py

# Step 2: Select top stories using LLM
python3 execution/select_stories.py

# Step 3: Summarize articles using LLM
python3 execution/summarize_articles.py

# Step 4: Compose HTML newsletter
python3 execution/compose_newsletter.py

# Step 5: Send emails (TEST CAREFULLY!)
python3 execution/send_newsletter.py
```

## Customization

### Update Newsletter Name
Edit these variables in:
- `execution/compose_newsletter.py`: `NEWSLETTER_NAME`
- `execution/send_newsletter.py`: `NEWSLETTER_NAME`

### Modify RSS Feeds
Edit `feeds_config.json` to add/remove sources.

### Adjust Content Selection
Edit `directives/select_top_stories.md` and `execution/select_stories.py` to change LLM selection criteria.

### Change Email Template
Edit `newsletter_template.html` to customize design.

## Monitoring

Check logs after each run:
```bash
# View today's pipeline log
cat .tmp/pipeline_log_$(date +%Y-%m-%d).txt

# View send results
cat .tmp/send_log_$(date +%Y-%m-%d).json
```

## Troubleshooting

**Problem**: No articles collected
- Check RSS feeds in `feeds_config.json` are valid
- Some feeds may be down temporarily

**Problem**: LLM selection fails
- Verify `OPENROUTER_API_KEY` in `.env`
- Check API credits balance

**Problem**: Emails not sending
- Verify `RESEND_API_KEY` in `.env`
- Check Resend dashboard for errors
- Ensure `EMAIL_SENDER` domain is verified in Resend

## Cost Estimates

Daily operating costs (approximate):
- **OpenRouter (LLM)**: $0.10 - $0.30/day (3 segments × selection + summarization)
- **Resend (Email)**: Free tier: 100 emails/day
  - Paid: $20/month for 50K emails
- **Total**: ~$5-$15/month for small newsletter (<1000 subs)

## Next Steps

After your newsletter is running smoothly:
1. Build a landing page for signups
2. Implement referral program (SparkLoop or custom)
3. Add sponsor ad slots to newsletter
4. Monitor open rates and optimize content
5. Scale to multiple niche newsletters

---

**Need help?** Check the directives in `directives/` for detailed documentation on each step.
