import { Router } from 'express';
import {
  getStats,
  getUsers,
  getKnowledge,
  createOrUpdateKnowledge,
  deleteKnowledge,
  verifyRepairer,
} from '../controllers/adminController';
import { protect, restrictTo } from '../middleware/auth';

const router = Router();

// Protect all routes under admin to ADMIN role only
router.use(protect, restrictTo('ADMIN'));

router.get('/stats', getStats);
router.get('/users', getUsers);
router.get('/knowledge', getKnowledge);
router.post('/knowledge', createOrUpdateKnowledge);
router.delete('/knowledge/:id', deleteKnowledge);
router.patch('/repairers/:profileId/verify', verifyRepairer);

export default router;
