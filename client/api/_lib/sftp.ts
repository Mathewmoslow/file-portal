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

export async function listDirectory(requestedPath: string) {
  return withClient(async (client) => {
    const { remotePath, safePath } = toRemotePath(requestedPath || '/');
    const entries = await client.list(remotePath);

    return entries.map((entry) => ({
      name: entry.name,
      type: entry.type === 'd' ? 'directory' : 'file',
      path: path.posix.join(safePath, entry.name).replace(/\/+/g, '/'),
      size: entry.size ?? 0,
      modified: new Date(entry.modifyTime).toISOString(),
    }));
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
