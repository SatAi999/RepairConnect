import { Schema, model, Document, Types } from 'mongoose';

export type PotentialLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
export type RecoveryPathway =
  | 'REUSE' | 'REFURBISH' | 'COMPONENT_RECOVERY'
  | 'MATERIAL_RECYCLING' | 'SPECIAL_HANDLING' | 'RESPONSIBLE_DISPOSAL';

export interface IMaterialStream {
  material: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  evidenceSource: string;
  verificationStatus: 'UNVERIFIED' | 'TECHNICIAN_ASSESSED' | 'PARTNER_VERIFIED';
}

export interface IRecoveryAssessment extends Document {
  repairCaseId: Types.ObjectId;
  technicianInspectionId: Types.ObjectId;
  assessedBy: Types.ObjectId;
  reusePotential: PotentialLevel;
  refurbishmentPotential: PotentialLevel;
  componentRecoveryPotential: PotentialLevel;
  materialRecoveryPotential: PotentialLevel;
  specializedRecyclingRequired: boolean;
  recommendedPathway: RecoveryPathway;
  pathwayReason: string;
  components: Types.ObjectId[];
  materialStreams: IMaterialStream[];
  indicativeValueMin?: number;
  indicativeValueMax?: number;
  valuationNote: string;
  createdAt: Date;
  updatedAt: Date;
}

const RecoveryAssessmentSchema = new Schema<IRecoveryAssessment>(
  {
    repairCaseId: { type: Schema.Types.ObjectId, ref: 'RepairCase', required: true },
    technicianInspectionId: { type: Schema.Types.ObjectId, ref: 'TechnicianInspection', required: true },
    assessedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reusePotential: { type: String, enum: ['NONE', 'LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
    refurbishmentPotential: { type: String, enum: ['NONE', 'LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
    componentRecoveryPotential: { type: String, enum: ['NONE', 'LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
    materialRecoveryPotential: { type: String, enum: ['NONE', 'LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
    specializedRecyclingRequired: { type: Boolean, default: false },
    recommendedPathway: {
      type: String,
      enum: ['REUSE', 'REFURBISH', 'COMPONENT_RECOVERY', 'MATERIAL_RECYCLING', 'SPECIAL_HANDLING', 'RESPONSIBLE_DISPOSAL'],
      default: 'MATERIAL_RECYCLING',
    },
    pathwayReason: { type: String, default: '' },
    components: [{ type: Schema.Types.ObjectId, ref: 'RecoveryComponent' }],
    materialStreams: [
      {
        material: { type: String, required: true },
        confidence: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
        evidenceSource: { type: String, default: 'Product category knowledge' },
        verificationStatus: {
          type: String,
          enum: ['UNVERIFIED', 'TECHNICIAN_ASSESSED', 'PARTNER_VERIFIED'],
          default: 'UNVERIFIED',
        },
      },
    ],
    indicativeValueMin: { type: Number },
    indicativeValueMax: { type: Number },
    valuationNote: {
      type: String,
      default: 'INDICATIVE ONLY — DEMO MARKET RATE DATA. Not a real market valuation.',
    },
  },
  { timestamps: true }
);

RecoveryAssessmentSchema.index({ repairCaseId: 1 });

export const RecoveryAssessment = model<IRecoveryAssessment>('RecoveryAssessment', RecoveryAssessmentSchema);
