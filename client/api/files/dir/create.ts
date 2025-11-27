import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from '../../_lib/cors.js';
import { authenticateRequest } from '../../_lib/auth.js';
import { createDirectory } from '../../_lib/sftp.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return res.status(401).json({ success: false, error: auth.error });
  }

  try {
    const { path } = req.body;
    if (!path) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PATH', message: 'Directory path is required' },
      });
    }

    await createDirectory(path);

    return res.status(201).json({
      success: true,
      message: 'Directory created successfully',
    });
  } catch (error: any) {
    if (error.message === 'INVALID_PATH') {
      return res.status(403).json({
        success: false,
        error: { code: 'INVALID_PATH', message: 'Invalid path' },
      });
    }
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
    });
  }
}
