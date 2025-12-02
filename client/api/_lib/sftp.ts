import SFTPClient from 'ssh2-sftp-client';
import path from 'path';

const sftpConfig = {
  host: process.env.SFTP_HOST || '',
  port: Number(process.env.SFTP_PORT || 22),
  username: process.env.SFTP_USERNAME || '',
  password: process.env.SFTP_PASSWORD || '',
};

const basePath = (process.env.SFTP_BASE_PATH || '/').replace(/\/+$/, '') || '/';

function ensureConfig() {
  if (!sftpConfig.host || !sftpConfig.username || !sftpConfig.password) {
    throw new Error('SFTP configuration missing. Please set SFTP_HOST, SFTP_USERNAME, SFTP_PASSWORD.');
  }
}

function normalizePath(requestedPath: string): string {
  const normalized = path.posix.normalize('/' + (requestedPath || '/'));
  if (normalized.includes('..')) {
    throw new Error('INVALID_PATH');
  }
  return normalized;
}

function toRemotePath(requestedPath: string): { remotePath: string; safePath: string } {
  const safePath = normalizePath(requestedPath);
  const remotePath = path.posix.join(basePath, safePath);
  return { remotePath, safePath };
}

async function withClient<T>(fn: (client: SFTPClient) => Promise<T>): Promise<T> {
  ensureConfig();
  const client = new SFTPClient();
  try {
    await client.connect(sftpConfig);
    return await fn(client);
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}

// Helper to extract metadata from HTML content
function extractHtmlMetadata(content: string): { title?: string; description?: string; preview?: string } {
  const metadata: { title?: string; description?: string; preview?: string } = {};

  // Extract title
  const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    metadata.title = titleMatch[1].trim();
  }

  // Extract meta description
  const descMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  if (descMatch) {
    metadata.description = descMatch[1].trim();
  }

  // Extract text preview (strip HTML tags, get first 200 chars)
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    const bodyText = bodyMatch[1]
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    metadata.preview = bodyText.substring(0, 200);
  }

  return metadata;
}

// Helper to derive category from path
function getCategoryFromPath(filePath: string): string | undefined {
  const parts = filePath.split('/').filter(Boolean);
  if (parts.length > 0) {
    return parts[0]; // First folder is category
  }
  return undefined;
}

export async function listDirectory(requestedPath: string) {
  return withClient(async (client) => {
    const { remotePath, safePath } = toRemotePath(requestedPath || '/');
    const entries = await client.list(remotePath);

    const enrichedEntries = await Promise.all(
      entries.map(async (entry) => {
        const filePath = path.posix.join(safePath, entry.name).replace(/\/+/g, '/');
        const baseInfo = {
          name: entry.name,
          type: entry.type === 'd' ? 'directory' : 'file',
          path: filePath,
          size: entry.size ?? 0,
          modified: new Date(entry.modifyTime).toISOString(),
          category: getCategoryFromPath(filePath),
        };

        // For HTML files, extract metadata
        if (entry.type === '-' && entry.name.endsWith('.html')) {
          try {
            const fileRemotePath = path.posix.join(remotePath, entry.name);
            const data = await client.get(fileRemotePath);
            const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as Buffer);
            const content = buffer.toString('utf-8');
            const metadata = extractHtmlMetadata(content);

            return {
              ...baseInfo,
              description: metadata.description || metadata.title,
              preview: metadata.preview,
            };
          } catch (error) {
            // If metadata extraction fails, return base info
            return baseInfo;
          }
        }

        // For text files, extract preview
        if (entry.type === '-' && (
          entry.name.endsWith('.txt') ||
          entry.name.endsWith('.md') ||
          entry.name.endsWith('.json')
        )) {
          try {
            const fileRemotePath = path.posix.join(remotePath, entry.name);
            const data = await client.get(fileRemotePath);
            const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as Buffer);
            const content = buffer.toString('utf-8');

            return {
              ...baseInfo,
              preview: content.substring(0, 200).trim(),
            };
          } catch (error) {
            return baseInfo;
          }
        }

        return baseInfo;
      })
    );

    return enrichedEntries;
  });
}

export async function readFile(requestedPath: string) {
  return withClient(async (client) => {
    const { remotePath } = toRemotePath(requestedPath);
    const data = await client.get(remotePath);
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as Buffer);
    return buffer.toString('utf-8');
  });
}

export async function writeFile(requestedPath: string, content: string = '') {
  return withClient(async (client) => {
    const { remotePath } = toRemotePath(requestedPath);
    const dirPath = path.posix.dirname(remotePath);
    await client.mkdir(dirPath, true);
    await client.put(Buffer.from(content, 'utf-8'), remotePath);
  });
}

export async function deleteFile(requestedPath: string) {
  return withClient(async (client) => {
    const { remotePath } = toRemotePath(requestedPath);
    await client.delete(remotePath);
  });
}

export async function existsPath(requestedPath: string): Promise<boolean> {
  return withClient(async (client) => {
    const { remotePath } = toRemotePath(requestedPath);
    const result = await client.exists(remotePath);
    return Boolean(result);
  });
}

export async function removePath(requestedPath: string, recursive = false) {
  return withClient(async (client) => {
    const { remotePath } = toRemotePath(requestedPath);
    const exists = await client.exists(remotePath);
    if (!exists) {
      const error: any = new Error('NOT_FOUND');
      error.code = 'NOT_FOUND';
      throw error;
    }

    if (exists === 'd') {
      await client.rmdir(remotePath, recursive);
    } else {
      await client.delete(remotePath);
    }
  });
}

export async function readFileBuffer(requestedPath: string) {
  return withClient(async (client) => {
    const { remotePath } = toRemotePath(requestedPath);
    const data = await client.get(remotePath);
    return Buffer.isBuffer(data) ? data : Buffer.from(data as Buffer);
  });
}

export async function writeFileBuffer(requestedPath: string, content: Buffer) {
  return withClient(async (client) => {
    const { remotePath } = toRemotePath(requestedPath);
    const dirPath = path.posix.dirname(remotePath);
    await client.mkdir(dirPath, true);
    await client.put(content, remotePath);
  });
}

export async function createDirectory(requestedPath: string) {
  return withClient(async (client) => {
    const { remotePath } = toRemotePath(requestedPath);
    await client.mkdir(remotePath, true);
  });
}

export async function renamePath(oldPath: string, newPath: string) {
  return withClient(async (client) => {
    const { remotePath: oldRemote } = toRemotePath(oldPath);
    const { remotePath: newRemote } = toRemotePath(newPath);
    await client.rename(oldRemote, newRemote);
  });
}
