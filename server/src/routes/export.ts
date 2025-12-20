import { Router } from 'express'
import { ExportController } from '../controllers/exportController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()
const controller = new ExportController()

router.use(authenticateToken)
router.post('/docx', controller.exportDocx.bind(controller))

export default router
