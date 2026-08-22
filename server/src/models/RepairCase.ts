import { Schema, model, Types } from 'mongoose';

export interface IRepairCase {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  category: string;
  itemName: string;
  brand: string;
  model?: string;
  problemDescription: string;
  media: string[];
  diagnosisId?: Types.ObjectId;
  estimateId?: Types.ObjectId;
  recommendation?: string;
  status:
    | 'DIAGNOSED' | 'REQUESTED' | 'IN_REPAIR' | 'COMPLETED' | 'ARCHIVED'
    | 'BEYOND_REPAIR' | 'RECOVERY_ELIGIBLE' | 'IN_RECOVERY' | 'RECOVERY_COMPLETED';
  technicianInspectionId?: Types.ObjectId;
  recoveryAssessmentId?: Types.ObjectId;
  productPassportId?: Types.ObjectId;
  diagnosticSessionId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RepairCaseSchema = new Schema<IRepairCase>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true },
    itemName: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    model: { type: String, trim: true },
    problemDescription: { type: String, required: true },
    media: [{ type: String }],
    diagnosisId: { type: Schema.Types.ObjectId, ref: 'AIDiagnosis' },
    estimateId: { type: Schema.Types.ObjectId, ref: 'RepairEstimate' },
    recommendation: { type: String },
    status: {
      type: String,
      enum: [
        'DIAGNOSED', 'REQUESTED', 'IN_REPAIR', 'COMPLETED', 'ARCHIVED',
        'BEYOND_REPAIR', 'RECOVERY_ELIGIBLE', 'IN_RECOVERY', 'RECOVERY_COMPLETED',
      ],
      default: 'DIAGNOSED',
    },
    technicianInspectionId: { type: Schema.Types.ObjectId, ref: 'TechnicianInspection' },
    recoveryAssessmentId: { type: Schema.Types.ObjectId, ref: 'RecoveryAssessment' },
    productPassportId: { type: Schema.Types.ObjectId, ref: 'ProductPassport' },
    diagnosticSessionId: { type: Schema.Types.ObjectId, ref: 'DiagnosticSession' },
  },
  { timestamps: true }
);

RepairCaseSchema.index({ userId: 1 });
RepairCaseSchema.index({ status: 1 });

export const RepairCase = model<IRepairCase>('RepairCase', RepairCaseSchema);
