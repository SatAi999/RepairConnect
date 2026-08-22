import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'CUSTOMER' | 'REPAIRER' | 'ADMIN' | 'RECOVERY_PARTNER';
  phone?: string;
  avatar?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  comparePassword(password: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['CUSTOMER', 'REPAIRER', 'ADMIN', 'RECOVERY_PARTNER'], default: 'CUSTOMER' },
    phone: { type: String },
    avatar: { type: String },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
  },
  { timestamps: true }
);

// Geo-spatial index for user location queries
UserSchema.index({ location: '2dsphere' });

// Compare passwords
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

export const User = model<IUser>('User', UserSchema);
