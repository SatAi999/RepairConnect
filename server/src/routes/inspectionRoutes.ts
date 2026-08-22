import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import { createInspection, getInspection, updateComponents } from '../controllers/inspectionController';

const router = Router();
router.post('/:caseId', protect, restrictTo('REPAIRER'), createInspection);
router.get('/:caseId', protect, getInspection);
router.patch('/:caseId/components', protect, restrictTo('REPAIRER'), updateComponents);
export default router;
