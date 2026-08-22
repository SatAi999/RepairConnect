import { Schema, model, Document, Types } from 'mongoose';

export interface IRepairEstimate extends Document {
  repairCaseId: Types.ObjectId;
  estimatedMin: number;
  estimatedMax: number;
  replacementMin: number;
  replacementMax: number;
  currency: string;
  repairabilityScore: number; // 0 to 100
  recommendation: string; // e.g., 'repair_recommended' | 'worthwhile' | 'replace_recommended'
  reasoning: string;
  createdAt: Date;
}

const RepairEstimateSchema = new Schema<IRepairEstimate>(
  {
    repairCaseId: { type: Schema.Types.ObjectId, ref: 'RepairCase', required: true },
    estimatedMin: { type: Number, required: true },
    estimatedMax: { type: Number, required: true },
    replacementMin: { type: Number, required: true },
    replacementMax: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    repairabilityScore: { type: Number, required: true },
    recommendation: { type: String, required: true },
    reasoning: { type: String, required: true },
  },
  { timestamps: true }
);

RepairEstimateSchema.index({ repairCaseId: 1 });

export const RepairEstimate = model<IRepairEstimate>('RepairEstimate', RepairEstimateSchema);
