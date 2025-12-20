import { Router, Request, Response } from 'express';
import { CryptoService } from '../utils/crypto.js';

const router = Router();

// Prefer a bcrypt hash when provided; otherwise fall back to plain text password
const STORED_PASSWORD = (process.env.PASSWORD || 'demo123').trim();
const STORED_PASSWORD_HASH = process.env.PASSWORD_HASH?.trim();

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PASSWORD',
          message: 'Password is required',
        },
      });
    }

    let isValid = false;

    if (STORED_PASSWORD_HASH) {
      isValid = await CryptoService.verifyPassword(password, STORED_PASSWORD_HASH);
    } else {
      isValid = password === STORED_PASSWORD;
    }

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Invalid password',
        },
      });
    }

    // Generate tokens
    const token = CryptoService.generateToken('user');
    const refreshToken = CryptoService.generateRefreshToken('user');

    res.json({
      success: true,
      token,
      refreshToken,
      expiresIn: 86400, // 24 hours
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGIN_ERROR',
        message: error.message,
      },
    });
  }
});

// Logout endpoint
router.post('/logout', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// Refresh token endpoint
router.post('/refresh', (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Refresh token is required',
        },
      });
    }

    const decoded = CryptoService.verifyToken(refreshToken);

    if (!decoded || decoded.type !== 'refresh') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid refresh token',
        },
      });
    }

    const newToken = CryptoService.generateToken(decoded.userId);

    res.json({
      success: true,
      token: newToken,
      expiresIn: 86400,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'REFRESH_ERROR',
        message: error.message,
      },
    });
  }
});

export default router;
