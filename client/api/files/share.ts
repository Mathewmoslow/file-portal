import type { VercelRequest, VercelResponse } from '@vercel/node';
import path from 'path';
import { setCorsHeaders, handleOptions } from '../_lib/cors.js';
import { authenticateRequest } from '../_lib/auth.js';
import { CryptoService } from '../_lib/crypto.js';
import { existsPath } from '../_lib/sftp.js';

/**
 * Generate a shareable link for a file
 *
 * POST /api/files/share
 * Body: { path: string, expiresIn?: string }
 *
 * expiresIn options: '1h', '24h', '7d', '30d' (default: '7d')
 *
 * Returns: { success: true, shareUrl: string, expiresIn: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Require authentication to generate share links
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return res.status(401).json({ success: false, error: auth.error });
  }

  try {
    const { path: filePath, expiresIn = '7d' } = req.body || {};

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PATH', message: 'File path is required' }
      });
    }

    // Validate expiration option
    const validExpirations = ['1h', '24h', '7d', '30d'];
    const expiration = validExpirations.includes(expiresIn) ? expiresIn : '7d';

    // Normalize and validate path
    const normalized = path.posix.normalize('/' + filePath.replace(/^\/+/, ''));
    if (normalized.includes('..')) {
      return res.status(403).json({
        success: false,
        error: { code: 'INVALID_PATH', message: 'Invalid path' }
      });
    }

    // Verify file exists
    const exists = await existsPath(normalized);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'File not found' }
      });
    }

    // Generate share token
    const token = CryptoService.generateShareToken(normalized, expiration);

    // Build the share URL
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.BASE_URL || 'https://files.mathewmoslow.com';

    const shareUrl = `${baseUrl}${normalized}?token=${token}`;

    return res.status(200).json({
      success: true,
      shareUrl,
      expiresIn: expiration,
      path: normalized
    });

  } catch (error: any) {
    console.error('Share link generation error:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to generate share link' }
    });
  }
}
