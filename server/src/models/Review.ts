import { Schema, model, Document, Types } from 'mongoose';

export interface IReview extends Document {
  repairRequestId: Types.ObjectId;
  userId: Types.ObjectId; // Customer ID
  repairerId: Types.ObjectId; // Repairer Profile ID
  rating: number; // 1-5
  comment?: string;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    repairRequestId: { type: Schema.Types.ObjectId, ref: 'RepairRequest', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    repairerId: { type: Schema.Types.ObjectId, ref: 'RepairerProfile', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
  },
  { timestamps: true }
);

ReviewSchema.index({ repairerId: 1 });

export const Review = model<IReview>('Review', ReviewSchema);
