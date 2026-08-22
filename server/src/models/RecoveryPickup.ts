import { Schema, model, Document, Types } from 'mongoose';

export type PickupStatus =
  | 'OFFER_ACCEPTED' | 'PICKUP_SCHEDULED' | 'PICKUP_ASSIGNED'
  | 'PICKUP_IN_PROGRESS' | 'ITEM_COLLECTED' | 'RECEIVED_BY_PARTNER'
  | 'PROCESSING' | 'RECOVERY_COMPLETED';

export interface IPickupEvidence {
  fileUrl: string;
  fileType: string;
  description: string;
  uploadedBy: Types.ObjectId;
  uploadedAt: Date;
}

export interface IPickupStatusEvent {
  status: PickupStatus;
  timestamp: Date;
  note?: string;
  updatedBy: Types.ObjectId;
}

export interface IRecoveryPickup extends Document {
  repairCaseId: Types.ObjectId;
  recoveryOfferId: Types.ObjectId;
  partnerId: Types.ObjectId;
  customerId: Types.ObjectId;
  status: PickupStatus;
  statusHistory: IPickupStatusEvent[];
  scheduledDate?: Date;
  evidence: IPickupEvidence[];
  verifiedWeightKg?: number;
  recoveredComponents?: string[];
  completionCertificateGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RecoveryPickupSchema = new Schema<IRecoveryPickup>(
  {
    repairCaseId: { type: Schema.Types.ObjectId, ref: 'RepairCase', required: true },
    recoveryOfferId: { type: Schema.Types.ObjectId, ref: 'RecoveryOffer', required: true },
    partnerId: { type: Schema.Types.ObjectId, ref: 'RecoveryPartner', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['OFFER_ACCEPTED','PICKUP_SCHEDULED','PICKUP_ASSIGNED','PICKUP_IN_PROGRESS',
             'ITEM_COLLECTED','RECEIVED_BY_PARTNER','PROCESSING','RECOVERY_COMPLETED'],
      default: 'OFFER_ACCEPTED',
    },
    statusHistory: [
      {
        status: { type: String },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    scheduledDate: { type: Date },
    evidence: [
      {
        fileUrl: { type: String },
        fileType: { type: String },
        description: { type: String },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    verifiedWeightKg: { type: Number },
    recoveredComponents: [{ type: String }],
    completionCertificateGenerated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

RecoveryPickupSchema.index({ repairCaseId: 1 });
RecoveryPickupSchema.index({ partnerId: 1 });

export const RecoveryPickup = model<IRecoveryPickup>('RecoveryPickup', RecoveryPickupSchema);
