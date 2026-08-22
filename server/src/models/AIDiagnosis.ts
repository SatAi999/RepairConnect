import { Schema, model, Document, Types } from 'mongoose';

export interface IPossibleCause {
  cause: string;
  confidence: number;
}

export interface IAIDiagnosis extends Document {
  repairCaseId: Types.ObjectId;
  itemCategory: string;
  identifiedItem: string;
  visibleDamage: string[];
  possibleCauses: IPossibleCause[];
  confidence: number;
  troubleshootingSteps: string[];
  safetyWarnings: string[];
  limitations: string[];
  createdAt: Date;
}

const AIDiagnosisSchema = new Schema<IAIDiagnosis>(
  {
    repairCaseId: { type: Schema.Types.ObjectId, ref: 'RepairCase', required: true },
    itemCategory: { type: String, required: true },
    identifiedItem: { type: String, required: true },
    visibleDamage: [{ type: String }],
    possibleCauses: [
      {
        cause: { type: String, required: true },
        confidence: { type: Number, required: true },
      },
    ],
    confidence: { type: Number, required: true },
    troubleshootingSteps: [{ type: String }],
    safetyWarnings: [{ type: String }],
    limitations: [{ type: String }],
  },
  { timestamps: true }
);

AIDiagnosisSchema.index({ repairCaseId: 1 });

export const AIDiagnosis = model<IAIDiagnosis>('AIDiagnosis', AIDiagnosisSchema);
