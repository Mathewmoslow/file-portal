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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return res.status(401).json({ success: false, error: auth.error });
  }

  try {
    const basePath = process.env.FILE_BASE_PATH || '/tmp/files';
    const requestedPath = (req.query.path as string) || '/';
    const fullPath = path.resolve(basePath, requestedPath.replace(/^\//, ''));

    // Security check
    if (!fullPath.startsWith(basePath)) {
      return res.status(403).json({
        success: false,
        error: { code: 'INVALID_PATH', message: 'Invalid path' },
      });
    }

    // Ensure base directory exists
    await fs.mkdir(basePath, { recursive: true });

    const items = await fs.readdir(fullPath, { withFileTypes: true });
    const files = await Promise.all(
      items.map(async (item) => {
        const itemPath = path.join(fullPath, item.name);
        const stats = await fs.stat(itemPath);
        const relativePath = path.relative(basePath, itemPath);

        return {
          name: item.name,
          type: item.isDirectory() ? 'directory' : 'file',
          path: '/' + relativePath.replace(/\\/g, '/'),
          size: stats.size,
          modified: stats.mtime.toISOString(),
        };
      })
    );

    return res.status(200).json({
      success: true,
      path: requestedPath,
      items: files.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
      totalItems: files.length,
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        error: { code: 'DIR_NOT_FOUND', message: 'Directory not found' },
      });
    }
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
    });
  }
}
