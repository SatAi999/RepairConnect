import { Response } from 'express';
import { RepairRequest, RepairRequestStatus } from '../models/RepairRequest';
import { RepairCase } from '../models/RepairCase';
import { RepairerProfile } from '../models/RepairerProfile';
import { RepairStatusHistory } from '../models/RepairStatusHistory';
import { Notification } from '../models/Notification';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';

// Map of valid transitions
const VALID_TRANSITIONS: Record<RepairRequestStatus, RepairRequestStatus[]> = {
  REQUESTED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['DIAGNOSIS', 'CANCELLED'],
  DIAGNOSIS: ['ESTIMATE_PROVIDED', 'CANCELLED'],
  ESTIMATE_PROVIDED: ['APPROVED', 'CANCELLED'],
  APPROVED: ['REPAIR_IN_PROGRESS', 'CANCELLED'],
  REPAIR_IN_PROGRESS: ['READY_FOR_PICKUP', 'CANCELLED'],
  READY_FOR_PICKUP: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

const isValidTransition = (from: RepairRequestStatus, to: RepairRequestStatus): boolean => {
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
};

export const createRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { repairCaseId, repairerId, customerDescription, scheduledDate } = req.body;
    const userId = req.user!._id;

    if (!repairCaseId || !repairerId || !scheduledDate) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Repair case ID, repairer ID, and scheduled date are required.' },
      });
    }

    // Verify repair case exists and belongs to user
    const repairCase = await RepairCase.findById(repairCaseId);
    if (!repairCase) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Repair case not found.' },
      });
    }

    if (repairCase.userId.toString() !== userId.toString() && req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not own this repair case.' },
      });
    }

    // Verify repairer exists
    const repairer = await RepairerProfile.findById(repairerId);
    if (!repairer) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Repairer profile not found.' },
      });
    }

    // Prevent duplicates
    const activeRequest = await RepairRequest.findOne({
      repairCaseId,
      repairerId,
      status: { $nin: ['CANCELLED', 'REJECTED'] },
    });

    if (activeRequest) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_REQUEST',
          message: 'An active service request already exists for this item with the selected repairer.',
        },
      });
    }

    // Create Request
    const request = await RepairRequest.create({
      repairCaseId,
      userId,
      repairerId,
      customerDescription,
      scheduledDate,
      status: 'REQUESTED',
    });

    // Create status history log
    await RepairStatusHistory.create({
      repairRequestId: request._id,
      status: 'REQUESTED',
      note: 'Repair request submitted by customer.',
      changedBy: userId,
    });

    // Update RepairCase status
    repairCase.status = 'REQUESTED';
    await repairCase.save();

    // Notify repairer (needs to fetch repairer user ID)
    await Notification.create({
      userId: repairer.userId,
      title: 'New Service Request',
      message: `You received a new repair request for a ${repairCase.itemName}.`,
      type: 'info',
      link: `/repairer/requests/${request._id}`,
    });

    return res.status(201).json({
      success: true,
      message: 'Repair request submitted successfully.',
      data: request,
    });
  } catch (error: any) {
    console.error('Create Request Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create repair request.' },
    });
  }
};

export const getRequests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const role = req.user!.role;
    let query: any = {};

    if (role === 'CUSTOMER') {
      query.userId = userId;
    } else if (role === 'REPAIRER') {
      // Find repairer profile linked to this user
      const profile = await RepairerProfile.findOne({ userId });
      if (!profile) {
        return res.status(200).json({ success: true, data: [] });
      }
      query.repairerId = profile._id;
    }

    const requests = await RepairRequest.find(query)
      .populate('repairCaseId')
      .populate('userId', 'name email phone')
      .populate('repairerId')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error: any) {
    console.error('Get Requests Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve repair requests.' },
    });
  }
};

export const getRequestById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid repair request ID.' },
      });
    }

    const request = await RepairRequest.findById(id)
      .populate({
        path: 'repairCaseId',
        populate: [{ path: 'diagnosisId' }, { path: 'estimateId' }]
      })
      .populate('userId', 'name email phone avatar')
      .populate('repairerId');

    if (!request) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Repair request not found.' },
      });
    }

    // Permission check
    const isCustomerOwner = request.userId._id.toString() === userId.toString();
    const repairerProfile = request.repairerId as any;
    const isRepairerOwner = repairerProfile && repairerProfile.userId.toString() === userId.toString();
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isCustomerOwner && !isRepairerOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized to view this request.' },
      });
    }

    // Fetch status history timeline
    const history = await RepairStatusHistory.find({ repairRequestId: request._id })
      .populate('changedBy', 'name role')
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: {
        request,
        history,
      },
    });
  } catch (error: any) {
    console.error('Get Request By ID Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve request details.' },
    });
  }
};

export const updateRequestStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, note, quotedAmount, repairerNotes } = req.body;
    const userId = req.user!._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request ID.' },
      });
    }

    const request = await RepairRequest.findById(id).populate('repairerId');
    if (!request) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Repair request not found.' },
      });
    }

    // Permission check
    const isCustomer = request.userId.toString() === userId.toString();
    const repairerProfile = request.repairerId as any;
    const isRepairer = repairerProfile && repairerProfile.userId.toString() === userId.toString();
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isCustomer && !isRepairer && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized to edit this request.' },
      });
    }

    // Verify valid status transition
    if (status) {
      const fromStatus = request.status;
      const toStatus = status as RepairRequestStatus;

      // Customers can only transition to CANCELLED or APPROVED (if estimate provided)
      if (isCustomer && !isRepairer && !isAdmin) {
        if (toStatus !== 'CANCELLED' && (fromStatus !== 'ESTIMATE_PROVIDED' || toStatus !== 'APPROVED')) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'As a customer, you can only cancel requests or approve provided estimates.',
            },
          });
        }
      }

      // Repairers cannot transition to CANCELLED (they must Reject early on)
      if (isRepairer && !isCustomer && !isAdmin) {
        if (toStatus === 'CANCELLED') {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Technicians cannot cancel requests. Please select Reject or contact the customer.',
            },
          });
        }
      }

      if (!isValidTransition(fromStatus, toStatus)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TRANSITION',
            message: `Cannot transition repair request status from ${fromStatus} to ${toStatus}.`,
          },
        });
      }

      request.status = toStatus;
      
      // Update associated RepairCase status as well
      const repairCase = await RepairCase.findById(request.repairCaseId);
      if (repairCase) {
        if (toStatus === 'COMPLETED') repairCase.status = 'COMPLETED';
        else if (toStatus === 'REPAIR_IN_PROGRESS') repairCase.status = 'IN_REPAIR';
        await repairCase.save();
      }

      // Log to history
      await RepairStatusHistory.create({
        repairRequestId: request._id,
        status: toStatus,
        note: note || `Status updated to ${toStatus} by ${req.user!.role.toLowerCase()}`,
        changedBy: userId,
      });

      // Send Notification to recipient
      const notifyTarget = isCustomer ? repairerProfile.userId : request.userId;
      await Notification.create({
        userId: notifyTarget,
        title: 'Repair Status Updated',
        message: `Your service request for item is now: ${toStatus}.`,
        type: toStatus === 'COMPLETED' ? 'success' : 'info',
        link: isCustomer ? `/repairer/requests/${request._id}` : `/cases/${request.repairCaseId}`,
      });
    }

    if (quotedAmount !== undefined) request.quotedAmount = quotedAmount;
    if (repairerNotes !== undefined) request.repairerNotes = repairerNotes;

    await request.save();

    return res.status(200).json({
      success: true,
      message: 'Repair request updated successfully.',
      data: request,
    });
  } catch (error: any) {
    console.error('Update Request Status Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update repair request.' },
    });
  }
};
