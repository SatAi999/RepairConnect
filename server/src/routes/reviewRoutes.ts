import { Router } from 'express';
import { createReview, getRepairerReviews } from '../controllers/reviewController';
import { protect } from '../middleware/auth';

const router = Router();

// Mount on /api/repairers/:id/reviews
router.post('/:id/reviews', protect, createReview);
router.get('/:id/reviews', protect, getRepairerReviews);

export default router;
