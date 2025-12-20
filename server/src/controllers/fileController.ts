import path from 'path'
import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'
import { withSftp, joinRemote, SFTP_BASE } from '../utils/sftp.js'

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
}

export class FileController {
  private resolvePath(filePath: string): string {
    return joinRemote(SFTP_BASE, filePath || '/')
  }

  private checksum(content: Buffer | string) {
    return crypto.createHash('md5').update(content).digest('hex')
  }

  async listFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const target = this.resolvePath((req.query.path as string) || '/')
      const items = await withSftp(async (sftp) => sftp.list(target))
      const files = items.map((item) => {
        const rel = joinRemote((req.query.path as string) || '/', item.name)
        return {
          name: item.name,
          type: item.type === 'd' ? 'directory' : 'file',
          path: rel,
          size: item.size,
          modified: item.modifyTime ? new Date(item.modifyTime).toISOString() : new Date().toISOString(),
        }
      })
      files.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      res.json({ success: true, path: req.query.path || '/', items: files, totalItems: files.length })
    } catch (error) {
      next(error)
    }
  }

  async readFile(req: Request, res: Response, next: NextFunction) {
    try {
      const filePath = this.resolvePath(req.query.path as string)
      const data = await withSftp(async (sftp) => sftp.get(filePath))
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as any)
      res.json({
        success: true,
        file: {
          path: req.query.path,
          name: path.basename(filePath),
          content: buf.toString('utf-8'),
          size: buf.length,
          modified: new Date().toISOString(),
          checksum: this.checksum(buf),
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async createFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { path: filePath, content = '' } = req.body
      const remote = this.resolvePath(filePath)
      await withSftp(async (sftp) => {
        const dir = path.posix.dirname(remote)
        await sftp.mkdir(dir, true)
        await sftp.put(Buffer.from(content), remote)
      })
      res.json({ success: true, file: { path: filePath, size: content.length, modified: new Date().toISOString() } })
    } catch (error) {
      next(error)
    }
  }

  async updateFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { path: filePath, content } = req.body
      const remote = this.resolvePath(filePath)
      await withSftp(async (sftp) => {
        await sftp.put(Buffer.from(content), remote)
      })
      res.json({
        success: true,
        file: {
          path: filePath,
          size: Buffer.byteLength(content || ''),
          modified: new Date().toISOString(),
          checksum: this.checksum(content || ''),
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async deleteFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { path: filePath, recursive = false } = req.body
      const remote = this.resolvePath(filePath)
      await withSftp(async (sftp) => {
        if (recursive) {
          await sftp.rmdir(remote, true).catch(async () => {
            await sftp.delete(remote).catch(() => {})
          })
        } else {
          await sftp.delete(remote).catch(async () => {
            await sftp.rmdir(remote)
          })
        }
      })
      res.json({ success: true, deleted: { path: filePath, deletedAt: new Date().toISOString() } })
    } catch (error) {
      next(error)
    }
  }

  async createDirectory(req: Request, res: Response, next: NextFunction) {
    try {
      const { path: dirPath } = req.body
      const remote = this.resolvePath(dirPath)
      await withSftp(async (sftp) => {
        await sftp.mkdir(remote, true)
      })
      res.json({ success: true, directory: { path: dirPath, created: new Date().toISOString() } })
    } catch (error) {
      next(error)
    }
  }

  async renameFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to } = req.body
      const fromRemote = this.resolvePath(from)
      const toRemote = this.resolvePath(to)
      await withSftp(async (sftp) => {
        const dir = path.posix.dirname(toRemote)
        await sftp.mkdir(dir, true)
        await sftp.rename(fromRemote, toRemote)
      })
      res.json({ success: true, renamed: { from, to, renamedAt: new Date().toISOString() } })
    } catch (error) {
      next(error)
    }
  }

  async uploadBase64(req: Request, res: Response, next: NextFunction) {
    try {
      const { path: filePath, contentBase64 } = req.body
      const remote = this.resolvePath(filePath)
      const buffer = Buffer.from(contentBase64, 'base64')
      await withSftp(async (sftp) => {
        const dir = path.posix.dirname(remote)
        await sftp.mkdir(dir, true)
        await sftp.put(buffer, remote)
      })
      res.json({
        success: true,
        file: { path: filePath, size: buffer.length, created: new Date().toISOString(), modified: new Date().toISOString() },
      })
    } catch (error) {
      next(error)
    }
  }

  async serveFile(req: Request, res: Response, next: NextFunction) {
    try {
      const remote = this.resolvePath(req.query.path as string)
      const data = await withSftp(async (sftp) => sftp.get(remote))
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as any)
      const ext = path.extname(remote).toLowerCase()
      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
      res.setHeader('Content-Length', buf.length)
      res.send(buf)
    } catch (error) {
      next(error)
    }
  }

  async searchFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const query = (req.query.q as string || '').toLowerCase()
      const limit = parseInt(req.query.limit as string) || 50
      if (!query) return res.json({ success: true, results: [], totalResults: 0 })
      const results: any[] = []
      await withSftp(async (sftp) => {
        const walk = async (dir: string) => {
          if (results.length >= limit) return
          const items = await sftp.list(dir)
          for (const item of items) {
            if (results.length >= limit) break
            const rel = joinRemote(path.relative(SFTP_BASE, dir), item.name)
            if (item.name.toLowerCase().includes(query)) {
              results.push({
                name: item.name,
                type: item.type === 'd' ? 'directory' : 'file',
                path: rel,
                size: item.size,
                modified: item.modifyTime ? new Date(item.modifyTime).toISOString() : new Date().toISOString(),
              })
            }
            if (item.type === 'd') {
              await walk(joinRemote(dir, item.name))
            }
          }
        }
        await walk(SFTP_BASE)
      })
      res.json({ success: true, results, totalResults: results.length })
    } catch (error) {
      next(error)
    }
  }
}
