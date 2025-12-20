import type { VercelRequest, VercelResponse } from '@vercel/node';

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

interface UnsplashImage {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string | null;
  description: string | null;
  user: {
    name: string;
    username: string;
  };
  width: number;
  height: number;
}

interface SearchResult {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  credit: string;
  creditUrl: string;
  width: number;
  height: number;
}

/**
 * Image search endpoint using Unsplash API
 * GET /api/images/search?q=medical+anatomy&page=1&per_page=20
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!UNSPLASH_ACCESS_KEY) {
    return res.status(500).json({ error: 'Unsplash API not configured' });
  }

  try {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = Math.min(parseInt(req.query.per_page as string) || 20, 30);

    if (!query) {
      return res.status(400).json({ error: 'Missing search query (q parameter)' });
    }

    // Search Unsplash
    const searchUrl = new URL('https://api.unsplash.com/search/photos');
    searchUrl.searchParams.set('query', query);
    searchUrl.searchParams.set('page', page.toString());
    searchUrl.searchParams.set('per_page', perPage.toString());
    searchUrl.searchParams.set('orientation', 'landscape'); // Better for documents

    const response = await fetch(searchUrl.toString(), {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Unsplash API error:', response.status, errorText);
      return res.status(response.status).json({
        error: `Unsplash API error: ${response.status}`
      });
    }

    const data = await response.json();

    // Transform to simpler format
    const results: SearchResult[] = data.results.map((img: UnsplashImage) => ({
      id: img.id,
      url: img.urls.regular,
      thumb: img.urls.thumb,
      alt: img.alt_description || img.description || 'Image',
      credit: img.user.name,
      creditUrl: `https://unsplash.com/@${img.user.username}?utm_source=file_portal&utm_medium=referral`,
      width: img.width,
      height: img.height,
    }));

    return res.status(200).json({
      results,
      total: data.total,
      totalPages: data.total_pages,
      page,
      perPage,
    });

  } catch (error: any) {
    console.error('Image search error:', error);
    return res.status(500).json({ error: error?.message || 'Search failed' });
  }
}
