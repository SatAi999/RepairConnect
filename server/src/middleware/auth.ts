import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_hackathon_demo';

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Not authorized to access this route, token missing.',
      },
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User belonging to this token no longer exists.',
        },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Not authorized, token invalid or expired.',
      },
    });
  }
};

export const restrictTo = (...roles: Array<'CUSTOMER' | 'REPAIRER' | 'ADMIN' | 'RECOVERY_PARTNER'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to perform this action.',
        },
      });
    }
    next();
  };
};
