import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { RepairCase } from '../models/RepairCase';
import { TechnicianInspection } from '../models/TechnicianInspection';
import { RecoveryAssessment } from '../models/RecoveryAssessment';
import { RecoveryComponent } from '../models/RecoveryComponent';
import { RecoveryOffer } from '../models/RecoveryOffer';
import { RecoveryPickup } from '../models/RecoveryPickup';
import { RecoveryPartner } from '../models/RecoveryPartner';
import { ProductPassport } from '../models/ProductPassport';
import { MaterialRate } from '../models/MaterialRate';
import { Notification } from '../models/Notification';
import { assessRecoveryPotential, calculateIndicativeValue } from '../services/RecoveryEngine';

// POST /api/recovery/assess/:caseId  (REPAIRER)
export const createAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const repairCase = await RepairCase.findById(req.params.caseId);
    if (!repairCase) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found' } });

    const inspection = await TechnicianInspection.findOne({ repairCaseId: repairCase._id });
    if (!inspection || !inspection.recoveryEligible) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: 'Case is not recovery eligible. Technician must mark BEYOND_REPAIR first.' } });
    }

    // Get material rates for indicative valuation
    const rates = await MaterialRate.find({ isDemoData: true }).lean();
    const potential = assessRecoveryPotential(repairCase.category, inspection.repairDecision, inspection.inspectionNotes);
    const valuation = calculateIndicativeValue(repairCase.category, rates.map((r) => ({ material: r.material, ratePerKg: r.ratePerKg })));

    const existing = await RecoveryAssessment.findOne({ repairCaseId: repairCase._id });
    if (existing) {
      return res.json({ success: true, message: 'Assessment already exists', data: existing });
    }

    const assessment = await RecoveryAssessment.create({
      repairCaseId: repairCase._id,
      technicianInspectionId: inspection._id,
      assessedBy: req.user!._id,
      reusePotential: potential.reusePotential,
      refurbishmentPotential: potential.refurbishmentPotential,
      componentRecoveryPotential: potential.componentRecoveryPotential,
      materialRecoveryPotential: potential.materialRecoveryPotential,
      specializedRecyclingRequired: potential.specializedRecyclingRequired,
      recommendedPathway: potential.recommendedPathway as any,
      pathwayReason: potential.pathwayReason,
      materialStreams: potential.materialStreams,
      indicativeValueMin: valuation.insufficientData ? undefined : valuation.indicativeMin,
      indicativeValueMax: valuation.insufficientData ? undefined : valuation.indicativeMax,
      valuationNote: valuation.disclaimer,
    });

    // Create RecoveryComponents
    const componentDocs = await Promise.all(
      potential.suggestedComponents.map((c) =>
        RecoveryComponent.create({
          recoveryAssessmentId: assessment._id,
          repairCaseId: repairCase._id,
          name: c.name,
          category: c.category,
          status: c.status as any,
          confidence: c.confidence as any,
          evidenceSource: c.evidenceSource,
          technicianVerified: false,
          partnerVerified: false,
        })
      )
    );

    assessment.components = componentDocs.map((d) => d._id) as any;
    await assessment.save();

    await RepairCase.findByIdAndUpdate(repairCase._id, { recoveryAssessmentId: assessment._id });

    // Update passport
    await ProductPassport.findOneAndUpdate(
      { repairCaseId: repairCase._id },
      {
        $push: {
          events: {
            type: 'RECOVERY_STARTED',
            date: new Date(),
            description: `Recovery assessment completed. Recommended pathway: ${potential.recommendedPathway}. ${potential.pathwayReason}`,
            actor: 'Technician',
            actorId: req.user!._id,
          },
        },
        currentStatus: 'Recovery Assessment Complete',
      }
    );

    return res.status(201).json({ success: true, data: assessment });
  } catch (err: any) {
    console.error('createAssessment error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// GET /api/recovery/assess/:caseId
export const getAssessment = async (req: AuthRequest, res: Response) => {
  try {
    const assessment = await RecoveryAssessment.findOne({ repairCaseId: req.params.caseId })
      .populate('components');
    if (!assessment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No assessment found' } });
    return res.json({ success: true, data: assessment });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// GET /api/recovery/offers/:caseId  (CUSTOMER)
export const getOffers = async (req: AuthRequest, res: Response) => {
  try {
    const offers = await RecoveryOffer.find({ repairCaseId: req.params.caseId, status: { $in: ['PENDING', 'ACCEPTED'] } })
      .populate({ path: 'partnerId', select: 'businessName partnerType verificationStatus' })
      .sort({ netOffer: -1 });
    return res.json({ success: true, data: offers });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// POST /api/recovery/offers/:caseId/accept  (CUSTOMER)
export const acceptOffer = async (req: AuthRequest, res: Response) => {
  try {
    const { offerId } = req.body;
    if (!offerId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'offerId required' } });

    const repairCase = await RepairCase.findById(req.params.caseId);
    if (!repairCase || repairCase.userId.toString() !== req.user!._id.toString()) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your case' } });
    }

    const offer = await RecoveryOffer.findById(offerId);
    if (!offer || offer.repairCaseId.toString() !== req.params.caseId) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Offer not found' } });
    }
    if (offer.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: 'Offer is no longer available' } });
    }

    // Accept this offer, reject others
    await RecoveryOffer.updateMany({ repairCaseId: req.params.caseId, _id: { $ne: offerId }, status: 'PENDING' }, { status: 'REJECTED' });
    offer.status = 'ACCEPTED';
    await offer.save();

    // Create pickup record
    const pickup = await RecoveryPickup.create({
      repairCaseId: repairCase._id,
      recoveryOfferId: offer._id,
      partnerId: offer.partnerId,
      customerId: req.user!._id,
      status: 'OFFER_ACCEPTED',
      statusHistory: [{ status: 'OFFER_ACCEPTED', timestamp: new Date(), note: 'Customer accepted offer', updatedBy: req.user!._id }],
    });

    await RepairCase.findByIdAndUpdate(repairCase._id, { status: 'IN_RECOVERY' });

    // Update passport
    await ProductPassport.findOneAndUpdate(
      { repairCaseId: repairCase._id },
      {
        $push: { events: { type: 'RECOVERY_STARTED', date: new Date(), description: 'Recovery offer accepted. Pickup scheduled.', actor: 'Customer', actorId: req.user!._id } },
        currentStatus: 'Pickup Pending',
      }
    );

    // Notify partner
    await Notification.create({
      userId: offer.partnerUserId,
      title: 'Recovery Offer Accepted!',
      message: `Your offer for Case #${repairCase._id} has been accepted. Please schedule pickup.`,
      type: 'STATUS_UPDATE',
      isRead: false,
    });

    return res.json({ success: true, data: { offer, pickup } });
  } catch (err: any) {
    console.error('acceptOffer error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// GET /api/recovery/pickup/:caseId
export const getPickup = async (req: AuthRequest, res: Response) => {
  try {
    const pickup = await RecoveryPickup.findOne({ repairCaseId: req.params.caseId })
      .populate({ path: 'partnerId', select: 'businessName partnerType verificationStatus' })
      .populate({ path: 'recoveryOfferId', select: 'grossOffer pickupFee netOffer pathway conditions' });
    if (!pickup) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No pickup found' } });
    return res.json({ success: true, data: pickup });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// PATCH /api/recovery/pickup/:pickupId/status  (RECOVERY_PARTNER)
export const updatePickupStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status, note, scheduledDate, verifiedWeightKg, recoveredComponents } = req.body;
    const validStatuses = ['PICKUP_SCHEDULED','PICKUP_ASSIGNED','PICKUP_IN_PROGRESS','ITEM_COLLECTED','RECEIVED_BY_PARTNER','PROCESSING','RECOVERY_COMPLETED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid status' } });
    }

    const pickup = await RecoveryPickup.findById(req.params.pickupId);
    if (!pickup) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Pickup not found' } });

    pickup.status = status;
    pickup.statusHistory.push({ status, timestamp: new Date(), note: note || '', updatedBy: req.user!._id } as any);
    if (scheduledDate) pickup.scheduledDate = new Date(scheduledDate);
    if (verifiedWeightKg) pickup.verifiedWeightKg = verifiedWeightKg;
    if (recoveredComponents) pickup.recoveredComponents = recoveredComponents;

    if (status === 'RECOVERY_COMPLETED') {
      pickup.completionCertificateGenerated = true;
      await RepairCase.findByIdAndUpdate(pickup.repairCaseId, { status: 'RECOVERY_COMPLETED' });
      await ProductPassport.findOneAndUpdate(
        { repairCaseId: pickup.repairCaseId },
        {
          $push: { events: { type: 'RECOVERY_COMPLETED', date: new Date(), description: 'Recovery completed by partner. Certificate issued.', actor: 'Recovery Partner', actorId: req.user!._id } },
          currentStatus: 'Recovery Completed',
          recoveryCompleted: true,
        }
      );
      // Notify customer
      const repairCase = await RepairCase.findById(pickup.repairCaseId);
      if (repairCase) {
        await Notification.create({
          userId: repairCase.userId,
          title: '♻️ Recovery Completed!',
          message: `The recovery of your ${repairCase.itemName} has been completed. Your Recovery Certificate is now available.`,
          type: 'STATUS_UPDATE',
          isRead: false,
        });
      }
    }

    await pickup.save();
    return res.json({ success: true, data: pickup });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// GET /api/recovery/passport/:caseId
export const getPassport = async (req: AuthRequest, res: Response) => {
  try {
    const passport = await ProductPassport.findOne({ repairCaseId: req.params.caseId });
    if (!passport) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No passport found for this case' } });
    return res.json({ success: true, data: passport });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// GET /api/recovery/certificate/:caseId
export const getCertificate = async (req: AuthRequest, res: Response) => {
  try {
    const repairCase = await RepairCase.findById(req.params.caseId).lean();
    if (!repairCase) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found' } });

    const passport = await ProductPassport.findOne({ repairCaseId: req.params.caseId }).lean();
    const pickup = await RecoveryPickup.findOne({ repairCaseId: req.params.caseId })
      .populate({ path: 'partnerId', select: 'businessName partnerType' }).lean();
    const assessment = await RecoveryAssessment.findOne({ repairCaseId: req.params.caseId }).lean();

    const certificate = {
      certificateId: `RC-CERT-${(repairCase._id as any).toString().slice(-8).toUpperCase()}`,
      issueDate: new Date().toISOString(),
      product: { name: repairCase.itemName, category: repairCase.category, brand: repairCase.brand },
      decision: 'BEYOND_REPAIR / RECOVERY_ELIGIBLE',
      pathway: (assessment as any)?.recommendedPathway || 'MATERIAL_RECYCLING',
      recoveryPartner: (pickup as any)?.partnerId?.businessName || 'Pending',
      verifiedWeightKg: (pickup as any)?.verifiedWeightKg || null,
      recoveredComponents: (pickup as any)?.recoveredComponents || [],
      status: repairCase.status,
      isDemoData: true,
      disclaimer: 'DEMO CERTIFICATE — For demonstration purposes only. Not an official environmental certification.',
      events: passport?.events || [],
    };

    return res.json({ success: true, data: certificate });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// GET /api/recovery/dashboard  (ADMIN)
export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const [repaired, recovered, inRecovery, totalCases, offers, pickups] = await Promise.all([
      RepairCase.countDocuments({ status: { $in: ['COMPLETED', 'IN_REPAIR'] } }),
      RepairCase.countDocuments({ status: 'RECOVERY_COMPLETED' }),
      RepairCase.countDocuments({ status: { $in: ['RECOVERY_ELIGIBLE', 'IN_RECOVERY'] } }),
      RepairCase.countDocuments(),
      RecoveryOffer.countDocuments(),
      RecoveryPickup.find({ status: 'RECOVERY_COMPLETED' }).select('verifiedWeightKg').lean(),
    ]);
    const verifiedWeight = pickups.reduce((sum, p) => sum + (p.verifiedWeightKg || 0), 0);
    const totalRecovery = recovered + inRecovery;
    const completionRate = totalRecovery > 0 ? Math.round((recovered / totalRecovery) * 100) : 0;

    return res.json({
      success: true,
      data: {
        totalCases, repaired, recovered, inRecovery, totalRecovery,
        completionRate, offers, verifiedWeightKg: verifiedWeight,
        isDemoData: true,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
