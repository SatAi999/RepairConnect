import { Schema, model, Document, Types } from 'mongoose';

export interface IRepairStatusHistory extends Document {
  repairRequestId: Types.ObjectId;
  status: string;
  note?: string;
  changedBy: Types.ObjectId; // References User
  createdAt: Date;
}

const RepairStatusHistorySchema = new Schema<IRepairStatusHistory>(
  {
    repairRequestId: { type: Schema.Types.ObjectId, ref: 'RepairRequest', required: true },
    status: { type: String, required: true },
    note: { type: String },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

RepairStatusHistorySchema.index({ repairRequestId: 1 });

export const RepairStatusHistory = model<IRepairStatusHistory>('RepairStatusHistory', RepairStatusHistorySchema);
