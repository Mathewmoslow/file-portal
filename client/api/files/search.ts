import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from '../_lib/cors.js';
import { authenticateRequest } from '../_lib/auth.js';
import { searchFiles } from '../_lib/sftp.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return res.status(401).json({ success: false, error: auth.error });
  }

  try {
    const query = (req.query.q as string) || '';
    const maxResults = parseInt(req.query.limit as string) || 50;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_QUERY', message: 'Search query must be at least 2 characters' },
      });
    }

    const results = await searchFiles(query, maxResults);

    return res.status(200).json({
      success: true,
      query,
      results,
      totalResults: results.length,
    });
  } catch (error: any) {
    if (error.message.includes('SFTP configuration missing')) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SFTP_NOT_CONFIGURED',
          message: 'SFTP is not configured. Please set SFTP_HOST, SFTP_USERNAME, and SFTP_PASSWORD in Vercel environment variables.'
        },
      });
    }
    console.error('Search error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Unknown error' },
    });
  }
}
