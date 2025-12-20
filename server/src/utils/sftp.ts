import Client from 'ssh2-sftp-client'

const host = process.env.SFTP_HOST
const port = Number(process.env.SFTP_PORT || 22)
const username = process.env.SFTP_USER || process.env.SFTP_USERNAME
const password = process.env.SFTP_PASS || process.env.SFTP_PASSWORD
const basePath = (process.env.SFTP_BASE_PATH || '/files').replace(/\/+$/, '')

export const SFTP_BASE = basePath

export async function withSftp<T>(fn: (sftp: Client) => Promise<T>): Promise<T> {
  if (!host || !username || !password) {
    throw new Error('SFTP is not configured. Please set SFTP_HOST, SFTP_USER (or SFTP_USERNAME), and SFTP_PASS (or SFTP_PASSWORD).')
  }
  const sftp = new Client()
  try {
    await sftp.connect({ host, port, username, password })
    const result = await fn(sftp)
    await sftp.end()
    return result
  } catch (err) {
    try {
      await sftp.end()
    } catch {
      // ignore
    }
    throw err
  }
}

export function joinRemote(...parts: string[]): string {
  const cleaned = parts
    .filter(Boolean)
    .map((p) => p.replace(/^\/+|\/+$/g, ''))
    .filter((p) => p.length > 0)
  return `/${cleaned.join('/')}`
}
