import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { analyzeImage, getVisionAnalysis } from '../controllers/visionController';

const router = Router();

router.post('/analyze/:caseId', protect, restrictTo('CUSTOMER'), upload.single('file'), analyzeImage);
router.get('/:caseId', protect, getVisionAnalysis);

export default router;
