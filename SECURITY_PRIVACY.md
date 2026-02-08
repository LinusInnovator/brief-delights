# 🚨 SECURITY WARNING: Subscriber Data

## THE PROBLEM

**Email addresses are PII (Personally Identifiable Information)**

Storing `subscribers.json` in a **public GitHub repo** exposes:
- ✉️ Email addresses (can be scraped by spammers)
- 👤 Names
- 📊 Segment preferences
- 🕐 Subscription dates

**This violates:**
- GDPR (General Data Protection Regulation)
- CAN-SPAM Act
- Privacy best practices
- Your subscribers' trust

---

## THE SOLUTION

### Option 1: Private Repository (Recommended for Now)

**Make your repo private:**

1. GitHub repo → Settings
2. Scroll to "Danger Zone"
3. Change repository visibility → Private
4. Confirm

**Pros:**
- ✅ Simplest solution
- ✅ Free for unlimited private repos
- ✅ GitHub Actions still works
- ✅ No code changes needed

**Cons:**
- ❌ Can't showcase project publicly
- ❌ Still in Git history (if already committed)

---

### Option 2: .gitignore + GitHub Secrets (Better)

**Use `.gitignore` to exclude subscriber data:**

Already added to `.gitignore`:
```
subscribers.json
subscribers_*.json
subscribers.csv
```

**Remove from Git if already committed:**
```bash
# Remove from Git but keep local file
git rm --cached subscribers.json
git commit -m "Remove subscriber PII from Git"
git push

# Verify it's gone
git log --all --full-history -- subscribers.json
```

**Store subscribers in GitHub Secrets instead:**

1. GitHub repo → Settings → Secrets → Actions
2. New repository secret: `SUBSCRIBERS_JSON`
3. Paste entire JSON content as value

**Update workflow to use secret:**

`.github/workflows/daily_newsletter.yml`:
```yaml
- name: Create subscribers file from secret
  run: echo '${{ secrets.SUBSCRIBERS_JSON }}' > subscribers.json

- name: Send newsletters
  run: python3 execution/send_newsletter.py
```

**Pros:**
- ✅ Repo can be public
- ✅ Subscribers stay encrypted in GitHub
- ✅ Works with existing code

**Cons:**
- ❌ Manual secret updates (edit in GitHub UI)
- ❌ No local testing with real data

---

### Option 3: Encrypted File (Advanced)

**Encrypt `subscribers.json` before committing:**

```bash
# Install git-crypt
brew install git-crypt

# Initialize encryption
cd /path/to/The\ letter
git-crypt init

# Create .gitattributes
echo "subscribers.json filter=git-crypt diff=git-crypt" >> .gitattributes

# Commit encrypted version
git add subscribers.json .gitattributes
git commit -m "Encrypt subscriber data"
git push
```

**Unlock on GitHub Actions:**
```yaml
- name: Decrypt subscribers
  run: |
    echo "${{ secrets.GIT_CRYPT_KEY }}" | base64 -d > /tmp/git-crypt-key
    git-crypt unlock /tmp/git-crypt-key
```

**Pros:**
- ✅ File versioned in Git
- ✅ Encrypted at rest
- ✅ Repo can be public

**Cons:**
- ❌ More complex setup
- ❌ Key management required

---

### Option 4: External Database (Production)

**Use Supabase (free tier) or Railway PostgreSQL:**

```python
# execution/send_newsletter.py
import os
import psycopg2

def load_subscribers():
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cur = conn.cursor()
    
    cur.execute("""
        SELECT email, name, segment 
        FROM subscribers 
        WHERE status = 'active'
    """)
    
    # ... rest of logic
```

**Store `DATABASE_URL` in GitHub Secrets.**

**Pros:**
- ✅ Professional solution
- ✅ Scales to millions
- ✅ No PII in Git at all
- ✅ Audit logs, backups

**Cons:**
- ❌ Requires database setup
- ❌ More infrastructure

---

## RECOMMENDED IMMEDIATE ACTION

**For 0-100 subscribers (NOW):**

```bash
# 1. Add to .gitignore (already done)
git add .gitignore
git commit -m "Add .gitignore to protect PII"

# 2. Remove subscribers.json from Git if already committed
git rm --cached subscribers.json
git commit -m "Remove subscriber PII from version control"
git push

# 3a. Make repo private (easiest)
# OR
# 3b. Use GitHub Secrets (see Option 2 above)
```

**For 100+ subscribers (LATER):**
- Migrate to database (Supabase free tier)
- Build signup API
- No PII in Git at all

---

## WHAT IF IT'S ALREADY COMMITTED?

**Bad news:** Git history is immutable. Once committed, it's in the history forever.

**Damage control:**

1. **Remove from current state:**
```bash
git rm --cached subscribers.json
git commit -m "Remove PII"
git push
```

2. **Rewrite history (DANGEROUS - only if repo is private and you're the only user):**
```bash
# Nuclear option - rewrites entire history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch subscribers.json" \
  --prune-empty --tag-name-filter cat -- --all

# Force push
git push origin --force --all
```

3. **Better: Just make repo private** and move on.

---

## PRIVACY COMPARISON

| Method | PII in Git | Public Repo OK | Complexity |
|--------|------------|----------------|------------|
| **Private repo** | ❌ Yes | ❌ No (private) | Low |
| **.gitignore + Secrets** | ✅ No | ✅ Yes | Medium |
| **Encrypted file** | ⚠️ Encrypted | ✅ Yes | High |
| **Database** | ✅ No | ✅ Yes | High |

---

## GDPR COMPLIANCE

**What GDPR requires:**
- ✅ Consent (you have: they signed up)
- ✅ Secure storage (Git ≠ secure for public repos!)
- ✅ Right to deletion (can remove from JSON)
- ✅ Data minimization (only store email + segment)
- ✅ Data portability (JSON is portable)

**What you're missing if public:**
- ❌ **Secure storage** (public Git = not secure)
- ❌ **Access control** (anyone can download)

**Fix:** Private repo OR database with proper security.

---

## CURRENT STATUS CHECK

```bash
# Check if subscribers.json is tracked
git ls-files | grep subscribers.json

# Check if it's in .gitignore
git check-ignore subscribers.json

# Check Git history
git log --all --full-history -- subscribers.json
```

**If any of these return results, you need to clean up!**

---

## BOTTOM LINE

**NEVER store PII in public Git repos. Period.**

**Your options (pick one NOW):**

1. **Easiest:** Make repo private (30 seconds)
2. **Better:** Use `.gitignore` + GitHub Secrets (5 minutes)
3. **Best:** Migrate to database when scaling (later)

**I've already added `subscribers.json` to `.gitignore` for you.**

**Next: Decide if repo should be private or if you'll use GitHub Secrets.**
