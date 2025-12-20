import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-this';

export class CryptoService {
  // Hash password
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  // Verify password
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Generate JWT token
  static generateToken(userId: string = 'user'): string {
    return jwt.sign(
      { userId, timestamp: Date.now() },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  // Generate share token scoped to a path; expiresIn can be undefined for "never"
  static generateTokenWithPath(path: string, expiresIn?: string): string {
    const payload: any = { path, type: 'share', timestamp: Date.now() }
    const options: any = {}
    if (expiresIn) options.expiresIn = expiresIn
    return jwt.sign(payload, JWT_SECRET, options)
  }

  // Verify JWT token
  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  // Generate refresh token
  static generateRefreshToken(userId: string = 'user'): string {
    return jwt.sign(
      { userId, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }
}
