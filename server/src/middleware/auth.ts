import { Request, Response, NextFunction } from 'express';
import { CryptoService } from '../utils/crypto.js';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token =
    (authHeader && authHeader.split(' ')[1]) ||
    (typeof req.query.token === 'string' ? req.query.token : undefined);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      },
    });
  }

  const decoded = CryptoService.verifyToken(token);

  if (!decoded) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'AUTH_INVALID',
        message: 'Invalid or expired token',
      },
    });
  }

  req.userId = decoded.userId;
  next();
};
