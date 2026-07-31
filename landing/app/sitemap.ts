import { MetadataRoute } from 'next';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://brief.delights.pro';
  
  // Base static routes
  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/archive`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/welcome`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // Scan public/newsletters directory for pSEO archive pages
  const newslettersDir = join(process.cwd(), 'public', 'newsletters');
  if (existsSync(newslettersDir)) {
    try {
      const files = readdirSync(newslettersDir);
      files.forEach((file) => {
        // Match format: newsletter_segment_YYYY-MM-DD.html
        const match = file.match(/^newsletter_(\w+)_(\d{4}-\d{2}-\d{2})\.html$/);
        if (match) {
          const [, segment, date] = match;
          const slug = `${date}-${segment}`;
          routes.push({
            url: `${baseUrl}/archive/${slug}`,
            lastModified: new Date(date),
            changeFrequency: 'never',
            priority: 0.8,
          });
        }
      });
    } catch (e) {
      console.error('Error building sitemap for archive:', e);
    }
  }

  return routes;
}
