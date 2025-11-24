import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs/promises';
import path from 'path';
import { setCorsHeaders, handleOptions } from '../_lib/cors';
import { authenticateRequest } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return res.status(401).json({ success: false, error: auth.error });
  }

  try {
    const { path: requestedPath, recursive = false } = req.body;

    if (!requestedPath) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PATH', message: 'Path is required' },
      });
    }

    const basePath = process.env.FILE_BASE_PATH || '/tmp/files';
    const fullPath = path.resolve(basePath, requestedPath.replace(/^\//, ''));

    // Security check
    if (!fullPath.startsWith(basePath)) {
      return res.status(403).json({
        success: false,
        error: { code: 'INVALID_PATH', message: 'Invalid path' },
      });
    }

    const stats = await fs.stat(fullPath);

    if (stats.isDirectory()) {
      await fs.rmdir(fullPath, { recursive });
    } else {
      await fs.unlink(fullPath);
    }

    return res.status(200).json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: 'File not found' },
      });
    }
    if (error.code === 'ENOTEMPTY') {
      return res.status(400).json({
        success: false,
        error: { code: 'DIR_NOT_EMPTY', message: 'Directory not empty' },
      });
    }
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
    });
  }
}
