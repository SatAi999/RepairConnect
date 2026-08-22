import { Schema, model, Document, Types } from 'mongoose';

export interface IDiagnosticAnswer {
  questionId: string;
  question: string;
  answer: string;
  answeredAt: Date;
}

export interface IDiagnosticResult {
  primarySuspect: string;
  possibleAreas: string[];
  recommendedService: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'SAFETY_CRITICAL';
  cannotDetermineRemotely: string[];
  nextStep: string;
}

export interface IDiagnosticSession extends Document {
  repairCaseId: Types.ObjectId;
  userId: Types.ObjectId;
  category: string;
  answers: IDiagnosticAnswer[];
  safetyFlagged: boolean;
  safetyFlag?: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'SAFETY_ESCALATED';
  result?: IDiagnosticResult;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DiagnosticSessionSchema = new Schema<IDiagnosticSession>(
  {
    repairCaseId: { type: Schema.Types.ObjectId, ref: 'RepairCase', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true },
    answers: [
      {
        questionId: { type: String, required: true },
        question: { type: String, required: true },
        answer: { type: String, required: true },
        answeredAt: { type: Date, default: Date.now },
      },
    ],
    safetyFlagged: { type: Boolean, default: false },
    safetyFlag: { type: String },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'COMPLETED', 'SAFETY_ESCALATED'],
      default: 'IN_PROGRESS',
    },
    result: {
      primarySuspect: { type: String },
      possibleAreas: [{ type: String }],
      recommendedService: { type: String },
      severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'SAFETY_CRITICAL'] },
      cannotDetermineRemotely: [{ type: String }],
      nextStep: { type: String },
    },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

DiagnosticSessionSchema.index({ repairCaseId: 1 });
DiagnosticSessionSchema.index({ userId: 1 });

export const DiagnosticSession = model<IDiagnosticSession>('DiagnosticSession', DiagnosticSessionSchema);
