import { Schema, model, Document, Types } from 'mongoose';

export type RepairDecision = 'REPAIRABLE' | 'ECONOMICALLY_IMPRACTICAL' | 'BEYOND_REPAIR' | 'CUSTOMER_DECLINED';

export interface ITechnicianInspection extends Document {
  repairCaseId: Types.ObjectId;
  repairRequestId?: Types.ObjectId;
  technicianId: Types.ObjectId;
  repairDecision: RepairDecision;
  inspectionNotes: string;
  affectedComponents: string[];
  evidencePhotos: string[];
  estimatedRepairCost?: number;
  recoveryEligible: boolean;
  confirmedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TechnicianInspectionSchema = new Schema<ITechnicianInspection>(
  {
    repairCaseId: { type: Schema.Types.ObjectId, ref: 'RepairCase', required: true },
    repairRequestId: { type: Schema.Types.ObjectId, ref: 'RepairRequest' },
    technicianId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    repairDecision: {
      type: String,
      enum: ['REPAIRABLE', 'ECONOMICALLY_IMPRACTICAL', 'BEYOND_REPAIR', 'CUSTOMER_DECLINED'],
      required: true,
    },
    inspectionNotes: { type: String, required: true },
    affectedComponents: [{ type: String }],
    evidencePhotos: [{ type: String }],
    estimatedRepairCost: { type: Number },
    recoveryEligible: { type: Boolean, default: false },
    confirmedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

TechnicianInspectionSchema.index({ repairCaseId: 1 });
TechnicianInspectionSchema.index({ technicianId: 1 });

export const TechnicianInspection = model<ITechnicianInspection>('TechnicianInspection', TechnicianInspectionSchema);
