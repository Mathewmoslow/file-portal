import { Router } from 'express';
import { FileController } from '../controllers/fileController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
const fileController = new FileController();

// All routes require authentication
router.use(authenticateToken);

// Writing styles stub (returns empty list until storage is wired)
router.get('/styles', (_req, res) => {
  res.json({ success: true, items: [] });
});

// File operations
router.get('/list', fileController.listFiles.bind(fileController));
router.get('/read', fileController.readFile.bind(fileController));
router.post('/create', fileController.createFile.bind(fileController));
router.put('/update', fileController.updateFile.bind(fileController));
router.delete('/delete', fileController.deleteFile.bind(fileController));
router.post('/rename', fileController.renameFile.bind(fileController));
router.post('/upload', fileController.uploadBase64.bind(fileController));
router.get('/search', fileController.searchFiles.bind(fileController));
router.post('/share', fileController.createShareLink.bind(fileController));

// Directory operations
router.post('/dir/create', fileController.createDirectory.bind(fileController));

export default router;
