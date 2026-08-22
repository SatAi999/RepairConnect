import { Router } from 'express';
import {
  getRepairers,
  getRepairerById,
  getMyProfile,
  updateMyProfile,
} from '../controllers/repairerController';
import { protect, restrictTo } from '../middleware/auth';

const router = Router();

router.get('/', protect, getRepairers);
router.get('/profile', protect, restrictTo('REPAIRER'), getMyProfile);
router.patch('/profile', protect, restrictTo('REPAIRER'), updateMyProfile);
router.get('/:id', protect, getRepairerById);

export default router;
