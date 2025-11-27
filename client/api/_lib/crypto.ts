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
}
