import { Schema, model, Document, Types } from 'mongoose';

export interface IMaterialRate extends Document {
  material: string;
  category: string;
  ratePerKg: number;
  currency: string;
  location: string;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  sourceType: 'DEMO' | 'MARKET' | 'PARTNER';
  sourceReference?: string;
  isDemoData: boolean;
  createdAt: Date;
}

const MaterialRateSchema = new Schema<IMaterialRate>(
  {
    material: { type: String, required: true },
    category: { type: String, required: true },
    ratePerKg: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    location: { type: String, default: 'Bangalore, India' },
    effectiveFrom: { type: Date, default: Date.now },
    effectiveUntil: { type: Date },
    sourceType: { type: String, enum: ['DEMO', 'MARKET', 'PARTNER'], default: 'DEMO' },
    sourceReference: { type: String },
    isDemoData: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const MaterialRate = model<IMaterialRate>('MaterialRate', MaterialRateSchema);
