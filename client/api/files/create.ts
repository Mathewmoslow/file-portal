import type { VercelRequest, VercelResponse } from '@vercel/node';
import path from 'path';
import { setCorsHeaders, handleOptions } from '../_lib/cors.js';
import { authenticateRequest } from '../_lib/auth.js';
import { existsPath, writeFile } from '../_lib/sftp.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '500mb',
    },
  },
};

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

    // Check if file already exists
    const fileExists = await existsPath(requestedPath);
    if (fileExists) {
      return res.status(409).json({
        success: false,
        error: { code: 'FILE_EXISTS', message: 'File already exists' },
      });
    }

    await writeFile(requestedPath, content);

    return res.status(201).json({
      success: true,
      message: 'File created successfully',
      file: { path: requestedPath, name: path.basename(requestedPath) },
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
