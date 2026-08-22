import { Schema, model, Document, Types } from 'mongoose';

export type RepairRequestStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'DIAGNOSIS'
  | 'ESTIMATE_PROVIDED'
  | 'APPROVED'
  | 'REPAIR_IN_PROGRESS'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export interface IRepairRequest extends Document {
  repairCaseId: Types.ObjectId;
  userId: Types.ObjectId; // Customer ID
  repairerId: Types.ObjectId; // Repairer User ID or Profile ID (let's reference RepairerProfile)
  customerDescription?: string;
  quotedAmount?: number;
  scheduledDate: Date;
  status: RepairRequestStatus;
  customerNotes?: string;
  repairerNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RepairRequestSchema = new Schema<IRepairRequest>(
  {
    repairCaseId: { type: Schema.Types.ObjectId, ref: 'RepairCase', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    repairerId: { type: Schema.Types.ObjectId, ref: 'RepairerProfile', required: true },
    customerDescription: { type: String },
    quotedAmount: { type: Number },
    scheduledDate: { type: Date, required: true },
    status: {
      type: String,
      enum: [
        'REQUESTED',
        'ACCEPTED',
        'DIAGNOSIS',
        'ESTIMATE_PROVIDED',
        'APPROVED',
        'REPAIR_IN_PROGRESS',
        'READY_FOR_PICKUP',
        'COMPLETED',
        'REJECTED',
        'CANCELLED',
      ],
      default: 'REQUESTED',
    },
    customerNotes: { type: String },
    repairerNotes: { type: String },
  },
  { timestamps: true }
);

RepairRequestSchema.index({ userId: 1 });
RepairRequestSchema.index({ repairerId: 1 });
RepairRequestSchema.index({ status: 1 });

export const RepairRequest = model<IRepairRequest>('RepairRequest', RepairRequestSchema);
