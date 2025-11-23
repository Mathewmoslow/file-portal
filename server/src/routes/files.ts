import { Router } from 'express';
import { FileController } from '../controllers/fileController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
const basePath = process.env.FILE_BASE_PATH || '../test-files';
const fileController = new FileController(basePath);

// All routes require authentication
router.use(authenticateToken);

// File operations
router.get('/list', fileController.listFiles.bind(fileController));
router.get('/read', fileController.readFile.bind(fileController));
router.post('/create', fileController.createFile.bind(fileController));
router.put('/update', fileController.updateFile.bind(fileController));
router.delete('/delete', fileController.deleteFile.bind(fileController));

// Directory operations
router.post('/dir/create', fileController.createDirectory.bind(fileController));

export default router;
