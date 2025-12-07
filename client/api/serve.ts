import type { VercelRequest, VercelResponse } from '@vercel/node';
import path from 'path';
import { readFileBuffer } from './_lib/sftp.js';
import { authenticateRequest } from './_lib/auth.js';
import { CryptoService } from './_lib/crypto.js';

// Built-in MIME types
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.zip': 'application/zip',
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * File serving endpoint
 * GET /api/serve?path=/folder/file.html&token=SHARE_TOKEN
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

  try {
    // Get path from query parameter
    const filePath = req.query.path as string;

    if (!filePath) {
      return res.status(400).json({ error: 'Missing path parameter' });
    }

    // Normalize path
    const normalized = path.posix.normalize(filePath.startsWith('/') ? filePath : '/' + filePath);

    if (normalized.includes('..')) {
      return res.status(403).json({ error: 'Invalid path' });
    }

    // Check authorization
    const shareToken = req.query.token as string | undefined;
    let authorized = false;

    if (shareToken) {
      const shareData = CryptoService.verifyShareToken(shareToken);
      if (shareData) {
        const tokenPath = path.posix.normalize(shareData.path);
        if (tokenPath === normalized) {
          authorized = true;
        }
      }
    }

    if (!authorized) {
      const auth = authenticateRequest(req);
      authorized = auth.authenticated;
    }

    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Read and serve file
    const buffer = await readFileBuffer(normalized);
    const mimeType = getMimeType(normalized);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    return res.status(200).send(buffer);

  } catch (error: any) {
    if (error.message?.includes('No such file') || error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }
    return res.status(500).json({ error: 'Server error' });
  }
}
