import { Router, Request, Response, NextFunction } from 'express'
import { ExportController } from '../controllers/exportController.js'
import { CryptoService } from '../utils/crypto.js'

const router = Router()
const controller = new ExportController()

// Export authentication: accept bearer tokens OR share tokens
// Share tokens allow users with shared file access to export content
const authenticateExport = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization']
  const token =
    (authHeader && authHeader.split(' ')[1]) ||
    (typeof req.query.token === 'string' ? req.query.token : undefined)

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      },
    })
  }

  const decoded = CryptoService.verifyToken(token)

  if (!decoded) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'AUTH_INVALID',
        message: 'Invalid or expired token',
      },
    })
  }

  // Accept both user tokens (have userId) and share tokens (have path)
  if (!decoded.userId && !decoded.path) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'AUTH_INVALID',
        message: 'Invalid token type',
      },
    })
  }

  next()
}

router.use(authenticateExport)
router.post('/docx', controller.exportDocx.bind(controller))

export default router
