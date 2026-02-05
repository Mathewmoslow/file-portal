import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from '../_lib/cors.js';
import { authenticateRequest } from '../_lib/auth.js';
import { writeFileBuffer, appendFileBuffer } from '../_lib/sftp.js';

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
    const { path, contentBase64, chunkIndex = 0, totalChunks = 1 } = req.body;

    if (!path || !contentBase64) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'Path and content are required' },
      });
    }

    const buffer = Buffer.from(contentBase64, 'base64');

    if (chunkIndex === 0) {
      await writeFileBuffer(path, buffer);
    } else {
      await appendFileBuffer(path, buffer);
    }

    const complete = chunkIndex === totalChunks - 1;

    return res.status(200).json({
      success: true,
      message: complete ? 'File uploaded successfully' : `Chunk ${chunkIndex + 1}/${totalChunks} uploaded`,
      file: { path, name: path.split('/').pop() },
      complete,
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
