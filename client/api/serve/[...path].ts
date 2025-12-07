import type { VercelRequest, VercelResponse } from '@vercel/node';
import path from 'path';
import { readFileBuffer } from '../_lib/sftp.js';
import { authenticateRequest } from '../_lib/auth.js';
import { CryptoService } from '../_lib/crypto.js';

// Built-in MIME types to avoid dependency issues
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
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('=== SERVE ENDPOINT HIT ===');
  console.log('URL:', req.url);
  console.log('Method:', req.method);
  console.log('Query:', JSON.stringify(req.query));

  // Set CORS headers
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
    // Extract the file path from the catch-all route
    const pathSegments = req.query.path;
    console.log('Path segments:', pathSegments);
    console.log('Path segments type:', typeof pathSegments);
    console.log('Is array:', Array.isArray(pathSegments));

    if (!pathSegments) {
      console.log('ERROR: No path segments');
      return res.status(400).json({
        error: 'No file path specified',
        debug: { query: req.query, url: req.url }
      });
    }

    // Handle both string and array cases
    const filePath = Array.isArray(pathSegments)
      ? '/' + pathSegments.join('/')
      : '/' + pathSegments;

    console.log('Constructed file path:', filePath);

    // Validate path doesn't try to escape
    const normalized = path.posix.normalize(filePath);
    console.log('Normalized path:', normalized);

    if (normalized.includes('..')) {
      return res.status(403).json({ error: 'Invalid path' });
    }

    // Check authorization: either auth token OR share token
    const shareToken = req.query.token as string | undefined;
    console.log('Share token present:', !!shareToken);

    let authorized = false;

    if (shareToken) {
      // Verify share token
      const shareData = CryptoService.verifyShareToken(shareToken);
      console.log('Share data:', shareData);

      if (shareData) {
        // Verify token is for this specific file path
        const tokenPath = path.posix.normalize(shareData.path);
        console.log('Token path:', tokenPath);
        console.log('Paths match:', tokenPath === normalized);

        if (tokenPath === normalized) {
          authorized = true;
        }
      }
    }

    if (!authorized) {
      // Fall back to session auth
      const auth = authenticateRequest(req);
      console.log('Session auth result:', auth.authenticated);
      authorized = auth.authenticated;
    }

    if (!authorized) {
      console.log('ERROR: Not authorized');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid authentication or share token required',
        debug: { normalizedPath: normalized, tokenPresent: !!shareToken }
      });
    }

    console.log('Authorization passed, reading file...');

    // Read file from SFTP
    const buffer = await readFileBuffer(normalized);
    console.log('File read successfully, size:', buffer.length);

    // Determine MIME type
    const mimeType = getMimeType(normalized);
    console.log('MIME type:', mimeType);

    // Set appropriate headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');

    // Send the file
    console.log('Sending file response');
    return res.status(200).send(buffer);

  } catch (error: any) {
    console.error('=== SERVE ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    if (error.message === 'INVALID_PATH') {
      return res.status(403).json({ error: 'Invalid path' });
    }

    if (error.message?.includes('No such file') || error.code === 'ENOENT') {
      return res.status(404).json({
        error: 'File not found',
        debug: { message: error.message }
      });
    }

    return res.status(500).json({
      error: 'Failed to serve file',
      debug: { message: error.message }
    });
  }
}
