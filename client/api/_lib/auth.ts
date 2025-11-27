import type { VercelRequest } from '@vercel/node';
import { CryptoService } from './crypto';

export function authenticateRequest(req: VercelRequest): { authenticated: boolean; error?: any } {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.toString().split(' ')[1];

  if (!token) {
    return {
      authenticated: false,
      error: {
        code: 'NO_TOKEN',
        message: 'No authentication token provided',
      },
    };
  }

  try {
    const decoded = CryptoService.verifyToken(token);
    if (!decoded) {
      return {
        authenticated: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
      };
    }
    return { authenticated: true };
  } catch (error) {
    return {
      authenticated: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      },
    };
  }
}
