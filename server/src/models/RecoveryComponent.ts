import { Schema, model, Document, Types } from 'mongoose';

export type ComponentStatus =
  | 'POTENTIALLY_REUSABLE' | 'NEEDS_TESTING' | 'WORKING_VERIFIED'
  | 'FAILED' | 'MATERIAL_RECOVERY' | 'SPECIAL_HANDLING';

export interface IRecoveryComponent extends Document {
  recoveryAssessmentId: Types.ObjectId;
  repairCaseId: Types.ObjectId;
  name: string;
  category: string;
  status: ComponentStatus;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  evidenceSource: string;
  technicianVerified: boolean;
  partnerVerified: boolean;
  notes?: string;
  createdAt: Date;
}

const RecoveryComponentSchema = new Schema<IRecoveryComponent>(
  {
    recoveryAssessmentId: { type: Schema.Types.ObjectId, ref: 'RecoveryAssessment', required: true },
    repairCaseId: { type: Schema.Types.ObjectId, ref: 'RepairCase', required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    status: {
      type: String,
      enum: ['POTENTIALLY_REUSABLE', 'NEEDS_TESTING', 'WORKING_VERIFIED', 'FAILED', 'MATERIAL_RECOVERY', 'SPECIAL_HANDLING'],
      default: 'POTENTIALLY_REUSABLE',
    },
    confidence: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
    evidenceSource: { type: String, default: 'Technician observation' },
    technicianVerified: { type: Boolean, default: false },
    partnerVerified: { type: Boolean, default: false },
    notes: { type: String },
  },
  { timestamps: true }
);

RecoveryComponentSchema.index({ repairCaseId: 1 });

export const RecoveryComponent = model<IRecoveryComponent>('RecoveryComponent', RecoveryComponentSchema);
