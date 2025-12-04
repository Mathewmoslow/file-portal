import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from '../_lib/cors.js';
import { authenticateRequest } from '../_lib/auth.js';

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

  // Return config status (not actual values for security)
  return res.status(200).json({
    success: true,
    config: {
      sftpHost: process.env.SFTP_HOST ? '✓ Set' : '✗ Missing',
      sftpPort: process.env.SFTP_PORT || 22,
      sftpUsername: process.env.SFTP_USERNAME ? '✓ Set' : '✗ Missing',
      sftpPassword: process.env.SFTP_PASSWORD ? '✓ Set' : '✗ Missing',
      sftpBasePath: process.env.SFTP_BASE_PATH || '/',
    }
  });
}
