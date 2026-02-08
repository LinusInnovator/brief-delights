# Footer Compliance Plan

## Problem
Footer was missing from latest newsletter - critical for:
- Legal compliance (unsubscribe link required by law)
- Brand attribution
- Website/contact links

## Root Cause
Template variables not being passed correctly from `compose_newsletter.py`

---

## Solution: Multi-Layer Safety Net

### Layer 1: **Hardcoded Defaults in Template**
Make footer self-sufficient with fallback values directly in HTML:

```jinja2
<div class="footer">
    <p class="share">💌 Enjoying {{ newsletter_name|default("Briefly") }}? 
        <a href="mailto:?subject=Check%20out%20Briefly">Forward to a colleague</a>
    </p>

    <p class="links">
        <a href="{{ website_url|default('#') }}">Website</a>
        <a href="{{ website_url|default('#') }}/about">About</a>
        <a href="{{ website_url|default('#') }}/advertise">Advertise</a>
        <a href="{{ unsubscribe_url|default('mailto:unsubscribe@briefly.com') }}">Unsubscribe</a>
    </p>

    <p class="legal">
        You're receiving this because you subscribed to {{ newsletter_name|default("Briefly") }}.<br>
        brief delights | A DreamValidator brand<br>
        © 2026 All rights reserved.
    </p>
</div>
```

**Benefit:** Footer ALWAYS renders, even if variables are missing

---

### Layer 2: **Config File for Footer Variables**
Create `config/footer_config.json`:

```json
{
  "newsletter_name": "Briefly",
  "website_url": "https://briefly.dreamvalidator.com",
  "unsubscribe_url": "https://briefly.dreamvalidator.com/unsubscribe",
  "brand_attribution": "brief delights | A DreamValidator brand",
  "company_name": "DreamValidator",
  "support_email": "hello@dreamvalidator.com"
}
```

**Benefit:** Single source of truth, easy to update

---

### Layer 3: **Validation in Compose Script**
Add pre-render check:

```python
def validate_footer_vars(template_vars):
    """Ensure all footer variables are present"""
    required = ['newsletter_name', 'website_url', 'unsubscribe_url']
    missing = [v for v in required if v not in template_vars]
    
    if missing:
        log(f"⚠️ Missing footer variables: {missing}")
        log("Loading from config/footer_config.json...")
        # Load from config file as backup
    
    return template_vars
```

**Benefit:** Catches missing variables before rendering

---

### Layer 4: **Automated Footer Test**
Add to pipeline:

```python
def test_footer_present(html_content):
    """Verify footer is in rendered HTML"""
    required_elements = [
        'Unsubscribe',
        'DreamValidator brand',
        'website_url'
    ]
    
    for element in required_elements:
        if element not in html_content:
            raise Exception(f"CRITICAL: Footer missing '{element}'")
    
    log("✅ Footer validation passed")
```

**Benefit:** Fails fast if footer is broken

---

## Implementation Priority

1. **IMMEDIATE (Critical):**
   - Add "brief delights | A DreamValidator brand" to template
   - Add Jinja2 default filters to all footer variables
   - Fix compose script to pass all variables

2. **SHORT TERM:**
   - Create footer_config.json
   - Add validation function to compose script

3. **MEDIUM TERM:**
   - Add automated footer test to pipeline
   - Monitor footer rendering in logs

---

## Updated Footer HTML

```html
<p class="legal">
    You're receiving this because you subscribed to {{ newsletter_name|default("Briefly") }}.<br>
    <strong>brief delights | A DreamValidator brand</strong><br>
    © 2026 All rights reserved.<br>
    Questions? <a href="mailto:hello@dreamvalidator.com">hello@dreamvalidator.com</a>
</p>
```

---

## Testing Checklist

- [ ] Footer appears in all 3 segments
- [ ] Unsubscribe link is functional
- [ ] Brand attribution visible
- [ ] All links point to correct URLs
- [ ] Footer survives template variable failures

---

## Legal Requirements (CAN-SPAM Act)

Footer MUST include:
✅ Unsubscribe link (working)
✅ Physical address OR contact email
✅ Company identification

Our footer now has all three ✅
