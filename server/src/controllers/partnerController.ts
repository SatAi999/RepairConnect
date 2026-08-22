import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { RecoveryPartner } from '../models/RecoveryPartner';
import { RecoveryOffer } from '../models/RecoveryOffer';
import { RecoveryPickup } from '../models/RecoveryPickup';
import { RepairCase } from '../models/RepairCase';
import mongoose from 'mongoose';

// POST /api/partners/register  (RECOVERY_PARTNER user)
export const registerPartner = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'RECOVERY_PARTNER' && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only RECOVERY_PARTNER role can register as a partner.' } });
    }
    const existing = await RecoveryPartner.findOne({ userId: req.user!._id });
    if (existing) return res.json({ success: true, message: 'Already registered', data: existing });

    const { businessName, partnerType, serviceCategories, description, contactEmail, contactPhone, lng, lat } = req.body;
    if (!businessName || !partnerType) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'businessName and partnerType required' } });
    }

    const partner = await RecoveryPartner.create({
      userId: req.user!._id,
      businessName,
      partnerType,
      verificationStatus: 'PENDING',
      location: { type: 'Point', coordinates: [lng || 77.5946, lat || 12.9716] },
      serviceRadius: 50,
      serviceCategories: serviceCategories || [],
      description,
      contactEmail: contactEmail || req.user!.email,
      contactPhone,
      isDemoData: false,
    });

    return res.status(201).json({ success: true, data: partner });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// GET /api/partners/profile  (RECOVERY_PARTNER)
export const getPartnerProfile = async (req: AuthRequest, res: Response) => {
  try {
    const partner = await RecoveryPartner.findOne({ userId: req.user!._id });
    if (!partner) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Partner profile not found. Please register first.' } });
    return res.json({ success: true, data: partner });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// GET /api/partners/cases  (RECOVERY_PARTNER — eligible cases)
export const getEligibleCases = async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.query;
    const filter: any = { status: { $in: ['RECOVERY_ELIGIBLE', 'IN_RECOVERY'] } };
    if (category) filter.category = category;
    const cases = await RepairCase.find(filter)
      .populate({ path: 'technicianInspectionId', select: 'repairDecision inspectionNotes affectedComponents' })
      .populate({ path: 'recoveryAssessmentId', select: 'recommendedPathway materialStreams indicativeValueMin indicativeValueMax' })
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json({ success: true, data: cases });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// POST /api/partners/offers  (RECOVERY_PARTNER submit offer)
export const submitOffer = async (req: AuthRequest, res: Response) => {
  try {
    const partner = await RecoveryPartner.findOne({ userId: req.user!._id });
    if (!partner) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Partner profile not found' } });
    if (partner.verificationStatus !== 'VERIFIED') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only VERIFIED partners can submit offers.' } });
    }

    const { repairCaseId, grossOffer, pickupFee, conditions, pathway, pickupTimelineDays } = req.body;
    if (!repairCaseId || grossOffer === undefined || pickupFee === undefined) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'repairCaseId, grossOffer and pickupFee required' } });
    }

    const repairCase = await RepairCase.findById(repairCaseId);
    if (!repairCase || !['RECOVERY_ELIGIBLE', 'IN_RECOVERY'].includes(repairCase.status)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: 'Case is not eligible for recovery offers' } });
    }

    const existingOffer = await RecoveryOffer.findOne({ repairCaseId, partnerId: partner._id, status: 'PENDING' });
    if (existingOffer) return res.json({ success: true, message: 'Offer already submitted', data: existingOffer });

    const netOffer = Math.max(0, grossOffer - (pickupFee || 0));
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);

    const offer = await RecoveryOffer.create({
      repairCaseId,
      partnerId: partner._id,
      partnerUserId: req.user!._id,
      grossOffer,
      pickupFee: pickupFee || 0,
      netOffer,
      conditions,
      pathway: pathway || 'Material Recycling',
      pickupTimelineDays: pickupTimelineDays || 3,
      offerValidUntil: validUntil,
      isDemoOffer: false,
    });

    return res.status(201).json({ success: true, data: offer });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// GET /api/partners/offers
export const getMyOffers = async (req: AuthRequest, res: Response) => {
  try {
    const partner = await RecoveryPartner.findOne({ userId: req.user!._id });
    if (!partner) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Partner profile not found' } });
    const offers = await RecoveryOffer.find({ partnerId: partner._id })
      .populate({ path: 'repairCaseId', select: 'itemName category brand status' })
      .sort({ createdAt: -1 });
    return res.json({ success: true, data: offers });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// GET /api/partners/pickups
export const getMyPickups = async (req: AuthRequest, res: Response) => {
  try {
    const partner = await RecoveryPartner.findOne({ userId: req.user!._id });
    if (!partner) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Partner profile not found' } });
    const pickups = await RecoveryPickup.find({ partnerId: partner._id })
      .populate({ path: 'repairCaseId', select: 'itemName category brand status' })
      .sort({ createdAt: -1 });
    return res.json({ success: true, data: pickups });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
