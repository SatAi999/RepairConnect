import { Response } from 'express';
import { User } from '../models/User';
import { RepairerProfile } from '../models/RepairerProfile';
import { RepairCase } from '../models/RepairCase';
import { RepairRequest } from '../models/RepairRequest';
import { RepairKnowledge } from '../models/RepairKnowledge';
import { Notification } from '../models/Notification';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';

export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'CUSTOMER' });
    const totalRepairers = await User.countDocuments({ role: 'REPAIRER' });
    const totalCases = await RepairCase.countDocuments({ status: { $ne: 'ARCHIVED' } });
    
    // Aggregate request statuses
    const requests = await RepairRequest.find();
    const totalRequests = requests.length;
    const completedRepairs = requests.filter(r => r.status === 'COMPLETED').length;
    const activeRequests = requests.filter(r => 
      !['COMPLETED', 'REJECTED', 'CANCELLED', 'REQUESTED'].includes(r.status)
    ).length;

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalCustomers,
        totalRepairers,
        totalCases,
        totalRequests,
        completedRepairs,
        activeRequests,
      },
    });
  } catch (error: any) {
    console.error('Get Stats Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to aggregate system statistics.' },
    });
  }
};

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    const profiles = await RepairerProfile.find().populate('userId', 'name email phone avatar').sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: { users, profiles } });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve users.' },
    });
  }
};

export const getKnowledge = async (req: AuthRequest, res: Response) => {
  try {
    const knowledge = await RepairKnowledge.find().sort({ category: 1 });
    return res.status(200).json({ success: true, data: knowledge });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve repair knowledge.' },
    });
  }
};

export const createOrUpdateKnowledge = async (req: AuthRequest, res: Response) => {
  try {
    const { category, services, replacementMin, replacementMax, safetyWarnings, typicalCauses, weight, co2Avoided } = req.body;

    if (!category || !services || replacementMin === undefined || replacementMax === undefined) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Category, services, and replacement pricing ranges are required.' },
      });
    }

    const knowledge = await RepairKnowledge.findOneAndUpdate(
      { category },
      {
        category,
        services,
        replacementMin,
        replacementMax,
        safetyWarnings: safetyWarnings || [],
        typicalCauses: typicalCauses || [],
        weight: weight || 0,
        co2Avoided: co2Avoided || 0,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Repair knowledge reference updated successfully.',
      data: knowledge,
    });
  } catch (error: any) {
    console.error('Create/Update Knowledge Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to save repair knowledge.' },
    });
  }
};

export const deleteKnowledge = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid knowledge ID.' },
      });
    }

    const result = await RepairKnowledge.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Knowledge reference not found.' },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Knowledge reference deleted successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete knowledge reference.' },
    });
  }
};

export const verifyRepairer = async (req: AuthRequest, res: Response) => {
  try {
    const { profileId } = req.params;
    const { status } = req.body; // 'VERIFIED' | 'SUSPENDED' | 'PENDING'

    if (!mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid profile ID.' },
      });
    }

    if (!['VERIFIED', 'SUSPENDED', 'PENDING'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid verification status.' },
      });
    }

    const profile = await RepairerProfile.findByIdAndUpdate(
      profileId,
      { verificationStatus: status },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Repairer profile not found.' },
      });
    }

    // Push notification to repairer
    await Notification.create({
      userId: profile.userId,
      title: 'Verification Status Changed',
      message: `Your repairer account status has been updated to: ${status}.`,
      type: status === 'VERIFIED' ? 'success' : 'warning',
    });

    return res.status(200).json({
      success: true,
      message: 'Repairer verification status updated successfully.',
      data: profile,
    });
  } catch (error: any) {
    console.error('Verify Repairer Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update repairer verification status.' },
    });
  }
};
