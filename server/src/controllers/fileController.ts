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

  async renameFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to } = req.body;
      const fromPath = this.resolvePath(from);
      const toPath = this.resolvePath(to);

      // Check if source exists
      await fs.access(fromPath);

      // Ensure destination directory exists
      await fs.mkdir(path.dirname(toPath), { recursive: true });

      // Rename/move the file
      await fs.rename(fromPath, toPath);

      res.json({
        success: true,
        renamed: {
          from,
          to,
          renamedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'Source file or directory not found',
          },
        });
      }
      next(error);
    }
  }

  async uploadBase64(req: Request, res: Response, next: NextFunction) {
    try {
      const { path: filePath, contentBase64 } = req.body;
      const fullPath = this.resolvePath(filePath);

      // Decode base64 content
      const buffer = Buffer.from(contentBase64, 'base64');

      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      // Write binary file
      await fs.writeFile(fullPath, buffer);
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

  async serveFile(req: Request, res: Response, next: NextFunction) {
    try {
      const filePath = this.resolvePath(req.query.path as string);
      const stats = await fs.stat(filePath);

      if (stats.isDirectory()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'IS_DIRECTORY',
            message: 'Cannot serve a directory',
          },
        });
      }

      // Determine MIME type based on extension
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.html': 'text/html',
        '.htm': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
        '.ico': 'image/x-icon',
        '.pdf': 'application/pdf',
        '.mp3': 'audio/mpeg',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.xml': 'application/xml',
        '.zip': 'application/zip',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.ttf': 'font/ttf',
        '.otf': 'font/otf',
      };

      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const content = await fs.readFile(filePath);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', stats.size);
      res.send(content);
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

  async searchFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const query = (req.query.q as string || '').toLowerCase();
      const limit = parseInt(req.query.limit as string) || 50;

      if (!query) {
        return res.json({ success: true, results: [], totalResults: 0 });
      }

      const results: any[] = [];

      const searchDir = async (dirPath: string) => {
        if (results.length >= limit) return;

        try {
          const items = await fs.readdir(dirPath, { withFileTypes: true });

          for (const item of items) {
            if (results.length >= limit) break;

            const itemPath = path.join(dirPath, item.name);
            const relativePath = path.relative(this.basePath, itemPath);

            if (item.name.toLowerCase().includes(query)) {
              const stats = await fs.stat(itemPath);
              results.push({
                name: item.name,
                type: item.isDirectory() ? 'directory' : 'file',
                path: '/' + relativePath.replace(/\\/g, '/'),
                size: stats.size,
                modified: stats.mtime.toISOString(),
              });
            }

            if (item.isDirectory()) {
              await searchDir(itemPath);
            }
          }
        } catch {
          // Skip directories we can't access
        }
      };

      await searchDir(this.basePath);

      res.json({
        success: true,
        results,
        totalResults: results.length,
      });
    } catch (error: any) {
      next(error);
    }
  }
}
