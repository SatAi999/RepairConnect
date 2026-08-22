import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Unhandled Error:', err);

  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'SERVER_ERROR';

  return res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: err.message || 'An internal server error occurred.',
    },
  });
};
