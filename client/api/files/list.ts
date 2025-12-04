import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from '../_lib/cors.js';
import { authenticateRequest } from '../_lib/auth.js';
import { listDirectory } from '../_lib/sftp.js';

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
    const requestedPath = (req.query.path as string) || '/';
    const files = await listDirectory(requestedPath);

    return res.status(200).json({
      success: true,
      path: requestedPath,
      items: files.sort((a: any, b: any) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
      totalItems: files.length,
    });
  } catch (error: any) {
    if (error.message === 'INVALID_PATH') {
      return res.status(403).json({
        success: false,
        error: { code: 'INVALID_PATH', message: 'Invalid path' },
      });
    }
    if (error.message === 'DIRECTORY_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Directory not found' },
      });
    }
    if (error.message.includes('SFTP configuration missing')) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'SFTP_NOT_CONFIGURED',
          message: 'SFTP is not configured. Please set SFTP_HOST, SFTP_USERNAME, and SFTP_PASSWORD in Vercel environment variables.'
        },
      });
    }
    console.error('List directory error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Unknown error' },
    });
  }
}
