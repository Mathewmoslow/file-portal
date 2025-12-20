import { Router } from 'express'
import path from 'path'
import { withSftp, joinRemote, SFTP_BASE } from '../utils/sftp.js'

const router = Router()
const stylesDir = joinRemote(SFTP_BASE, 'styles')

router.get('/', async (_req, res) => {
  try {
    const styles = await withSftp(async (sftp) => {
      await sftp.mkdir(stylesDir, true)
      const list = await sftp.list(stylesDir)
      const items: any[] = []
      for (const item of list) {
        if (item.type === 'd') continue
        const filePath = joinRemote(stylesDir, item.name)
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
    return res.json({ styles })
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to load styles' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, content } = req.body || {}
    if (!name || !content) {
      return res.status(400).json({ error: 'Missing name or content' })
    }
    const fileName = name.endsWith('.md') ? name : `${name}.md`
    const remote = joinRemote(stylesDir, fileName)
    const saved = await withSftp(async (sftp) => {
      await sftp.mkdir(stylesDir, true)
      await sftp.put(Buffer.from(content, 'utf-8'), remote)
      return {
        id: remote,
        name: fileName,
        content,
        created_at: new Date().toISOString(),
      }
    })
    return res.json({ style: saved })
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to save style' })
  }
})

export default router
