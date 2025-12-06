import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-this';

export class CryptoService {
  static generateToken(userId: string = 'user'): string {
    return jwt.sign({ userId, timestamp: Date.now() }, JWT_SECRET, {
      expiresIn: '24h',
    });
  }

  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  static generateRefreshToken(userId: string = 'user'): string {
    return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, {
      expiresIn: '7d',
    });
  }

  /**
   * Generate a share token for a specific file path
   * @param filePath - The file path to share
   * @param expiresIn - Expiration time (e.g., '1h', '7d', '30d')
   */
  static generateShareToken(filePath: string, expiresIn: string = '7d'): string {
    return jwt.sign(
      { type: 'share', path: filePath, created: Date.now() },
      JWT_SECRET,
      { expiresIn }
    );
  }

  /**
   * Verify a share token and return the file path if valid
   * @param token - The share token to verify
   * @returns The file path if valid, null if invalid/expired
   */
  static verifyShareToken(token: string): { path: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.type !== 'share' || !decoded.path) {
        return null;
      }
      return { path: decoded.path };
    } catch (error) {
      return null;
    }
  }
}
