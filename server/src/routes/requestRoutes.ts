import { Router } from 'express';
import {
  createRequest,
  getRequests,
  getRequestById,
  updateRequestStatus,
} from '../controllers/requestController';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/', protect, createRequest);
router.get('/', protect, getRequests);
router.get('/:id', protect, getRequestById);
router.patch('/:id/status', protect, updateRequestStatus);

export default router;
