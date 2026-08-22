import { Response } from 'express';
import { Review } from '../models/Review';
import { RepairRequest } from '../models/RepairRequest';
import { RepairerProfile } from '../models/RepairerProfile';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';

export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id: repairerId } = req.params; // Repairer Profile ID
    const { repairRequestId, rating, comment } = req.body;
    const userId = req.user!._id;

    if (!repairRequestId || !rating) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Repair request ID and rating are required.' },
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Rating must be an integer between 1 and 5.' },
      });
    }

    // Verify request exists and is completed
    const request = await RepairRequest.findById(repairRequestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Repair request not found.' },
      });
    }

    if (request.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'You can only review a repair once it has been completed.',
        },
      });
    }

    if (request.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized to review this request.' },
      });
    }

    // Prevent duplicate reviews for the same request
    const existingReview = await Review.findOne({ repairRequestId });
    if (existingReview) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_REVIEW',
          message: 'You have already submitted a review for this service request.',
        },
      });
    }

    // Create Review
    const review = await Review.create({
      repairRequestId,
      userId,
      repairerId,
      rating,
      comment,
    });

    // Recalculate repairer profile averages
    const reviews = await Review.find({ repairerId });
    const count = reviews.length;
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / count;

    await RepairerProfile.findByIdAndUpdate(repairerId, {
      rating: parseFloat(avg.toFixed(1)),
      reviewCount: count,
    });

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully.',
      data: review,
    });
  } catch (error: any) {
    console.error('Create Review Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to submit review.' },
    });
  }
};

export const getRepairerReviews = async (req: AuthRequest, res: Response) => {
  try {
    const { id: repairerId } = req.params;

    const reviews = await Review.find({ repairerId })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error: any) {
    console.error('Get Reviews Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve reviews.' },
    });
  }
};
