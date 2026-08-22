import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import {
  createAssessment, getAssessment, getOffers, acceptOffer,
  getPickup, updatePickupStatus, getPassport, getCertificate, getDashboard,
} from '../controllers/recoveryController';

const router = Router();
router.post('/assess/:caseId', protect, restrictTo('REPAIRER'), createAssessment);
router.get('/assess/:caseId', protect, getAssessment);
router.get('/offers/:caseId', protect, restrictTo('CUSTOMER', 'ADMIN'), getOffers);
router.post('/offers/:caseId/accept', protect, restrictTo('CUSTOMER'), acceptOffer);
router.get('/pickup/:caseId', protect, getPickup);
router.patch('/pickup/:pickupId/status', protect, restrictTo('RECOVERY_PARTNER', 'ADMIN'), updatePickupStatus);
router.get('/passport/:caseId', protect, getPassport);
router.get('/certificate/:caseId', protect, getCertificate);
router.get('/dashboard', protect, restrictTo('ADMIN'), getDashboard);
export default router;
