import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CryptoService } from '../_lib/crypto.js';

/**
 * DOCX Export endpoint
 * POST /api/export/docx
 * Body: { html: string, filename?: string }
 * Auth: Bearer token OR share token (query param)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authorization - accept bearer token OR share token
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.toString().split(' ')[1];
    const shareToken = req.query.token as string | undefined;

    let authorized = false;

    // Check bearer token
    if (bearerToken) {
      const decoded = CryptoService.verifyToken(bearerToken);
      if (decoded) {
        authorized = true;
      }
    }

    // Check share token if bearer didn't work
    if (!authorized && shareToken) {
      const shareData = CryptoService.verifyShareToken(shareToken);
      if (shareData) {
        authorized = true;
      }
    }

    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get HTML content
    const { html, filename } = req.body || {};

    if (!html || typeof html !== 'string') {
      return res.status(400).json({ error: 'Missing html content' });
    }

    // Dynamic import of html-to-docx
    const { default: htmlToDocx } = await import('html-to-docx');

    const docxBuffer = await htmlToDocx(html, {
      orientation: 'portrait',
      margins: { top: 720, right: 720, bottom: 720, left: 720 },
      title: filename || 'document',
    });

    const safeName = (filename && typeof filename === 'string' ? filename : 'document') + '.docx';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);

    return res.status(200).send(Buffer.from(docxBuffer));

  } catch (error: any) {
    console.error('DOCX export error:', error);
    return res.status(500).json({ error: error?.message || 'Export failed' });
  }
}
