import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { RepairCase } from '../models/RepairCase';
import { TechnicianInspection } from '../models/TechnicianInspection';
import { ProductPassport } from '../models/ProductPassport';
import { Notification } from '../models/Notification';

// POST /api/inspection/:caseId  (REPAIRER only)
export const createInspection = async (req: AuthRequest, res: Response) => {
  try {
    const { repairDecision, inspectionNotes, affectedComponents, estimatedRepairCost, repairRequestId } = req.body;

    if (!repairDecision || !inspectionNotes) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'repairDecision and inspectionNotes are required.' } });
    }

    const validDecisions = ['REPAIRABLE', 'ECONOMICALLY_IMPRACTICAL', 'BEYOND_REPAIR', 'CUSTOMER_DECLINED'];
    if (!validDecisions.includes(repairDecision)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid repairDecision.' } });
    }

    const repairCase = await RepairCase.findById(req.params.caseId);
    if (!repairCase) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found' } });

    const recoveryEligible = ['BEYOND_REPAIR', 'ECONOMICALLY_IMPRACTICAL', 'CUSTOMER_DECLINED'].includes(repairDecision);

    const inspection = await TechnicianInspection.create({
      repairCaseId: repairCase._id,
      repairRequestId: repairRequestId || undefined,
      technicianId: req.user!._id,
      repairDecision,
      inspectionNotes,
      affectedComponents: affectedComponents || [],
      estimatedRepairCost: estimatedRepairCost || undefined,
      recoveryEligible,
      confirmedAt: new Date(),
    });

    // Update RepairCase status
    const newStatus = recoveryEligible ? 'RECOVERY_ELIGIBLE' :
                      repairDecision === 'REPAIRABLE' ? 'IN_REPAIR' : 'IN_REPAIR';

    await RepairCase.findByIdAndUpdate(repairCase._id, {
      technicianInspectionId: inspection._id,
      status: newStatus,
    });

    // Create ProductPassport if recovery eligible
    if (recoveryEligible) {
      const existingPassport = await ProductPassport.findOne({ repairCaseId: repairCase._id });
      if (!existingPassport) {
        const passport = await ProductPassport.create({
          repairCaseId: repairCase._id,
          userId: repairCase.userId,
          productName: repairCase.itemName,
          category: repairCase.category,
          brand: repairCase.brand,
          model: repairCase.model,
          events: [
            { type: 'REGISTERED', date: repairCase.createdAt, description: 'Product registered for repair assessment.', actor: 'Customer' },
            { type: 'DIAGNOSED', date: new Date(), description: `AI-assisted diagnosis completed. Category: ${repairCase.category}.`, actor: 'System' },
            { type: 'BEYOND_REPAIR_CONFIRMED', date: new Date(), description: `Technician decision: ${repairDecision}. Notes: ${inspectionNotes}`, actor: 'Technician', actorId: req.user!._id },
          ],
          currentStatus: 'Recovery Eligible',
          recoveryCompleted: false,
        });
        await RepairCase.findByIdAndUpdate(repairCase._id, { productPassportId: passport._id });
      } else {
        existingPassport.events.push({
          type: 'BEYOND_REPAIR_CONFIRMED',
          date: new Date(),
          description: `Technician decision: ${repairDecision}. Notes: ${inspectionNotes}`,
          actor: 'Technician',
          actorId: req.user!._id,
        } as any);
        existingPassport.currentStatus = 'Recovery Eligible';
        await existingPassport.save();
      }

      // Notify customer
      await Notification.create({
        userId: repairCase.userId,
        title: recoveryEligible ? 'Recovery Mode Activated' : 'Inspection Complete',
        message: recoveryEligible
          ? `Your ${repairCase.itemName} has been assessed as "${repairDecision}". Recovery options are now available — don't scrap it blind!`
          : `Technician has completed inspection of your ${repairCase.itemName}.`,
        type: 'STATUS_UPDATE',
        isRead: false,
      });
    }

    return res.status(201).json({ success: true, message: 'Inspection recorded.', data: inspection });
  } catch (err: any) {
    console.error('createInspection error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// GET /api/inspection/:caseId
export const getInspection = async (req: AuthRequest, res: Response) => {
  try {
    const inspection = await TechnicianInspection.findOne({ repairCaseId: req.params.caseId })
      .populate('technicianId', 'name email');
    if (!inspection) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No inspection found for this case' } });
    return res.json({ success: true, data: inspection });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// PATCH /api/inspection/:caseId/components  (REPAIRER only)
export const updateComponents = async (req: AuthRequest, res: Response) => {
  try {
    const { affectedComponents } = req.body;
    const inspection = await TechnicianInspection.findOneAndUpdate(
      { repairCaseId: req.params.caseId, technicianId: req.user!._id },
      { affectedComponents },
      { new: true }
    );
    if (!inspection) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Inspection not found or not yours' } });
    return res.json({ success: true, data: inspection });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
