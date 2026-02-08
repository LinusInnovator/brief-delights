# Directive: Compose Newsletter

## Goal
Assemble the final HTML newsletter email from summarized articles. Create a clean, scannable, mobile-responsive email that readers can digest in 5 minutes.

## Inputs
- `.tmp/summaries_YYYY-MM-DD.json` - Articles with summaries
- `newsletter_template.html` - Base email template

## Tool to Use
- **Script:** `execution/compose_newsletter.py`

## Expected Outputs
- `.tmp/newsletter_YYYY-MM-DD.html` - Final HTML email ready to send
- Preview includes:
  - Header with newsletter branding
  - 5-7 stories organized by category
  - Footer with referral CTA and unsubscribe link

## Success Criteria
- ✅ All selected articles included
- ✅ Organized by category tags (AI, Business, Enterprise, etc.)
- ✅ Mobile-responsive design
- ✅ All links functional
- ✅ Unsubscribe link present
- ✅ Clean HTML (passes email validators)

## Process
1. Read summarized articles from `.tmp/summaries_YYYY-MM-DD.json`
2. Group articles by `category_tag`
3. Load HTML template from `newsletter_template.html`
4. For each category section:
   - Add section header
   - Insert article cards (headline + summary + link)
5. Add header (date, newsletter branding)
6. Add footer (referral CTA, unsubscribe)
7. Render final HTML
8. Save to `.tmp/newsletter_YYYY-MM-DD.html`

## Template Structure

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{newsletter_name}} - {{date}}</title>
  <style>
    /* Responsive email CSS */
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>{{newsletter_name}}</h1>
      <p class="date">{{formatted_date}}</p>
      <p class="tagline">Your daily 5-min AI & Tech Brief</p>
    </div>
    
    <!-- Content Sections -->
    {% for category in categories %}
    <div class="section">
      <h2>{{category_name}}</h2>
      
      {% for article in category_articles %}
      <div class="story">
        <h3><a href="{{article.url}}">{{article.title}}</a></h3>
        <p class="summary">{{article.summary}}</p>
        <p class="meta">{{article.source}}</p>
      </div>
      {% endfor %}
    </div>
    {% endfor %}
    
    <!-- Footer -->
    <div class="footer">
      <p class="cta">💌 Enjoying this? <a href="{{referral_link}}">Forward to a friend</a></p>
      <p class="links">
        <a href="{{website_url}}">Website</a> | 
        <a href="{{unsubscribe_url}}">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
```

## Styling Guidelines
- **Font:** Sans-serif, 16px base size
- **Colors:** Professional blues/grays, high contrast
- **Spacing:** Generous whitespace between sections
- **Links:** Clear, underlined, blue
- **Mobile:** Single column, readable on small screens

## Dynamic Elements
- `{{date}}` - Today's date (e.g., "February 8, 2026")
- `{{newsletter_name}}` - Brand name
- `{{category_name}}` - Section headers (🚀 AI & Innovation, etc.)
- `{{article.*}}` - Article data (title, summary, url, source)
- `{{referral_link}}` - Referral program link (future)
- `{{unsubscribe_url}}` - Unsubscribe endpoint

## Email Best Practices
- Keep HTML under 102KB (Gmail clipping threshold)
- Use inline CSS (many email clients strip `<style>`)
- Test in Litmus or Email on Acid (if budget allows)
- Include plain text version (for accessibility)

## Edge Cases & Error Handling
- **No articles in category:** Skip section entirely
- **Very long title:** Truncate at 80 characters
- **Missing summary:** Use description fallback
- **Template not found:** Use hardcoded minimal template

## Performance Expectations
- **Runtime:** <5 seconds
- **Output size:** ~50-80KB HTML

## Logging
Log to `.tmp/composition_log_YYYY-MM-DD.txt`:
- Number of articles per category
- Total HTML size
- Any rendering errors

## Next Step
After composition, proceed to `send_newsletter.md` to deliver emails.
