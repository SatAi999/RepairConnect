import { Schema, model, Document } from 'mongoose';

export interface IKnowledgeService {
  name: string;
  estimatedMin: number;
  estimatedMax: number;
}

export interface ITypicalCause {
  cause: string;
  probability: number;
}

export interface IRepairKnowledge extends Document {
  category: string; // e.g. Laptop, Smartphone, Bicycle, Appliance
  services: IKnowledgeService[];
  replacementMin: number;
  replacementMax: number;
  safetyWarnings: string[];
  typicalCauses: ITypicalCause[];
  weight: number; // in kg (sustainability metric)
  co2Avoided: number; // in kg CO2 (sustainability metric)
  createdAt: Date;
  updatedAt: Date;
}

const RepairKnowledgeSchema = new Schema<IRepairKnowledge>(
  {
    category: { type: String, required: true, unique: true },
    services: [
      {
        name: { type: String, required: true },
        estimatedMin: { type: Number, required: true },
        estimatedMax: { type: Number, required: true },
      },
    ],
    replacementMin: { type: Number, required: true },
    replacementMax: { type: Number, required: true },
    safetyWarnings: [{ type: String }],
    typicalCauses: [
      {
        cause: { type: String, required: true },
        probability: { type: Number, required: true }, // e.g., 0.8
      },
    ],
    weight: { type: Number, default: 0 },
    co2Avoided: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const RepairKnowledge = model<IRepairKnowledge>('RepairKnowledge', RepairKnowledgeSchema);
