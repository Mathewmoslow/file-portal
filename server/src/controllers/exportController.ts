import type { Request, Response } from 'express'

export class ExportController {
  async exportDocx(req: Request, res: Response) {
    try {
      const { html, filename } = req.body || {}
      if (!html || typeof html !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing html' })
      }
      const { default: htmlToDocx } = await import('html-to-docx')
      const docxBuffer = await htmlToDocx(html, {
        orientation: 'portrait',
        margins: { top: 720, right: 720, bottom: 720, left: 720 },
        title: filename || 'document',
      })
      const safeName = (filename && typeof filename === 'string' ? filename : 'document') + '.docx'
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      res.setHeader('Content-Disposition', `attachment; filename=\"${safeName}\"`)
      return res.end(Buffer.from(docxBuffer))
    } catch (error: any) {
      console.error('DOCX export error', error)
      return res.status(500).json({ success: false, error: error?.message || 'Export failed' })
    }
  }
}
