import { Response } from 'express';
import { Notification } from '../models/Notification';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(30);

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error: any) {
    console.error('Get Notifications Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve notifications.' },
    });
  }
};

export const markRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid notification ID.' },
      });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found.' },
      });
    }

    return res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error: any) {
    console.error('Mark Notification Read Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update notification status.' },
    });
  }
};
