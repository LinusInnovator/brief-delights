-- Newsletter Feedback Schema
-- Stores reader ratings and optional comments per edition

CREATE TABLE IF NOT EXISTS newsletter_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edition_date DATE NOT NULL,
    segment TEXT NOT NULL,
    rating TEXT NOT NULL CHECK (rating IN ('loved', 'good', 'meh')),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast lookups for admin dashboard
CREATE INDEX IF NOT EXISTS idx_feedback_edition ON newsletter_feedback(edition_date DESC, segment);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON newsletter_feedback(rating);
