import { Response } from 'express';
import { RepairCase } from '../models/RepairCase';
import { RepairRequest } from '../models/RepairRequest';
import { AIDiagnosis } from '../models/AIDiagnosis';
import { RepairEstimate } from '../models/RepairEstimate';
import { Notification } from '../models/Notification';
import { AIService } from '../services/AIService';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import path from 'path';

export const createRepairCase = async (req: AuthRequest, res: Response) => {
  try {
    const { itemName, category, brand, model, problemDescription, media } = req.body;

    if (!itemName || !category || !brand || !problemDescription) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Item name, category, brand, and problem description are required.' },
      });
    }

    const newCase = await RepairCase.create({
      userId: req.user!._id,
      category,
      itemName,
      brand,
      model,
      problemDescription,
      media: media || [],
      status: 'DIAGNOSED',
    });

    return res.status(201).json({
      success: true,
      message: 'Repair case created successfully',
      data: newCase,
    });
  } catch (error: any) {
    console.error('Create Case Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create repair case.' },
    });
  }
};

export const getMyRepairCases = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const cases = await RepairCase.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: cases,
    });
  } catch (error: any) {
    console.error('Get Cases Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve repair cases.' },
    });
  }
};

export const getRepairCaseById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid repair case ID.' },
      });
    }

    const repairCase = await RepairCase.findById(id)
      .populate('diagnosisId')
      .populate('estimateId');

    if (!repairCase) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Repair case not found.' },
      });
    }

    // Permission check
    const isOwner = repairCase.userId.toString() === userId.toString();
    const isAdmin = req.user!.role === 'ADMIN';

    let hasRepairerAccess = false;
    if (req.user!.role === 'REPAIRER') {
      // Find if there is an active repair request for this case assigned to this repairer
      const request = await RepairRequest.findOne({
        repairCaseId: repairCase._id,
      }).populate('repairerId');

      if (request) {
        const repairerProfile = request.repairerId as any;
        if (repairerProfile && repairerProfile.userId.toString() === userId.toString()) {
          hasRepairerAccess = true;
        }
      }
    }

    if (!isOwner && !isAdmin && !hasRepairerAccess) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to view this repair case.' },
      });
    }

    return res.status(200).json({
      success: true,
      data: repairCase,
    });
  } catch (error: any) {
    console.error('Get Case By ID Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve repair case.' },
    });
  }
};

export const updateRepairCase = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;
    const { itemName, category, brand, model, problemDescription, media } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid repair case ID.' },
      });
    }

    const repairCase = await RepairCase.findById(id);

    if (!repairCase) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Repair case not found.' },
      });
    }

    // Permission check
    const isOwner = repairCase.userId.toString() === userId.toString();
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to update this repair case.' },
      });
    }

    if (itemName) repairCase.itemName = itemName;
    if (category) repairCase.category = category;
    if (brand) repairCase.brand = brand;
    if (model) repairCase.model = model;
    if (problemDescription) repairCase.problemDescription = problemDescription;
    if (media) repairCase.media = media;

    await repairCase.save();

    return res.status(200).json({
      success: true,
      message: 'Repair case updated successfully',
      data: repairCase,
    });
  } catch (error: any) {
    console.error('Update Case Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update repair case.' },
    });
  }
};

export const deleteRepairCase = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid repair case ID.' },
      });
    }

    const repairCase = await RepairCase.findById(id);

    if (!repairCase) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Repair case not found.' },
      });
    }

    // Permission check
    const isOwner = repairCase.userId.toString() === userId.toString();
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to delete this repair case.' },
      });
    }

    // Soft delete / archive
    repairCase.status = 'ARCHIVED';
    await repairCase.save();

    return res.status(200).json({
      success: true,
      message: 'Repair case archived successfully',
    });
  } catch (error: any) {
    console.error('Delete Case Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete repair case.' },
    });
  }
};

/**
 * Triggers Multimodal AI Analysis for a Repair Case
 */
export const analyzeCase = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid repair case ID.' },
      });
    }

    const repairCase = await RepairCase.findById(id);
    if (!repairCase) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Repair case not found.' },
      });
    }

    // Permission check
    const isOwner = repairCase.userId.toString() === userId.toString();
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to analyze this case.' },
      });
    }

    // Determine path of the media file if present
    let absoluteMediaPath: string | undefined;
    if (repairCase.media && repairCase.media.length > 0) {
      // Clean target name and resolve against local uploads folder
      const mediaFilename = path.basename(repairCase.media[0]);
      absoluteMediaPath = path.join(__dirname, '../../uploads', mediaFilename);
    }

    console.log(`[AIService] Starting analysis for case ${id}. Category: ${repairCase.category}`);
    
    // 1. Run AI analysis
    const diagnosisResult = await AIService.analyzeDamage(
      repairCase.problemDescription,
      absoluteMediaPath
    );

    // 2. Run worthiness assessment engine (age defaults to 2 years if unknown)
    const assessmentResult = await AIService.generateRepairAssessment(
      repairCase.category,
      diagnosisResult,
      2 
    );

    // 3. Save AI Diagnosis document
    const diagnosisRecord = await AIDiagnosis.create({
      repairCaseId: repairCase._id,
      itemCategory: diagnosisResult.itemCategory,
      identifiedItem: diagnosisResult.identifiedItem,
      visibleDamage: diagnosisResult.visibleDamage,
      possibleCauses: diagnosisResult.possibleCauses,
      confidence: diagnosisResult.confidence,
      troubleshootingSteps: diagnosisResult.troubleshootingSteps,
      safetyWarnings: diagnosisResult.safetyWarnings,
      limitations: diagnosisResult.limitations,
    });

    // 4. Save Estimate document
    const estimateRecord = await RepairEstimate.create({
      repairCaseId: repairCase._id,
      estimatedMin: assessmentResult.estimatedMin,
      estimatedMax: assessmentResult.estimatedMax,
      replacementMin: assessmentResult.replacementMin,
      replacementMax: assessmentResult.replacementMax,
      currency: assessmentResult.currency,
      repairabilityScore: assessmentResult.repairabilityScore,
      recommendation: assessmentResult.recommendation,
      reasoning: assessmentResult.reasoning,
    });

    // 5. Update repair case links
    repairCase.diagnosisId = diagnosisRecord._id as mongoose.Types.ObjectId;
    repairCase.estimateId = estimateRecord._id as mongoose.Types.ObjectId;
    repairCase.recommendation = assessmentResult.recommendation;
    repairCase.status = 'DIAGNOSED';
    await repairCase.save();

    // 6. Push user notification
    await Notification.create({
      userId,
      title: 'Diagnosis Ready',
      message: `AI analysis and repairability assessment for your ${repairCase.itemName} is ready to view.`,
      type: 'success',
      link: `/cases/${repairCase._id}`,
    });

    return res.status(200).json({
      success: true,
      message: 'Case analysis completed successfully',
      data: {
        diagnosis: diagnosisRecord,
        estimate: estimateRecord,
        repairCase,
      },
    });
  } catch (error: any) {
    console.error('Analyze Case Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to execute AI analysis.' },
    });
  }
};
