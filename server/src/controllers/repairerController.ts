import { Response } from 'express';
import { RepairerProfile } from '../models/RepairerProfile';
import { RepairRequest } from '../models/RepairRequest';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';

export const getRepairers = async (req: AuthRequest, res: Response) => {
  try {
    const { lat, lng, radius, category, search, page = '1', limit = '100' } = req.query; // Default limit 100 to support all

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {
      verificationStatus: { $ne: 'SUSPENDED' }, // Hide suspended accounts
    };

    // Geospatial search: filter within radius
    if (lat && lng) {
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      const radiusKm = parseFloat(radius as string) || 10; // Default 10km
      
      // 6378.1 is the Earth's radius in kilometers
      const radiusInRadians = radiusKm / 6378.1;

      filter.location = {
        $geoWithin: {
          $centerSphere: [[longitude, latitude], radiusInRadians],
        },
      };
    }

    // Category filter
    if (category && category !== 'all') {
      filter.categories = category;
    }

    // Search query filter (regex on businessName or description)
    if (search) {
      filter.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const repairers = await RepairerProfile.find(filter)
      .populate('userId', 'name email phone avatar')
      .skip(skip)
      .limit(limitNum)
      .sort({ rating: -1, reviewCount: -1 });

    // Dynamically query active requests count for each shop to establish turn-around transparency
    const docs = await Promise.all(
      repairers.map(async (r) => {
        const activeRequestsCount = await RepairRequest.countDocuments({
          repairerId: r._id,
          status: { $in: ['REQUESTED', 'ACCEPTED', 'DIAGNOSIS', 'ESTIMATE_PROVIDED', 'APPROVED', 'REPAIR_IN_PROGRESS', 'READY_FOR_PICKUP'] }
        });
        return {
          ...r.toObject(),
          activeRequestsCount
        };
      })
    );

    const total = await RepairerProfile.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: {
        docs,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get Repairers Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve repairers.' },
    });
  }
};

export const getRepairerById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid repairer profile ID.' },
      });
    }

    const repairer = await RepairerProfile.findById(id).populate('userId', 'name email phone avatar');
    if (!repairer) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Repairer profile not found.' },
      });
    }

    return res.status(200).json({
      success: true,
      data: repairer,
    });
  } catch (error: any) {
    console.error('Get Repairer By ID Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve repairer details.' },
    });
  }
};

export const getMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const profile = await RepairerProfile.findOne({ userId }).populate('userId', 'name email phone avatar');

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Repairer profile not found for this user.' },
      });
    }

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    console.error('Get My Repairer Profile Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve your profile.' },
    });
  }
};

export const updateMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { businessName, description, categories, services, location, serviceRadius, estimatedPriceRange, availability } = req.body;

    const profile = await RepairerProfile.findOne({ userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Repairer profile not found.' },
      });
    }

    if (businessName) profile.businessName = businessName;
    if (description) profile.description = description;
    if (categories) profile.categories = categories;
    if (services) profile.services = services;
    if (location) {
      profile.location = location;
      // Keep User location synchronized
      await User.findByIdAndUpdate(userId, { location });
    }
    if (serviceRadius !== undefined) profile.serviceRadius = serviceRadius;
    if (estimatedPriceRange) profile.estimatedPriceRange = estimatedPriceRange;
    if (availability) profile.availability = availability;

    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Repairer profile updated successfully',
      data: profile,
    });
  } catch (error: any) {
    console.error('Update Repairer Profile Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update repairer profile.' },
    });
  }
};
