import { Schema, model, Document, Types } from 'mongoose';

export interface IVisionDetection {
  class: string;
  confidence: number;
  bbox: number[]; // [x1, y1, x2, y2]
  source: string;
  evidenceLevel: 'VISIBLE' | 'POSSIBLE' | 'CONFIRMED';
  requiresHumanVerification: boolean;
}

export interface IVisionAnalysis extends Document {
  repairCaseId: Types.ObjectId;
  imageUrl: string;
  imageIndex: number;
  primaryDetection?: IVisionDetection;
  detections: IVisionDetection[];
  imageQuality: {
    passed: boolean;
    blurScore?: number;
    brightness?: number;
    issues?: string[];
  };
  ocrResult?: {
    rawText?: string;
    brand?: string;
    model?: string;
    confidence?: number;
  };
  processingNote: string;
  modelInfo: {
    model: string;
    source: string;
  };
  createdAt: Date;
}

const VisionAnalysisSchema = new Schema<IVisionAnalysis>(
  {
    repairCaseId: { type: Schema.Types.ObjectId, ref: 'RepairCase', required: true },
    imageUrl: { type: String, required: true },
    imageIndex: { type: Number, default: 0 },
    primaryDetection: {
      class: { type: String },
      confidence: { type: Number },
      bbox: [{ type: Number }],
      source: { type: String },
      evidenceLevel: { type: String, enum: ['VISIBLE', 'POSSIBLE', 'CONFIRMED'] },
      requiresHumanVerification: { type: Boolean },
    },
    detections: [
      {
        class: { type: String },
        confidence: { type: Number },
        bbox: [{ type: Number }],
        source: { type: String },
        evidenceLevel: { type: String, enum: ['VISIBLE', 'POSSIBLE', 'CONFIRMED'] },
        requiresHumanVerification: { type: Boolean },
      },
    ],
    imageQuality: {
      passed: { type: Boolean, default: true },
      blurScore: { type: Number },
      brightness: { type: Number },
      issues: [{ type: String }],
    },
    ocrResult: {
      rawText: { type: String },
      brand: { type: String },
      model: { type: String },
      confidence: { type: Number },
    },
    processingNote: { type: String },
    modelInfo: {
      model: { type: String, default: 'YOLOv8s' },
      source: { type: String, default: 'COCO pretrained' },
    },
  },
  { timestamps: true }
);

VisionAnalysisSchema.index({ repairCaseId: 1 });

export const VisionAnalysis = model<IVisionAnalysis>('VisionAnalysis', VisionAnalysisSchema);
