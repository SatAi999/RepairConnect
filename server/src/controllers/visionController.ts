import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { RepairCase } from '../models/RepairCase';
import { VisionAnalysis, IVisionDetection } from '../models/VisionAnalysis';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

export const analyzeImage = async (req: AuthRequest, res: Response) => {
  try {
    const { caseId } = req.params;
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No file uploaded.' },
      });
    }

    const repairCase = await RepairCase.findById(caseId);
    if (!repairCase) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Case not found' },
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const filePath = req.file.path;

    let detections: IVisionDetection[] = [];
    let imageQuality = { passed: true, blurScore: 120.0, brightness: 130.0, issues: [] as string[] };
    let ocrResult = { rawText: 'No text extracted', brand: repairCase.brand, model: repairCase.model, confidence: 0.5 };
    let modelInfo = { model: 'YOLOv11n', source: 'Local D:/Computer_Vision' };
    let note = 'Simulation fallback used.';

    try {
      // Check if Python vision service is running
      const fileBuffer = fs.readFileSync(filePath);
      const blob = new Blob([fileBuffer], { type: req.file.mimetype });
      const formData = new FormData();
      formData.append('file', blob, req.file.originalname);

      console.log(`[VisionController] Forwarding image to python vision service at http://127.0.0.1:5010/analyze...`);
      const response = await fetch('http://127.0.0.1:5010/analyze', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json() as any;
      if (result && result.success) {
        detections = result.detections || [];
        imageQuality = result.imageQuality || imageQuality;
        ocrResult = result.ocrResult || ocrResult;
        modelInfo = result.modelInfo || modelInfo;
        note = result.processingNote || 'Processed by live python engine.';
      } else {
        console.warn('[VisionController] Python service returned failure:', result?.error);
      }
    } catch (err: any) {
      console.warn('[VisionController] Python service unavailable, using simulation fallback:', err.message);
      // Fallback
      let classLabel = repairCase.category;
      detections = [
        {
          class: classLabel,
          confidence: 0.88,
          bbox: [100, 150, 450, 400],
          source: 'YOLOv11n (Simulated)',
          evidenceLevel: 'VISIBLE',
          requiresHumanVerification: false,
        }
      ];
      if (repairCase.category.toLowerCase().includes('laptop')) {
        detections.push({
          class: 'Keyboard',
          confidence: 0.75,
          bbox: [120, 320, 420, 380],
          source: 'YOLOv11n (Simulated)',
          evidenceLevel: 'VISIBLE',
          requiresHumanVerification: false,
        });
      }
    }

    const primaryDetection = detections[0] || {
      class: repairCase.category,
      confidence: 0.85,
      bbox: [0, 0, 0, 0],
      source: 'YOLOv11n',
      evidenceLevel: 'VISIBLE',
      requiresHumanVerification: false,
    };

    const visionAnalysis = await VisionAnalysis.create({
      repairCaseId: repairCase._id,
      imageUrl: fileUrl,
      imageIndex: 0,
      primaryDetection,
      detections,
      imageQuality,
      ocrResult,
      processingNote: note,
      modelInfo,
    });

    // Update RepairCase media array
    await RepairCase.findByIdAndUpdate(caseId, {
      $push: { media: fileUrl },
      visionAnalysisId: visionAnalysis._id,
    });

    return res.status(200).json({
      success: true,
      data: visionAnalysis,
    });
  } catch (error: any) {
    console.error('analyzeImage error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Image analysis failed.' },
    });
  }
};

export const getVisionAnalysis = async (req: AuthRequest, res: Response) => {
  try {
    const { caseId } = req.params;
    const analysis = await VisionAnalysis.find({ repairCaseId: caseId }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Failed to retrieve analysis.' },
    });
  }
};
