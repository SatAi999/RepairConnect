import { Schema, model, Document, Types } from 'mongoose';

export interface INotification extends Document {
  userId: Types.ObjectId;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  isRead: boolean;
  link?: string; // Target path to navigate on click
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'success', 'warning'], default: 'info' },
    isRead: { type: Boolean, default: false },
    link: { type: String },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, isRead: 1 });

export const Notification = model<INotification>('Notification', NotificationSchema);
