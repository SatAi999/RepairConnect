import { Schema, model, Document, Types } from 'mongoose';

export interface IRepairerProfile extends Document {
  userId: Types.ObjectId;
  businessName: string;
  description: string;
  categories: string[]; // e.g. ['Laptop', 'Smartphone', 'Bicycle']
  services: string[]; // specific services offered
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  serviceRadius: number; // in kilometers
  verificationStatus: 'PENDING' | 'VERIFIED' | 'SUSPENDED';
  rating: number;
  reviewCount: number;
  estimatedPriceRange: {
    min: number;
    max: number;
  };
  availability: string; // e.g., "Mon-Fri 9AM-5PM", "24/7"
  createdAt: Date;
  updatedAt: Date;
}

const RepairerProfileSchema = new Schema<IRepairerProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    categories: [{ type: String, required: true }],
    services: [{ type: String }],
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    serviceRadius: { type: Number, default: 10 }, // Default 10km
    verificationStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'SUSPENDED'], default: 'PENDING' },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    estimatedPriceRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
    },
    availability: { type: String, default: 'Flexible' },
  },
  { timestamps: true }
);

// Geo-spatial index for discovery queries
RepairerProfileSchema.index({ location: '2dsphere' });
RepairerProfileSchema.index({ categories: 1 });
RepairerProfileSchema.index({ rating: -1 });

export const RepairerProfile = model<IRepairerProfile>('RepairerProfile', RepairerProfileSchema);
