import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

export class FileController {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = path.resolve(basePath);
    this.ensureBasePath();
  }

  private async ensureBasePath() {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      console.error('Failed to create base path:', error);
    }
  }

  private resolvePath(filePath: string): string {
    const resolved = path.resolve(this.basePath, filePath.replace(/^\//, ''));
    // Security: ensure path is within basePath
    if (!resolved.startsWith(this.basePath)) {
      throw new Error('Invalid path');
    }
    return resolved;
  }

  async listFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const dirPath = this.resolvePath(req.query.path as string || '/');

      const items = await fs.readdir(dirPath, { withFileTypes: true });
      const files = await Promise.all(
        items.map(async (item) => {
          const itemPath = path.join(dirPath, item.name);
          const stats = await fs.stat(itemPath);
          const relativePath = path.relative(this.basePath, itemPath);

          return {
            name: item.name,
            type: item.isDirectory() ? 'directory' : 'file',
            path: '/' + relativePath.replace(/\\/g, '/'),
            size: stats.size,
            modified: stats.mtime.toISOString(),
          };
        })
      );

      res.json({
        success: true,
        path: req.query.path || '/',
        items: files.sort((a, b) => {
          // Directories first, then files
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        }),
        totalItems: files.length,
      });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'DIR_NOT_FOUND',
            message: 'Directory not found',
          },
        });
      }
      next(error);
    }
  }

  async readFile(req: Request, res: Response, next: NextFunction) {
    try {
      const filePath = this.resolvePath(req.query.path as string);
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);

      res.json({
        success: true,
        file: {
          path: req.query.path,
          name: path.basename(filePath),
          content,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          checksum: this.generateChecksum(content),
        },
      });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File not found',
          },
        });
      }
      next(error);
    }
  }

  async createFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { path: filePath, content = '', overwrite = false } = req.body;
      const fullPath = this.resolvePath(filePath);

      // Check if file exists
      if (!overwrite) {
        try {
          await fs.access(fullPath);
          return res.status(409).json({
            success: false,
            error: {
              code: 'FILE_EXISTS',
              message: 'File already exists',
            },
          });
        } catch {
          // File doesn't exist, continue
        }
      }

      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      // Write file
      await fs.writeFile(fullPath, content);
      const stats = await fs.stat(fullPath);

      res.json({
        success: true,
        file: {
          path: filePath,
          size: stats.size,
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  async updateFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { path: filePath, content } = req.body;
      const fullPath = this.resolvePath(filePath);

      // Check if file exists
      await fs.access(fullPath);

      // Write file
      await fs.writeFile(fullPath, content);
      const stats = await fs.stat(fullPath);

      res.json({
        success: true,
        file: {
          path: filePath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          checksum: this.generateChecksum(content),
        },
      });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File not found',
          },
        });
      }
      next(error);
    }
  }

  async deleteFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { path: filePath, recursive = false } = req.body;
      const fullPath = this.resolvePath(filePath);

      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        await fs.rm(fullPath, { recursive });
      } else {
        await fs.unlink(fullPath);
      }

      res.json({
        success: true,
        deleted: {
          path: filePath,
          deletedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File or directory not found',
          },
        });
      }
      next(error);
    }
  }

  async createDirectory(req: Request, res: Response, next: NextFunction) {
    try {
      const { path: dirPath } = req.body;
      const fullPath = this.resolvePath(dirPath);

      await fs.mkdir(fullPath, { recursive: true });
      const stats = await fs.stat(fullPath);

      res.json({
        success: true,
        directory: {
          path: dirPath,
          created: stats.birthtime.toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  private generateChecksum(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }
}
