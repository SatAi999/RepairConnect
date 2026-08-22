import { Router } from 'express';
import { getNotifications, markRead } from '../controllers/notificationController';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/', protect, getNotifications);
router.patch('/:id/read', protect, markRead);

export default router;
