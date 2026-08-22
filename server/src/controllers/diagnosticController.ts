import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { RepairCase } from '../models/RepairCase';
import { DiagnosticSession } from '../models/DiagnosticSession';
import {
  getDiagnosticTree,
  computeResult,
  getSupportedCategories,
  DiagnosticTree,
} from '../services/DiagnosticEngine';

// GET /api/diagnostic/tree/:category
export const getTree = async (req: AuthRequest, res: Response) => {
  const { category } = req.params;
  const tree = getDiagnosticTree(decodeURIComponent(category));
  if (!tree) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `No diagnostic tree for category: ${category}` },
      supportedCategories: getSupportedCategories(),
    });
  }
  // Return only non-terminal nodes for the frontend
  const nodes = Object.fromEntries(
    Object.entries(tree.nodes).filter(([, n]) => !n.id.startsWith('END_') && n.id !== 'SAFETY')
  );
  return res.json({ success: true, data: { ...tree, nodes } });
};

// POST /api/diagnostic/start/:caseId
export const startSession = async (req: AuthRequest, res: Response) => {
  try {
    const repairCase = await RepairCase.findById(req.params.caseId);
    if (!repairCase) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found' } });
    if (repairCase.userId.toString() !== req.user!._id.toString()) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your case' } });
    }

    // Upsert: reuse existing IN_PROGRESS session
    let session = await DiagnosticSession.findOne({ repairCaseId: repairCase._id, status: 'IN_PROGRESS' });
    if (!session) {
      session = await DiagnosticSession.create({
        repairCaseId: repairCase._id,
        userId: req.user!._id,
        category: repairCase.category,
        answers: [],
        safetyFlagged: false,
        status: 'IN_PROGRESS',
      });
      await RepairCase.findByIdAndUpdate(repairCase._id, { diagnosticSessionId: session._id });
    }
    return res.status(201).json({ success: true, data: session });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// POST /api/diagnostic/answer/:sessionId
export const submitAnswer = async (req: AuthRequest, res: Response) => {
  try {
    const session = await DiagnosticSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } });
    if (session.userId.toString() !== req.user!._id.toString()) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your session' } });
    }
    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: 'Session already completed' } });
    }

    const { questionId, question, answer, safetyEscalate } = req.body;
    if (!questionId || !answer) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'questionId and answer required' } });
    }

    session.answers.push({ questionId, question: question || questionId, answer, answeredAt: new Date() });

    if (safetyEscalate) {
      session.safetyFlagged = true;
      session.safetyFlag = 'Safety concern flagged during diagnostic';
      session.status = 'SAFETY_ESCALATED';
    }

    await session.save();
    return res.json({ success: true, data: session });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// POST /api/diagnostic/complete/:sessionId
export const completeSession = async (req: AuthRequest, res: Response) => {
  try {
    const session = await DiagnosticSession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } });
    if (session.userId.toString() !== req.user!._id.toString()) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your session' } });
    }

    const result = computeResult(session.category, session.answers.map((a) => ({ questionId: a.questionId, answer: a.answer })));
    session.result = result as any;
    session.status = result.safetyFlagged ? 'SAFETY_ESCALATED' : 'COMPLETED';
    session.completedAt = new Date();
    await session.save();

    return res.json({ success: true, data: session });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// GET /api/diagnostic/:caseId
export const getSession = async (req: AuthRequest, res: Response) => {
  try {
    const session = await DiagnosticSession.findOne({ repairCaseId: req.params.caseId }).sort({ createdAt: -1 });
    if (!session) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No diagnostic session for this case' } });
    return res.json({ success: true, data: session });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
