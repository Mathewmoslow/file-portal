import type { VercelRequest, VercelResponse } from '@vercel/node';
import path from 'path';
import { lookup as lookupMime } from 'mime-types';
import { readFileBuffer } from '../_lib/sftp.js';
import { authenticateRequest } from '../_lib/auth.js';
import { CryptoService } from '../_lib/crypto.js';

/**
 * Protected file serving endpoint with share token support
 *
 * Access methods:
 * 1. Authenticated: /api/serve/path/to/file.html (with Bearer token)
 * 2. Share link: /api/serve/path/to/file.html?token=SHARE_TOKEN
 *
 * Without valid auth or share token, returns 401
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    if (!pathSegments) {
      return res.status(400).json({ error: 'No file path specified' });
    }

    // Handle both string and array cases
    const filePath = Array.isArray(pathSegments)
      ? '/' + pathSegments.join('/')
      : '/' + pathSegments;

    // Validate path doesn't try to escape
    const normalized = path.posix.normalize(filePath);
    if (normalized.includes('..')) {
      return res.status(403).json({ error: 'Invalid path' });
    }

    // Check authorization: either auth token OR share token
    const shareToken = req.query.token as string | undefined;
    let authorized = false;

    if (shareToken) {
      // Verify share token
      const shareData = CryptoService.verifyShareToken(shareToken);
      if (shareData) {
        // Verify token is for this specific file path
        const tokenPath = path.posix.normalize(shareData.path);
        if (tokenPath === normalized) {
          authorized = true;
        }
      }
    }

    if (!authorized) {
      // Fall back to session auth
      const auth = authenticateRequest(req);
      authorized = auth.authenticated;
    }

    if (!authorized) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid authentication or share token required'
      });
    }

    // Read file from SFTP
    const buffer = await readFileBuffer(normalized);

    // Determine MIME type
    const mimeType = lookupMime(normalized) || 'application/octet-stream';

    // Set appropriate headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);

    // Cache control - cache for 1 hour, allow revalidation
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');

    // Send the file
    return res.status(200).send(buffer);

  } catch (error: any) {
    console.error('File serve error:', error.message);

    if (error.message === 'INVALID_PATH') {
      return res.status(403).json({ error: 'Invalid path' });
    }

    if (error.message?.includes('No such file') || error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }

    return res.status(500).json({ error: 'Failed to serve file' });
  }
}
