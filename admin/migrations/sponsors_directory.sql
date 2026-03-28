-- Create the sponsors_directory table
CREATE TABLE IF NOT EXISTS sponsors_directory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    domain TEXT NOT NULL,
    description TEXT NOT NULL,
    funding_stage TEXT NOT NULL, -- e.g., 'series_a', 'series_b'
    company_age_years INTEGER NOT NULL,
    team_size INTEGER NOT NULL,
    raised_m INTEGER NOT NULL,
    topic_category TEXT NOT NULL, -- e.g., 'DevOps', 'AI/ML'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial data based on the original python dictionary
INSERT INTO sponsors_directory (company_name, domain, description, funding_stage, company_age_years, team_size, raised_m, topic_category) VALUES
('Vercel', 'vercel.com', 'Frontend hosting', 'series_b', 6, 100, 150, 'DevOps'),
('Render', 'render.com', 'Cloud platform', 'series_b', 5, 50, 85, 'DevOps'),
('Railway', 'railway.app', 'Infrastructure', 'series_a', 3, 25, 30, 'DevOps'),
('Fly.io', 'fly.io', 'Edge compute', 'series_a', 4, 30, 70, 'DevOps'),

('Anthropic', 'anthropic.com', 'AI safety', 'series_c', 3, 150, 1500, 'AI/ML'),
('Perplexity', 'perplexity.ai', 'AI search', 'series_b', 2, 20, 73, 'AI/ML'),
('Together AI', 'together.ai', 'AI platform', 'series_a', 2, 40, 100, 'AI/ML'),
('Modal', 'modal.com', 'Serverless AI', 'series_a', 3, 15, 16, 'AI/ML'),
('Replicate', 'replicate.com', 'ML deployment', 'series_b', 4, 25, 60, 'AI/ML'),

('First Round Review', 'review.firstround.com', 'Startup advice', 'series_a', 5, 30, 50, 'Leadership'),
('Pavilion', 'joinpavilion.com', 'Executive network', 'series_b', 3, 40, 35, 'Leadership'),

('Supabase', 'supabase.com', 'Database platform', 'series_b', 4, 30, 116, 'Cloud'),
('Convex', 'convex.dev', 'Backend platform', 'series_a', 2, 20, 26, 'Cloud'),
('Neon', 'neon.tech', 'Serverless Postgres', 'series_b', 2, 35, 104, 'Cloud'),
('Turso', 'turso.tech', 'Edge database', 'series_a', 2, 8, 10, 'Cloud'),
('PlanetScale', 'planetscale.com', 'MySQL platform', 'series_b', 4, 50, 105, 'Cloud'),

('Clerk', 'clerk.com', 'Auth for developers', 'series_b', 3, 35, 55, 'Developer Tools'),
('Resend', 'resend.com', 'Email API', 'series_a', 2, 12, 3, 'Developer Tools'),
('Inngest', 'inngest.com', 'Workflow engine', 'series_a', 2, 15, 6, 'Developer Tools')
ON CONFLICT DO NOTHING;
