# GDPR Compliance - Analytics Tracking

## Privacy-First Approach

Brief Delights uses **GDPR-compliant analytics** that respects user privacy. We track **what content performs**, not **who reads it**.

## What We Track

### ✅ Aggregate Data (No Personal Info)
- **Article engagement**: Which articles get clicked
- **Segment performance**: How builders/innovators/leaders engage
- **Newsletter metrics**: Open rates, click rates by segment
- **Content topics**: Which topics drive engagement

### ❌ What We DON'T Track
- ❌ Individual reading behavior
- ❌ IP addresses or locations
- ❌ Device fingerprints
- ❌ User agents or browser info
- ❌ Cross-site tracking

## Technical Implementation

### 1. Email Hashing (Pseudonymization)
```typescript
// Never store raw emails
const emailHash = crypto
  .createHash('sha256')
  .update(email.toLowerCase().trim())
  .digest('hex');
```

- **SHA-256 one-way hash** - Cannot be reversed to get email
- Allows deduplication without storing PII
- Complies with GDPR Article 32 (pseudonymization)

### 2. Data Minimization
We only collect:
- `article_url` - Which article was clicked
- `segment` - builders/innovators/leaders (user-provided preference)
- `timestamp` - When the click happened
- `source_domain` - Article source (e.g., docker.com)

We explicitly **do NOT** collect:
- IP addresses
- Geolocation
- Device information
- Browser fingerprints

### 3. Auto-Deletion (90-Day Retention)
```sql
-- Auto-delete after 90 days
expires_at TIMESTAMP GENERATED ALWAYS AS (clicked_at + INTERVAL '90 days') STORED
```

- All personal data automatically deleted after 90 days
- Aggregate statistics (no personal data) kept indefinitely
- Complies with GDPR Article 5 (storage limitation)

### 4. Right to be Forgotten
```sql
-- Delete all data for a user
SELECT * FROM gdpr_delete_user('user@example.com');
```

- Users can request data deletion anytime
- Function removes all hashed records
- Complies with GDPR Article 17

## Data Usage Purpose

**Sole Purpose**: Understand which content topics our audience finds valuable

**How We Use It**:
1. See which articles get the most clicks
2. Identify popular topics (AI, DevOps, Leadership, etc.)
3. Match relevant sponsors to proven audience interests
4. Improve content curation

**We Never**:
- Sell data to third parties
- Track individual behavior
- Build user profiles
- Share data outside our system

## User Consent

- Users consent via newsletter signup
- Privacy policy linked in footer
- Easy unsubscribe in every email
- Data deletion requests honored within 30 days

## Technical Architecture

### Data Flow
```
1. User clicks article link in newsletter
   ↓
2. Resend webhook fires with event data
   ↓
3. Webhook handler hashes email (SHA-256)
   ↓
4. Stores: article_url + segment + timestamp
   ↓
5. Auto-deletes after 90 days
```

### Database Schema
- `article_clicks` - Article-level aggregate data
- `email_events` - Email delivery events
- `newsletter_sends` - Send metrics (no personal data)

All tables have:
- Email hashing via `hash_email()` function
- Auto-expiry timestamps
- No IP/location columns

## Compliance Checklist

- [x] **Lawful Basis**: Legitimate interest (content improvement)
- [x] **Data Minimization**: Only collect what's needed
- [x] **Purpose Limitation**: Single defined purpose
- [x] **Storage Limitation**: 90-day auto-deletion
- [x] **Integrity & Confidentiality**: Hashing, no PII storage
- [x] **Accountability**: This documentation
- [x] **Right to Access**: Users can request their data
- [x] **Right to Erasure**: `gdpr_delete_user()` function
- [x] **Data Portability**: Export function available
- [x] **Privacy by Design**: Built-in from day 1

## Contact

For privacy questions or data deletion requests:
- Email: privacy@delights.pro (to be set up)
- Response time: Within 30 days

---

**Last Updated**: 2026-02-15
**Version**: 1.0
