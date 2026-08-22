import { Schema, model, Types } from 'mongoose';

export type PassportEventType =
  | 'REGISTERED' | 'DIAGNOSED' | 'REPAIR_ATTEMPT' | 'REPAIRED'
  | 'BEYOND_REPAIR_CONFIRMED' | 'RECOVERY_STARTED' | 'COMPONENT_RECOVERED'
  | 'RECYCLING_STARTED' | 'RECOVERY_COMPLETED' | 'CERTIFICATE_ISSUED';

export interface IPassportEvent {
  type: PassportEventType;
  date: Date;
  description: string;
  actor?: string;
  actorId?: Types.ObjectId;
  evidence?: string[];
  metadata?: Record<string, any>;
}

export interface IProductPassport {
  _id?: Types.ObjectId;
  repairCaseId: Types.ObjectId;
  userId: Types.ObjectId;
  productName: string;
  category: string;
  brand?: string;
  model?: string;
  events: IPassportEvent[];
  currentStatus: string;
  recoveryCompleted: boolean;
  certificateUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductPassportSchema = new Schema<IProductPassport>(
  {
    repairCaseId: { type: Schema.Types.ObjectId, ref: 'RepairCase', required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    productName: { type: String, required: true },
    category: { type: String, required: true },
    brand: { type: String },
    model: { type: String },
    events: [
      {
        type: { type: String, required: true },
        date: { type: Date, default: Date.now },
        description: { type: String, required: true },
        actor: { type: String },
        actorId: { type: Schema.Types.ObjectId, ref: 'User' },
        evidence: [{ type: String }],
        metadata: { type: Schema.Types.Mixed },
      },
    ],
    currentStatus: { type: String, default: 'Active' },
    recoveryCompleted: { type: Boolean, default: false },
    certificateUrl: { type: String },
  },
  { timestamps: true }
);

ProductPassportSchema.index({ repairCaseId: 1 });
ProductPassportSchema.index({ userId: 1 });

export const ProductPassport = model<IProductPassport>('ProductPassport', ProductPassportSchema);
