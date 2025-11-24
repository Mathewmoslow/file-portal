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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return res.status(401).json({ success: false, error: auth.error });
  }

  try {
    const { path: requestedPath, content = '' } = req.body;

    if (!requestedPath) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PATH', message: 'File path is required' },
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

    // Ensure parent directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Check if file already exists
    try {
      await fs.access(fullPath);
      return res.status(409).json({
        success: false,
        error: { code: 'FILE_EXISTS', message: 'File already exists' },
      });
    } catch {
      // File doesn't exist, continue
    }

    await fs.writeFile(fullPath, content, 'utf-8');

    return res.status(201).json({
      success: true,
      message: 'File created successfully',
      file: { path: requestedPath, name: path.basename(fullPath) },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
    });
  }
}
