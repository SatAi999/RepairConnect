import { Router, Request, Response } from 'express';
import {
  createRepairCase,
  getMyRepairCases,
  getRepairCaseById,
  updateRepairCase,
  deleteRepairCase,
  analyzeCase,
} from '../controllers/caseController';
import { protect } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Standalone upload endpoint
router.post('/upload', protect, upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No file uploaded.' },
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    return res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: { url: fileUrl },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'File upload failed.' },
    });
  }
});

router.post('/', protect, createRepairCase);
router.get('/', protect, getMyRepairCases);
router.get('/:id', protect, getRepairCaseById);
router.patch('/:id', protect, updateRepairCase);
router.delete('/:id', protect, deleteRepairCase);
router.post('/:id/analyze', protect, analyzeCase);

export default router;
