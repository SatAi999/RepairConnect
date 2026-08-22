import { Schema, model, Document, Types } from 'mongoose';

export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'WITHDRAWN';

export interface IRecoveryOffer extends Document {
  repairCaseId: Types.ObjectId;
  partnerId: Types.ObjectId;
  partnerUserId: Types.ObjectId;
  grossOffer: number;
  pickupFee: number;
  netOffer: number;
  conditions?: string;
  pathway: string;
  pickupTimelineDays: number;
  offerValidUntil: Date;
  status: OfferStatus;
  isDemoOffer: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RecoveryOfferSchema = new Schema<IRecoveryOffer>(
  {
    repairCaseId: { type: Schema.Types.ObjectId, ref: 'RepairCase', required: true },
    partnerId: { type: Schema.Types.ObjectId, ref: 'RecoveryPartner', required: true },
    partnerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    grossOffer: { type: Number, required: true, min: 0 },
    pickupFee: { type: Number, required: true, min: 0, default: 0 },
    netOffer: { type: Number, required: true },
    conditions: { type: String },
    pathway: { type: String, required: true },
    pickupTimelineDays: { type: Number, required: true, default: 3 },
    offerValidUntil: { type: Date, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN'],
      default: 'PENDING',
    },
    isDemoOffer: { type: Boolean, default: false },
  },
  { timestamps: true }
);

RecoveryOfferSchema.index({ repairCaseId: 1 });
RecoveryOfferSchema.index({ partnerId: 1 });

export const RecoveryOffer = model<IRecoveryOffer>('RecoveryOffer', RecoveryOfferSchema);
