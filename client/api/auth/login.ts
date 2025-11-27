import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CryptoService } from '../_lib/crypto.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password } = req.body;
    const STORED_PASSWORD = process.env.PASSWORD || 'demo123';

    if (!password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PASSWORD',
          message: 'Password is required',
        },
      });
    }

    if (password !== STORED_PASSWORD) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Invalid password',
        },
      });
    }

    const token = CryptoService.generateToken('user');
    const refreshToken = CryptoService.generateRefreshToken('user');

    return res.status(200).json({
      success: true,
      token,
      refreshToken,
      expiresIn: 86400,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'LOGIN_ERROR',
        message: error.message,
      },
    });
  }
}
