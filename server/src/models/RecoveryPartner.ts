import { Schema, model, Document, Types } from 'mongoose';

export type PartnerType = 'RECYCLER' | 'REFURBISHER' | 'DISMANTLER' | 'SCRAP_BUYER' | 'RECOVERY_PARTNER';
export type PartnerVerification = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'SUSPENDED';

export interface IRecoveryPartner extends Document {
  userId: Types.ObjectId;
  businessName: string;
  partnerType: PartnerType;
  verificationStatus: PartnerVerification;
  location: { type: 'Point'; coordinates: [number, number] };
  serviceRadius: number;
  serviceCategories: string[];
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  isDemoData: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RecoveryPartnerSchema = new Schema<IRecoveryPartner>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    businessName: { type: String, required: true, trim: true },
    partnerType: {
      type: String,
      enum: ['RECYCLER', 'REFURBISHER', 'DISMANTLER', 'SCRAP_BUYER', 'RECOVERY_PARTNER'],
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'SUSPENDED'],
      default: 'PENDING',
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [77.5946, 12.9716] },
    },
    serviceRadius: { type: Number, default: 50 },
    serviceCategories: [{ type: String }],
    description: { type: String },
    contactEmail: { type: String },
    contactPhone: { type: String },
    isDemoData: { type: Boolean, default: false },
  },
  { timestamps: true }
);

RecoveryPartnerSchema.index({ location: '2dsphere' });
RecoveryPartnerSchema.index({ verificationStatus: 1 });

export const RecoveryPartner = model<IRecoveryPartner>('RecoveryPartner', RecoveryPartnerSchema);
