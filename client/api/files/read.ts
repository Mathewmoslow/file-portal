import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { setCorsHeaders, handleOptions } from '../_lib/cors';
import { authenticateRequest } from '../_lib/auth';

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
    const basePath = process.env.FILE_BASE_PATH || '/tmp/files';
    const requestedPath = (req.query.path as string) || '';
    const fullPath = path.resolve(basePath, requestedPath.replace(/^\//, ''));

    // Security check
    if (!fullPath.startsWith(basePath)) {
      return res.status(403).json({
        success: false,
        error: { code: 'INVALID_PATH', message: 'Invalid path' },
      });
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    const stats = await fs.stat(fullPath);
    const checksum = crypto.createHash('md5').update(content).digest('hex');

    return res.status(200).json({
      success: true,
      file: {
        path: requestedPath,
        name: path.basename(fullPath),
        content,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        checksum,
      },
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: 'File not found' },
      });
    }
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
    });
  }
}
