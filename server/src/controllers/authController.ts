import { Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { RepairerProfile } from '../models/RepairerProfile';
import { AuthRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_hackathon_demo';

const signToken = (id: string): string => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
};

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role, phone, location } = req.body;

    // Validate inputs
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name, email, and password are required.' },
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters long.' },
      });
    }

    // Check email uniqueness
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_EMAIL', message: 'Email address already registered.' },
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create User
    const newUser = await User.create({
      name,
      email,
      passwordHash,
      role: role || 'CUSTOMER',
      phone,
      location: location || { type: 'Point', coordinates: [77.5946, 12.9716] }, // Default coords (e.g. Bangalore)
    });

    // If role is REPAIRER, create corresponding profile
    if (newUser.role === 'REPAIRER') {
      await RepairerProfile.create({
        userId: newUser._id,
        businessName: `${newUser.name}'s Repair Shop`,
        description: 'Provide quality repair services.',
        categories: ['Laptop', 'Smartphone'],
        services: ['General Diagnostics', 'Hardware Repairs'],
        location: newUser.location || { type: 'Point', coordinates: [77.5946, 12.9716] },
        serviceRadius: 10,
        verificationStatus: 'PENDING',
        rating: 4.5, // Seed with default rating
        reviewCount: 0,
        estimatedPriceRange: { min: 500, max: 2000 },
        availability: 'Mon-Sat 9AM-6PM',
      });
    }

    const token = signToken(newUser._id.toString());

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          phone: newUser.phone,
          location: newUser.location,
        },
      },
    });
  } catch (error: any) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An internal server error occurred during registration.' },
    });
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required.' },
      });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
      });
    }

    const token = signToken(user._id.toString());

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          location: user.location,
        },
      },
    });
  } catch (error: any) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An internal server error occurred during login.' },
    });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Not logged in.' },
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      phone: req.user.phone,
      location: req.user.location,
    },
  });
};

export const updateMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not logged in.' },
      });
    }

    const { name, phone, location } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found.' },
      });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (location) user.location = location;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
      },
    });
  } catch (error: any) {
    console.error('Update Profile Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An error occurred while updating profile.' },
    });
  }
};
