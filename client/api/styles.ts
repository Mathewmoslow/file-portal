import type { VercelRequest, VercelResponse } from '@vercel/node'
// @ts-ignore - ssh2-sftp-client doesn't have types
import Client from 'ssh2-sftp-client'

const host = process.env.SFTP_HOST
const port = Number(process.env.SFTP_PORT || 22)
const username = process.env.SFTP_USER || process.env.SFTP_USERNAME
const password = process.env.SFTP_PASS || process.env.SFTP_PASSWORD
const basePath = (process.env.SFTP_BASE_PATH || '/files').replace(/\/+$/, '')
const stylesDir = `${basePath}/styles`

async function withSftp(fn: (sftp: any) => Promise<any>) {
  if (!host || !username || !password) {
    const err: any = new Error('SFTP is not configured. Please set SFTP_HOST, SFTP_USER (or SFTP_USERNAME), and SFTP_PASS (or SFTP_PASSWORD).')
    err.code = 'SFTP_NOT_CONFIGURED'
    throw err
  }
  const sftp = new Client()
  await sftp.connect({ host, port, username, password })
  try {
    const res = await fn(sftp)
    await sftp.end()
    return res
  } catch (e) {
    await sftp.end().catch(() => {})
    throw e
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    if (req.method === 'GET') {
      const styles = await withSftp(async (sftp) => {
        await sftp.mkdir(stylesDir, true)
        const list = await sftp.list(stylesDir)
        const items: any[] = []
        for (const item of list) {
          if (item.type === 'd') continue
          const filePath = `${stylesDir}/${item.name}`
          const buf = await sftp.get(filePath)
          const content = Buffer.isBuffer(buf) ? buf.toString('utf-8') : String(buf)
          items.push({
            id: filePath,
            name: item.name,
            content,
            created_at: item.modifyTime ? new Date(item.modifyTime).toISOString() : new Date().toISOString(),
          })
        }
        return items
      })
      return res.status(200).json({ styles })
    }

    if (req.method === 'POST') {
      const { name, content } = req.body || {}
      if (!name || !content) {
        return res.status(400).json({ error: 'Missing name or content' })
      }
      const fileName = name.endsWith('.md') ? name : `${name}.md`
      const saved = await withSftp(async (sftp) => {
        await sftp.mkdir(stylesDir, true)
        const remote = `${stylesDir}/${fileName}`
        await sftp.put(Buffer.from(content, 'utf-8'), remote)
        return {
          id: remote,
          name: fileName,
          content,
          created_at: new Date().toISOString(),
        }
      })
      return res.status(200).json({ style: saved })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e: any) {
    const msg = e?.message || 'Styles endpoint error'
    const code = e?.code || 'STYLES_ERROR'
    return res.status(500).json({ error: { code, message: msg } })
  }
}
