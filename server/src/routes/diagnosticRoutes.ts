import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import { getTree, startSession, submitAnswer, completeSession, getSession } from '../controllers/diagnosticController';

const router = Router();
router.get('/tree/:category', getTree);
router.post('/start/:caseId', protect, restrictTo('CUSTOMER'), startSession);
router.post('/answer/:sessionId', protect, restrictTo('CUSTOMER'), submitAnswer);
router.post('/complete/:sessionId', protect, restrictTo('CUSTOMER'), completeSession);
router.get('/:caseId', protect, getSession);
export default router;
