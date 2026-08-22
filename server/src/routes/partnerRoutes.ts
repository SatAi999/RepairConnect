import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import { registerPartner, getPartnerProfile, getEligibleCases, submitOffer, getMyOffers, getMyPickups } from '../controllers/partnerController';

const router = Router();
router.post('/register', protect, registerPartner);
router.get('/profile', protect, restrictTo('RECOVERY_PARTNER'), getPartnerProfile);
router.get('/cases', protect, restrictTo('RECOVERY_PARTNER', 'ADMIN'), getEligibleCases);
router.post('/offers', protect, restrictTo('RECOVERY_PARTNER'), submitOffer);
router.get('/offers', protect, restrictTo('RECOVERY_PARTNER'), getMyOffers);
router.get('/pickups', protect, restrictTo('RECOVERY_PARTNER'), getMyPickups);
export default router;
